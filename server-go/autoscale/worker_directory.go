package autoscale

import (
	"context"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

// LocalWorkerDirectory is an explicit, in-process adapter for the gateway
// registry. Production autoscaling must use an authenticated Unix-socket
// connection instead of sharing the public gateway's address space.
type LocalWorkerDirectory struct {
	Registry *cluster.WorkerRegistry
}

func (d LocalWorkerDirectory) Snapshot(ctx context.Context) ([]cluster.WorkerStatus, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if d.Registry == nil {
		return nil, cluster.ErrRegistryInvalid
	}
	return d.Registry.Snapshot(), nil
}

func (d LocalWorkerDirectory) Register(ctx context.Context, backend cluster.Backend) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if d.Registry == nil {
		return cluster.ErrRegistryInvalid
	}
	return d.Registry.Register(backend)
}

func (d LocalWorkerDirectory) SetReady(ctx context.Context, id string, ready bool) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if d.Registry == nil {
		return cluster.ErrRegistryInvalid
	}
	return d.Registry.SetReady(id, ready)
}

func (d LocalWorkerDirectory) Drain(ctx context.Context, id string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if d.Registry == nil {
		return cluster.ErrRegistryInvalid
	}
	return d.Registry.Drain(id)
}

func (d LocalWorkerDirectory) Remove(ctx context.Context, id string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if d.Registry == nil {
		return cluster.ErrRegistryInvalid
	}
	return d.Registry.Remove(id)
}

// IPCWorkerDirectory uses the private IPC and propagates every transport
// error to the autoscaler. NEVER substitute an empty registry on IPC errors.
// The remote SetReady operation only supports enabling a verified worker.
type IPCWorkerDirectory struct {
	Client *cluster.RegistryIPCClient
}

func (d IPCWorkerDirectory) Snapshot(ctx context.Context) ([]cluster.WorkerStatus, error) {
	if d.Client == nil {
		return nil, cluster.ErrRegistryIPCConfig
	}
	return d.Client.Snapshot(ctx)
}
func (d IPCWorkerDirectory) Register(ctx context.Context, backend cluster.Backend) error {
	if d.Client == nil {
		return cluster.ErrRegistryIPCConfig
	}
	return d.Client.Register(ctx, backend)
}
func (d IPCWorkerDirectory) SetReady(ctx context.Context, id string, ready bool) error {
	if d.Client == nil || !ready {
		return cluster.ErrRegistryIPCConfig
	}
	return d.Client.SetReady(ctx, id)
}
func (d IPCWorkerDirectory) Drain(ctx context.Context, id string) error {
	if d.Client == nil {
		return cluster.ErrRegistryIPCConfig
	}
	return d.Client.Drain(ctx, id)
}
func (d IPCWorkerDirectory) Remove(ctx context.Context, id string) error {
	if d.Client == nil {
		return cluster.ErrRegistryIPCConfig
	}
	return d.Client.Remove(ctx, id)
}
