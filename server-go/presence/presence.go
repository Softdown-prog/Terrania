// Package presence exposes aggregate counts only, never player identifiers.
package presence

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"
)

type Data struct {
	Online    int    `json:"online"`
	Rooms     int    `json:"rooms"`
	UpdatedAt string `json:"updatedAt"`
	Scope     string `json:"scope"`
}

func Handler(allowed map[string]bool, scope string, count func(context.Context) (int, int, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Vary", "Origin")
		origin := r.Header.Get("Origin")
		if origin != "" && !allowed[origin] {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		online, rooms, err := count(r.Context())
		if err != nil {
			http.Error(w, "presence unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Data{online, rooms, time.Now().UTC().Format(time.RFC3339Nano), scope})
	}
}

// Sum authoritative worker registries. The gateway's seat reservations include
// pending/rejected upgrades and therefore must not be used as online players.
func Collect(ctx context.Context, workers []string) (int, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	type result struct {
		data Data
		err  error
	}
	results := make(chan result, len(workers))
	seen := make(map[string]bool)
	client := &http.Client{Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	for _, worker := range workers {
		if seen[worker] {
			continue
		}
		seen[worker] = true
		go func(base string) {
			var out result
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/presence", nil)
			if err != nil {
				out.err = err
				results <- out
				return
			}
			res, err := client.Do(req)
			if err != nil {
				out.err = err
				results <- out
				return
			}
			defer func() { _ = res.Body.Close() }()
			if res.StatusCode != http.StatusOK {
				out.err = errors.New("worker unavailable")
				results <- out
				return
			}
			var wire struct {
				Online    *int   `json:"online"`
				Rooms     *int   `json:"rooms"`
				UpdatedAt string `json:"updatedAt"`
				Scope     string `json:"scope"`
			}
			out.err = json.NewDecoder(io.LimitReader(res.Body, 2048)).Decode(&wire)
			if out.err == nil && (wire.Online == nil || wire.Rooms == nil) {
				out.err = errors.New("missing worker counts")
			}
			if out.err == nil {
				out.data = Data{*wire.Online, *wire.Rooms, wire.UpdatedAt, wire.Scope}
			}
			stamp, stampErr := time.Parse(time.RFC3339Nano, out.data.UpdatedAt)
			if out.err == nil && (out.data.Online < 0 || out.data.Rooms < 0 || out.data.Scope != "server" ||
				stampErr != nil || time.Since(stamp) > 15*time.Second || time.Until(stamp) > time.Minute) {
				out.err = errors.New("invalid worker presence")
			}
			results <- out
		}(worker)
	}
	if len(seen) == 0 {
		return 0, 0, errors.New("no workers")
	}
	online, rooms := 0, 0
	for range seen {
		select {
		case out := <-results:
			if out.err != nil {
				return 0, 0, out.err
			}
			online += out.data.Online
			rooms += out.data.Rooms
		case <-ctx.Done():
			return 0, 0, ctx.Err()
		}
	}
	return online, rooms, nil
}
