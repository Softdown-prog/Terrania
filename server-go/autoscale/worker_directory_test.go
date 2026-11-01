package autoscale

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

// failSnapshotDirectory allows deterministic simulation of a lost gateway.
type failSnapshotDirectory struct {
	WorkerDirectory
	mu sync.Mutex
	down bool
}
func (d *failSnapshotDirectory) Snapshot(ctx context.Context) ([]cluster.WorkerStatus,error) {
	d.mu.Lock()
	down:=d.down
	d.mu.Unlock()
	if down {
		return nil,cluster.ErrRegistryIPCUnavailable
	}
	return d.WorkerDirectory.Snapshot(ctx)
}
func (d *failSnapshotDirectory) setDown(v bool){
	d.mu.Lock()
	defer d.mu.Unlock()
	d.down=v
}

func TestControllerDoesNotTreatIPCDowntimeAsZeroWorkers(t *testing.T) {
	now:=when()
	f:=&fakeRuntime{}
	reg,err:=cluster.NewWorkerRegistry(48,8)
	if err!=nil {t.Fatal(err)}
	dir:=&failSnapshotDirectory{WorkerDirectory:LocalWorkerDirectory{Registry:reg}}
	s:=NewSupervisor(f,dir)
	s.readyInterval=time.Millisecond
	s.readyAttempts=2
	obs:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:90,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	controller,err:=NewController(controllerTestConfig(),obs,s,dir)
	if err!=nil {t.Fatal(err)}
	first,err:=controller.Reconcile(context.Background(),now)
	if err!=nil || first.Action!="start" || reg.Count()!=1 {t.Fatalf("first worker: %+v %v",first,err)}
	dir.setDown(true)
	now=now.Add(time.Second)
	obs.Set(HostSample{SampledAt:now,Queued:10000,FreeCPUMilli:1500,FreeMemoryMiB:768})
	if _,err:=controller.Reconcile(context.Background(),now);!errors.Is(err,cluster.ErrRegistryIPCUnavailable) {
		t.Fatalf("controller silently treated IPC failure as an empty cluster: %v",err)
	}
	if _,err:=s.DrainOrStopOne(context.Background(),"as-worker-0001");!errors.Is(err,cluster.ErrRegistryIPCUnavailable) {
		t.Fatalf("supervisor drained during disconnect: %v",err)
	}
	if f.created!=1 || f.removed!=0 || reg.Count()!=1 {t.Fatal("Docker changed during gateway outage")}
	dir.setDown(false)
	_,err=controller.Reconcile(context.Background(),now)
	if err!=nil || reg.Count()!=2 {
		t.Fatalf("fresh sample should be reusable after failed IPC attempt: %v count=%d",err,reg.Count())
	}
}
func TestControllerOverPrivateUnixIPCStopsOnDisconnect(t *testing.T){
	base:=t.TempDir()
	parent:=filepath.Join(base,"private")
	if err:=os.Mkdir(parent,0700);err!=nil{t.Fatal(err)}
	path:=filepath.Join(parent,"admin.sock")
	reg,err:=cluster.NewWorkerRegistry(48,8)
	if err!=nil{t.Fatal(err)}
	token:=strings.Repeat("a",64)
	handler,err:=cluster.NewRegistryIPCHandler(reg,token)
	if err!=nil{t.Fatal(err)}
	listener,err:=cluster.ListenRegistryIPC(path)
	if err!=nil{t.Fatal(err)}
	server:=&http.Server{Handler:handler,ReadHeaderTimeout:time.Second}
	go func(){_ = server.Serve(listener)}()
	t.Cleanup(func(){_ = server.Close();_ = listener.Close()})
	client,err:=cluster.NewRegistryIPCClient(path,token)
	if err!=nil{t.Fatal(err)}
	directory:=IPCWorkerDirectory{Client:client}
	runtime:=&fakeRuntime{}
	supervisor:=NewSupervisor(runtime,directory)
	supervisor.readyAttempts=1
	now:=when()
	observer:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:10,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	controller,err:=NewController(controllerTestConfig(),observer,supervisor,directory)
	if err!=nil{t.Fatal(err)}
	first,err:=controller.Reconcile(context.Background(),now)
	if err!=nil||first.Action!="start"||!first.Completed||reg.Count()!=1 {
		t.Fatalf("IPC worker not started: %+v err=%v count=%d",first,err,reg.Count())
	}
	_,done,err:=reg.Acquire("friends")
	if err!=nil{t.Fatal(err)}
	defer done()
	if err:=server.Close();err!=nil {t.Fatal(err)}
	_ = listener.Close()
	now=now.Add(time.Second)
	observer.Set(HostSample{SampledAt:now,Queued:0,FreeCPUMilli:1000,FreeMemoryMiB:512})
	if _,err:=controller.Reconcile(context.Background(),now);!errors.Is(err,cluster.ErrRegistryIPCUnavailable) {
		t.Fatalf("offline IPC must fail closed, got %v",err)
	}
	if runtime.removed!=0||supervisor.ManagedCount()!=1||reg.Count()!=1 {
		t.Fatal("gateway outage caused deletion or untracked worker")
	}
}

func TestLocalDirectoryRespectsCancellation(t *testing.T){
	reg,_:=cluster.NewWorkerRegistry(48,8)
	d:=LocalWorkerDirectory{Registry:reg}
	ctx,cancel:=context.WithCancel(context.Background())
	cancel()
	if _,err:=d.Snapshot(ctx);!errors.Is(err,context.Canceled){t.Fatalf("snapshot ignored cancellation: %v",err)}
	u,_:=url.Parse("http://127.0.0.1:8788")
	if err:=d.Register(ctx,cluster.Backend{ID:"a",URL:u});!errors.Is(err,context.Canceled){t.Fatal(err)}
	if reg.Count()!=0{t.Fatal("canceled call modified registry")}
}
