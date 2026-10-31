package presence

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func worker(online, rooms int) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/presence" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(Data{online, rooms, time.Now().UTC().Format(time.RFC3339Nano), "server"})
	}))
}

func TestCollectAuthoritativeCountsAndDeduplicateWorkers(t *testing.T) {
	a, b := worker(3, 1), worker(5, 2)
	defer a.Close()
	defer b.Close()
	online, rooms, err := Collect(context.Background(), []string{a.URL, b.URL, a.URL})
	if err != nil || online != 8 || rooms != 3 {
		t.Fatalf("%d %d %v", online, rooms, err)
	}
}

func TestCollectNeverReportsPartialOrInventedZero(t *testing.T) {
	a := worker(3, 1)
	defer a.Close()
	for _, raw := range []string{`{}`, `{"online":-1,"rooms":0}`, `{"online":0,"rooms":0,"scope":"server","updatedAt":"invalid"}`} {
		bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(raw)) }))
		_, _, err := Collect(context.Background(), []string{a.URL, bad.URL})
		bad.Close()
		if err == nil {
			t.Fatalf("accepted invalid data: %s", raw)
		}
	}
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Error(w, "warming", 503) }))
	defer bad.Close()
	if _, _, err := Collect(context.Background(), []string{a.URL, bad.URL}); err == nil {
		t.Fatal("reported partial total")
	}
}

func TestHandlerCORSCacheAndMethod(t *testing.T) {
	h := Handler(map[string]bool{"https://game.test": true}, "server", func(context.Context) (int, int, error) { return 0, 0, nil })
	for _, tc := range []struct {
		method, origin string
		status         int
	}{
		{"GET", "https://game.test", 200}, {"GET", "https://evil.test", 403}, {"POST", "https://game.test", 405},
	} {
		req := httptest.NewRequest(tc.method, "/presence", nil)
		req.Header.Set("Origin", tc.origin)
		res := httptest.NewRecorder()
		h(res, req)
		if res.Code != tc.status {
			t.Fatalf("%+v: %d", tc, res.Code)
		}
		if res.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("presence may be cached")
		}
		if tc.status == 200 && res.Header().Get("Access-Control-Allow-Origin") != tc.origin {
			t.Fatal("missing CORS")
		}
	}
}
