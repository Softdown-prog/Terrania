package autoscale

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePending struct {
	value int
	err   error
}

func (p *fakePending) Pending(context.Context) (int, error) { return p.value, p.err }

func sampleConfig() LinuxHostConfig {
	return LinuxHostConfig{
		CPUCapacityMilli:  4000,
		CPUReserveMilli:   1500,
		MemoryReserveMiB:  1024,
		MaxFreeCPUMilli:   2000,
		MaxFreeMemoryMiB:  1500,
		MinSampleInterval: time.Second,
	}
}

func TestLinuxHostObserverProtectsOtherVPSProjects(t *testing.T) {
	now := when()
	var mu sync.Mutex
	readIndex := 0
	queued := &fakePending{value: 90}
	read := func(path string) ([]byte, error) {
		mu.Lock()
		defer mu.Unlock()
		switch path {
		case "/proc/stat":
			readIndex++
			if readIndex == 1 {
				return []byte("cpu 100 0 100 500 0 0 0 0\n"), nil
			}
			return []byte("cpu 200 0 100 700 0 0 0 0\n"), nil
		case "/proc/meminfo":
			return []byte("MemTotal: 4194304 kB\nMemAvailable: 3145728 kB\n"), nil
		default:
			t.Fatalf("unexpected file read: %s", path)
			return nil, nil
		}
	}
	clock := func() time.Time { return now }
	observer, err := NewLinuxHostObserver(sampleConfig(), queued, read, clock)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := observer.Read(context.Background()); !errors.Is(err, ErrHostWarmup) {
		t.Fatalf("first CPU reading should warm up: %v", err)
	}
	now = now.Add(2 * time.Second)
	out, err := observer.Read(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	// 200 idle / 300 total * 4000 millicores - 1500 reserved ~= 1166.
	if out.FreeCPUMilli < 1166 || out.FreeCPUMilli > 1167 || out.FreeMemoryMiB != 1500 || out.Queued != 90 || !out.SampledAt.Equal(now) {
		t.Fatalf("unsafe host resource budget: %+v", out)
	}
}

func TestLinuxHostObserverRefusesInvalidAndMissingTelemetry(t *testing.T) {
	for _, bad := range []LinuxHostConfig{
		{}, {CPUCapacityMilli: 4000, CPUReserveMilli: 4000, MemoryReserveMiB: 1024, MaxFreeCPUMilli: 2000, MaxFreeMemoryMiB: 1500, MinSampleInterval: time.Second},
		{CPUCapacityMilli: 4000, CPUReserveMilli: 0, MemoryReserveMiB: 0, MaxFreeCPUMilli: 2000, MaxFreeMemoryMiB: 1500, MinSampleInterval: time.Second},
	} {
		if _, err := NewLinuxHostObserver(bad, &fakePending{}, nil, nil); err == nil {
			t.Fatal("accepted unsafe host config")
		}
	}
	if _, err := NewLinuxHostObserver(sampleConfig(), nil, nil, nil); err == nil {
		t.Fatal("accepted missing queue source")
	}
	cases := []struct {
		name   string
		stat2  string
		mem    string
		queued int
		want   error
	}{
		{"bad CPU", "cpu garbage\n", "MemAvailable: 1024000 kB\n", 0, ErrHostCounters},
		{"reset CPU", "cpu 1 0 1 2 0 0 0\n", "MemAvailable: 1024000 kB\n", 0, ErrHostCounters},
		{"missing memory", "cpu 200 0 100 700 0 0 0\n", "MemFree: 1024000 kB\n", 0, ErrHostCounters},
		{"negative queue", "cpu 200 0 100 700 0 0 0\n", "MemAvailable: 1024000 kB\n", -1, ErrHostCounters},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			now := when()
			count := 0
			read := func(path string) ([]byte, error) {
				if path == "/proc/stat" {
					count++
					if count == 1 {
						return []byte("cpu 100 0 100 500 0 0 0\n"), nil
					}
					return []byte(tc.stat2), nil
				}
				return []byte(tc.mem), nil
			}
			o, _ := NewLinuxHostObserver(sampleConfig(), &fakePending{value: tc.queued}, read, func() time.Time { return now })
			_, _ = o.Read(context.Background())
			now = now.Add(time.Second)
			if _, err := o.Read(context.Background()); !errors.Is(err, tc.want) {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}
		})
	}
}

func TestLinuxHostObserverRejectsTooFastAndAncientSamples(t *testing.T) {
	now := when()
	cpu := uint64(1000)
	read := func(path string) ([]byte, error) {
		if path == "/proc/meminfo" {
			return []byte("MemAvailable: 3145728 kB\n"), nil
		}
		cpu += 100
		return []byte(fmt.Sprintf("cpu 0 0 0 %d 0 0 0\n", cpu)), nil
	}
	o, _ := NewLinuxHostObserver(sampleConfig(), &fakePending{}, read, func() time.Time { return now })
	_, _ = o.Read(context.Background())
	now = now.Add(500 * time.Millisecond)
	if _, err := o.Read(context.Background()); !errors.Is(err, ErrHostWarmup) {
		t.Fatalf("too quick sample accepted: %v", err)
	}
	now = now.Add(6 * time.Minute)
	if _, err := o.Read(context.Background()); !errors.Is(err, ErrHostCounters) {
		t.Fatalf("ancient CPU interval accepted: %v", err)
	}
}

func TestCPUAndMemoryParserFailClosed(t *testing.T) {
	for _, s := range []string{"", "cpu\n", "cpu 1 x 0 0\n", "cpu 0 0 0 0\n", "cpu 18446744073709551615 0 0 2\n"} {
		if _, err := parseCPUCounters([]byte(s)); err == nil {
			t.Errorf("accepted CPU row: %q", s)
		}
	}
	for _, s := range []string{"", "MemFree: 10 kB", "MemAvailable: nope kB", "MemAvailable: 10 MB", "MemAvailable: 10", "MemAvailable: " + strings.Repeat("9", 100) + " kB"} {
		if _, err := parseMemAvailable([]byte(s)); err == nil {
			t.Errorf("accepted memory row: %q", s)
		}
	}
}

func TestLinuxHostObserverCanceledContextDoesNotRead(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	o, _ := NewLinuxHostObserver(sampleConfig(), &fakePending{}, func(string) ([]byte, error) { t.Fatal("unexpected file read"); return nil, nil }, time.Now)
	if _, err := o.Read(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled context: %v", err)
	}
}
