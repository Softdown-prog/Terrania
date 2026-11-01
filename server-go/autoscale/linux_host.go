package autoscale

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	ErrHostWarmup   = errors.New("host CPU collector needs a second sample")
	ErrHostCounters = errors.New("invalid or reset Linux host counters")
	ErrHostConfig   = errors.New("invalid Linux host capacity configuration")
)

// PendingSource must be authoritative gateway-side admission telemetry.
// It MUST count actual rejected/queued admissions, not a user-supplied query.
type PendingSource interface {
	Pending(context.Context) (int, error)
}

// LinuxHostConfig is an explicitly provisioned capacity budget for ONE VPS.
// CPUCapacityMilli must represent the actual VPS quota, not the host node's
// physical cores. Reserve covers the OS and ALL other projects on this VPS.
type LinuxHostConfig struct {
	CPUCapacityMilli  int
	CPUReserveMilli   int
	MemoryReserveMiB  int
	MaxFreeCPUMilli   int
	MaxFreeMemoryMiB  int
	MinSampleInterval time.Duration
}

func (c LinuxHostConfig) Validate() error {
	if c.CPUCapacityMilli < 100 || c.CPUCapacityMilli > 128000 ||
		c.CPUReserveMilli < 0 || c.CPUReserveMilli >= c.CPUCapacityMilli ||
		c.MemoryReserveMiB < 1 || c.MemoryReserveMiB > 1048576 ||
		c.MaxFreeCPUMilli < 1 || c.MaxFreeCPUMilli > c.CPUCapacityMilli ||
		c.MaxFreeMemoryMiB < 1 || c.MaxFreeMemoryMiB > 1048576 ||
		c.MinSampleInterval < time.Second || c.MinSampleInterval > time.Minute {
		return ErrHostConfig
	}
	return nil
}

type LinuxHostObserver struct {
	mu          sync.Mutex
	config      LinuxHostConfig
	queue       PendingSource
	readFile    func(string) ([]byte, error)
	now         func() time.Time
	previous    cpuCounters
	lastAt      time.Time
	hasPrevious bool
}

type cpuCounters struct {
	total uint64
	idle  uint64
}

func NewLinuxHostObserver(config LinuxHostConfig, queue PendingSource, readFile func(string) ([]byte, error), now func() time.Time) (*LinuxHostObserver, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}
	if queue == nil {
		return nil, ErrHostConfig
	}
	if readFile == nil {
		readFile = os.ReadFile
	}
	if now == nil {
		now = time.Now
	}
	return &LinuxHostObserver{config: config, queue: queue, readFile: readFile, now: now}, nil
}

// Read obtains whole-host /proc metrics. It MUST run in a verified host
// namespace, not a container or a cgroup with misleading CPU quotas.
// The first read always returns ErrHostWarmup. Missing/corrupt/old samples
// fail closed; no guessed capacity can trigger a new container.
func (o *LinuxHostObserver) Read(ctx context.Context) (HostSample, error) {
	if o == nil {
		return HostSample{}, ErrHostConfig
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return HostSample{}, err
	}
	timestamp := o.now()
	cpuRaw, err := o.readFile("/proc/stat")
	if err != nil {
		return HostSample{}, err
	}
	cpu, err := parseCPUCounters(cpuRaw)
	if err != nil {
		return HostSample{}, err
	}
	if !o.hasPrevious {
		o.previous = cpu
		o.lastAt = timestamp
		o.hasPrevious = true
		return HostSample{}, ErrHostWarmup
	}
	elapsed := timestamp.Sub(o.lastAt)
	if elapsed < o.config.MinSampleInterval {
		return HostSample{}, ErrHostWarmup
	}
	if elapsed > time.Minute*5 || timestamp.IsZero() || cpu.total <= o.previous.total || cpu.idle < o.previous.idle {
		o.previous = cpu
		o.lastAt = timestamp
		return HostSample{}, ErrHostCounters
	}
	deltaTotal := cpu.total - o.previous.total
	deltaIdle := cpu.idle - o.previous.idle
	o.previous = cpu
	o.lastAt = timestamp
	if deltaIdle > deltaTotal {
		return HostSample{}, ErrHostCounters
	}
	memRaw, err := o.readFile("/proc/meminfo")
	if err != nil {
		return HostSample{}, err
	}
	availableMiB, err := parseMemAvailable(memRaw)
	if err != nil {
		return HostSample{}, err
	}
	queued, err := o.queue.Pending(ctx)
	if err != nil {
		return HostSample{}, err
	}
	if queued < 0 {
		return HostSample{}, ErrHostCounters
	}
	// Integer arithmetic bounds upper values safely, and leaves deliberate
	// headroom instead of treating idle CPU as guaranteed future throughput.
	idleMilli := int((float64(deltaIdle) / float64(deltaTotal)) * float64(o.config.CPUCapacityMilli))
	if idleMilli < 0 || idleMilli > o.config.CPUCapacityMilli {
		return HostSample{}, ErrHostCounters
	}
	cpuFree := min(o.config.MaxFreeCPUMilli, max(0, idleMilli-o.config.CPUReserveMilli))
	memoryFree := min(o.config.MaxFreeMemoryMiB, max(0, availableMiB-o.config.MemoryReserveMiB))
	return HostSample{SampledAt: timestamp, Queued: queued, FreeCPUMilli: cpuFree, FreeMemoryMiB: memoryFree}, nil
}

func parseCPUCounters(raw []byte) (cpuCounters, error) {
	for _, line := range strings.Split(string(raw), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 0 || fields[0] != "cpu" {
			continue
		}
		if len(fields) < 5 {
			return cpuCounters{}, ErrHostCounters
		}
		total := uint64(0)
		var idle uint64
		for i, v := range fields[1:] {
			n, err := strconv.ParseUint(v, 10, 64)
			if err != nil || math.MaxUint64-total < n {
				return cpuCounters{}, ErrHostCounters
			}
			if i == 3 {
				idle = n
			} // iowait is NOT counted as free CPU.
			total += n
		}
		if total == 0 || idle > total {
			return cpuCounters{}, ErrHostCounters
		}
		return cpuCounters{total: total, idle: idle}, nil
	}
	return cpuCounters{}, fmt.Errorf("%w: aggregate cpu row missing", ErrHostCounters)
}

func parseMemAvailable(raw []byte) (int, error) {
	for _, line := range strings.Split(string(raw), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 0 || fields[0] != "MemAvailable:" {
			continue
		}
		if len(fields) != 3 || fields[2] != "kB" {
			return 0, ErrHostCounters
		}
		kb, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil || kb > uint64(math.MaxInt)*1024 {
			return 0, ErrHostCounters
		}
		return int(kb / 1024), nil
	}
	return 0, fmt.Errorf("%w: MemAvailable missing", ErrHostCounters)
}
