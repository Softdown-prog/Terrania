package cluster

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var ErrRegistryIPCConfig = errors.New("invalid private registry IPC configuration")
var ErrRegistryIPCUnavailable = errors.New("private registry IPC unavailable")

const registryIPCBase = "http://terrania-unix/v1/"

// NewRegistryIPCHandler is an explicit opt-in admin handler for a PRIVATE Unix
// listener only. NEVER mount it on the gateway's public TCP HTTP mux.
// Both the protected socket and bearer credential are required.
func NewRegistryIPCHandler(registry *WorkerRegistry, token string) (http.Handler, error) {
	if registry == nil || !validRegistryIPCToken(token) {
		return nil, ErrRegistryIPCConfig
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/workers", func(w http.ResponseWriter, r *http.Request) {
		if !registryIPCAuthorized(w, r, token) {
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(registry.Snapshot())
	})
	for _, op := range []string{"register", "ready", "drain", "remove"} {
		op := op
		mux.HandleFunc("/v1/"+op, func(w http.ResponseWriter, r *http.Request) {
			if !registryIPCAuthorized(w, r, token) {
				return
			}
			if r.Method != http.MethodPost {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			var input struct {
				ID  string `json:"id"`
				URL string `json:"url,omitempty"`
			}
			d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
			d.DisallowUnknownFields()
			if err := d.Decode(&input); err != nil {
				http.Error(w, "invalid request", http.StatusBadRequest)
				return
			}
			if err := d.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
				http.Error(w, "unexpected request content", http.StatusBadRequest)
				return
			}
			if input.ID == "" || len(input.ID) > 32 {
				http.Error(w, "invalid worker ID", http.StatusBadRequest)
				return
			}
			var err error
			switch op {
			case "register":
				var backend Backend
				backend, err = ipcValidateBackend(input.ID, input.URL)
				if err == nil {
					err = registry.Register(backend)
				}
			case "ready":
				if input.URL != "" {
					err = ErrRegistryIPCConfig
				} else {
					err = registry.SetReady(input.ID, true)
				}
			case "drain":
				if input.URL != "" {
					err = ErrRegistryIPCConfig
				} else {
					err = registry.Drain(input.ID)
				}
			case "remove":
				if input.URL != "" {
					err = ErrRegistryIPCConfig
				} else {
					err = registry.Remove(input.ID)
				}
			}
			if err != nil {
				// No internal URLs, container IDs or state leakage to clients.
				http.Error(w, "registry operation rejected", http.StatusConflict)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	}
	return mux, nil
}

func validRegistryIPCToken(s string) bool {
	return len(s) >= 32 && len(s) <= 256 && !strings.ContainsAny(s, " \t\r\n")
}
func registryIPCAuthorized(w http.ResponseWriter, r *http.Request, token string) bool {
	got := r.Header.Get("Authorization")
	expected := "Bearer " + token
	if subtle.ConstantTimeCompare([]byte(got), []byte(expected)) != 1 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

func ipcValidateBackend(id, raw string) (Backend, error) {
	u, err := url.Parse(raw)
	if err != nil || u == nil || u.Scheme != "http" || u.User != nil || u.RawQuery != "" || u.Fragment != "" ||
		u.Path != "" || u.Opaque != "" || u.Host == "" {
		return Backend{}, ErrRegistryIPCConfig
	}
	host, port, err := net.SplitHostPort(u.Host)
	if err != nil || port != "8788" {
		return Backend{}, ErrRegistryIPCConfig
	}
	ip := net.ParseIP(host)
	if ip == nil || !(ip.IsPrivate() || ip.IsLoopback()) {
		return Backend{}, ErrRegistryIPCConfig
	}
	r, err := NewRouter(id + "=" + raw)
	if err != nil {
		return Backend{}, err
	}
	return r.Backends()[0], nil
}

// ListenRegistryIPC refuses an existing path, symlink, world-accessible
// directory, nonabsolute path or network listener. Service owners MUST create
// a dedicated 0700 parent directory and manage its lifecycle separately.
func ListenRegistryIPC(path string) (net.Listener, error) {
	if !filepath.IsAbs(path) || filepath.Base(path) == "." {
		return nil, ErrRegistryIPCConfig
	}
	parent := filepath.Dir(path)
	info, err := os.Lstat(parent)
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 || info.Mode().Perm() != 0700 {
		return nil, ErrRegistryIPCConfig
	}
	if _, err := os.Lstat(path); err == nil {
		return nil, ErrRegistryIPCConfig
	} else if !os.IsNotExist(err) {
		return nil, err
	}
	l, err := net.Listen("unix", path)
	if err != nil {
		return nil, err
	}
	if err := os.Chmod(path, 0600); err != nil {
		_ = l.Close()
		return nil, err
	}
	return l, nil
}

// RegistryIPCClient intentionally does NOT implement WorkerDirectory:
// that interface cannot propagate snapshot errors. No controller integration
// may fail open when a Unix socket is unreachable.
type RegistryIPCClient struct {
	client *http.Client
	token  string
}

func NewRegistryIPCClient(path, token string) (*RegistryIPCClient, error) {
	if !filepath.IsAbs(path) || !validRegistryIPCToken(token) {
		return nil, ErrRegistryIPCConfig
	}
	tr := &http.Transport{DisableKeepAlives: true, DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{Timeout: 2 * time.Second}).DialContext(ctx, "unix", path)
	}}
	return &RegistryIPCClient{client: &http.Client{Transport: tr, Timeout: 5 * time.Second}, token: token}, nil
}

func (c *RegistryIPCClient) request(ctx context.Context, op, method string, body any, output any) error {
	if c == nil || c.client == nil {
		return ErrRegistryIPCConfig
	}
	var payload io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, registryIPCBase+op, payload)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrRegistryIPCUnavailable, err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("%w: HTTP %d", ErrRegistryIPCUnavailable, res.StatusCode)
	}
	if output != nil {
		return json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(output)
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 1024))
	return nil
}
func (c *RegistryIPCClient) Snapshot(ctx context.Context) ([]WorkerStatus, error) {
	var s []WorkerStatus
	err := c.request(ctx, "workers", http.MethodGet, nil, &s)
	return s, err
}
func (c *RegistryIPCClient) Register(ctx context.Context, backend Backend) error {
	if backend.URL == nil {
		return ErrRegistryIPCConfig
	}
	return c.request(ctx, "register", http.MethodPost, map[string]string{"id": backend.ID, "url": backend.URL.String()}, nil)
}
func (c *RegistryIPCClient) SetReady(ctx context.Context, id string) error {
	return c.request(ctx, "ready", http.MethodPost, map[string]string{"id": id}, nil)
}
func (c *RegistryIPCClient) Drain(ctx context.Context, id string) error {
	return c.request(ctx, "drain", http.MethodPost, map[string]string{"id": id}, nil)
}
func (c *RegistryIPCClient) Remove(ctx context.Context, id string) error {
	return c.request(ctx, "remove", http.MethodPost, map[string]string{"id": id}, nil)
}
