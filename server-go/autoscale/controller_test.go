package autoscale

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

type fakeHostObserver struct {
	mu sync.Mutex
	sample HostSample
	err error
}
func (f *fakeHostObserver)Read(ctx context.Context)(HostSample,error){
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.sample,f.err
}
func (f *fakeHostObserver)Set(s HostSample){
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sample=s
}

func controllerTestConfig()ControllerConfig{
	return ControllerConfig{Policy:config(),MaxSampleAge:5*time.Second,LowLoadSamples:2}
}
func controllerForTest(t *testing.T,observer *fakeHostObserver)(*Controller,*Supervisor,*cluster.WorkerRegistry,*fakeRuntime){
	t.Helper()
	runtime:=&fakeRuntime{}
	s,r:=newTestSupervisor(t,runtime)
	c,err:=NewController(controllerTestConfig(),observer,s,r)
	if err!=nil{t.Fatal(err)}
	return c,s,r,runtime
}

func TestControllerBurstScalesOutOneContainerPerObservation(t *testing.T){
	now:=when()
	host:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:90,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	c,s,reg,runtime:=controllerForTest(t,host)
	for i:=1;i<=3;i++ {
		r,err:=c.Reconcile(context.Background(),now)
		if err!=nil{t.Fatal(err)}
		if r.Action!="start" || !r.Completed || r.WorkerID!=[]string{"","as-worker-0001","as-worker-0002","as-worker-0003"}[i] {
			t.Fatalf("step %d: %+v",i,r)
		}
		if s.ManagedCount()!=i || reg.Count()!=i {t.Fatalf("wrong worker count: %d",reg.Count())}
		now=now.Add(time.Second)
		host.Set(HostSample{SampledAt:now,Queued:90,FreeCPUMilli:(3-i)*500,FreeMemoryMiB:(3-i)*256})
	}
	last,err:=c.Reconcile(context.Background(),now)
	if err!=nil || last.Action!="none" || runtime.created!=3 {t.Fatalf("no spare workers should start: %+v %v",last,err)}
}
func TestControllerNeverExceedsHostLimitsUnderViralDemand(t *testing.T){
	now:=when()
	host:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:1_000_000,FreeCPUMilli:0,FreeMemoryMiB:4096}}
	c,_,reg,runtime:=controllerForTest(t,host)
	r,err:=c.Reconcile(context.Background(),now)
	if err!=nil {t.Fatal(err)}
	if r.Plan.RequestedWorkers<1000 || r.Plan.Start!=0 || r.Action!="none" || !r.Plan.LimitedByHost ||
		reg.Count()!=0 || runtime.created!=0 {t.Fatalf("overcommitted shared VPS: %+v",r)}
}
func TestControllerWaitsForMultipleLowLoadSamplesAndSafeDrain(t *testing.T){
	now:=when()
	host:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:70,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	c,s,reg,runtime:=controllerForTest(t,host)
	for i:=0;i<2;i++ {
		if _,err:=c.Reconcile(context.Background(),now);err!=nil{t.Fatal(err)}
		now=now.Add(time.Second)
		host.Set(HostSample{SampledAt:now,Queued:70,FreeCPUMilli:1500-(i+1)*500,FreeMemoryMiB:768-(i+1)*256})
	}
	if reg.Count()!=2 {t.Fatal("expected two workers before scale-in")}
	_,occupied,err:=reg.Acquire("friends")
	if err!=nil{t.Fatal(err)}
	now=now.Add(3*time.Minute)
	host.Set(HostSample{SampledAt:now,Queued:0,FreeCPUMilli:500,FreeMemoryMiB:256})
	first,err:=c.Reconcile(context.Background(),now)
	if err!=nil||first.Action!="stabilizing"{t.Fatalf("must await sustained low load: %+v %v",first,err)}
	now=now.Add(time.Second)
	host.Set(HostSample{SampledAt:now,Queued:0,FreeCPUMilli:500,FreeMemoryMiB:256})
	second,err:=c.Reconcile(context.Background(),now)
	if err!=nil||second.Action!="drain"||!second.Completed {t.Fatalf("expected drain: %+v %v",second,err)}
	if runtime.removed!=0 {t.Fatal("worker stopped before empty")}
	now=now.Add(time.Second)
	host.Set(HostSample{SampledAt:now,Queued:0,FreeCPUMilli:500,FreeMemoryMiB:256})
	third,err:=c.Reconcile(context.Background(),now)
	if err!=nil||third.Action!="stop"||!third.Completed {
		t.Fatalf("expected stop of already-empty drained worker: %+v %v",third,err)
	}
	if reg.Count()!=1||s.ManagedCount()!=1||runtime.removed!=1 {t.Fatal("scale-in did not stop exactly one worker")}
	occupied()
}
func TestControllerRejectsStaleFutureOrInvalidTelemetry(t *testing.T){
	now:=when()
	host:=&fakeHostObserver{sample:HostSample{SampledAt:now.Add(-time.Minute),Queued:100,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	c,_,_,runtime:=controllerForTest(t,host)
	for _,ts:=range []time.Time{now.Add(-time.Minute),now.Add(time.Second),{}} {
		host.Set(HostSample{SampledAt:ts,Queued:100,FreeCPUMilli:1500,FreeMemoryMiB:768})
		if _,err:=c.Reconcile(context.Background(),now);!errors.Is(err,ErrTelemetryStale){
			t.Fatalf("invalid time %s accepted: %v",ts,err)
		}
	}
	host.Set(HostSample{SampledAt:now,Queued:-1,FreeCPUMilli:1500,FreeMemoryMiB:768})
	if _,err:=c.Reconcile(context.Background(),now);err==nil {t.Fatal("invalid demand accepted")}
	if runtime.created!=0 {t.Fatal("mutated Docker on invalid telemetry")}
}
func TestControllerRejectsCanceledContextAndBadConfiguration(t *testing.T){
	host:=&fakeHostObserver{sample:HostSample{SampledAt:when(),Queued:100,FreeCPUMilli:1500,FreeMemoryMiB:768}}
	c,_,reg,runtime:=controllerForTest(t,host)
	ctx,cancel:=context.WithCancel(context.Background())
	cancel()
	if _,err:=c.Reconcile(ctx,when());!errors.Is(err,context.Canceled){t.Fatal(err)}
	if runtime.created!=0{t.Fatal("Docker operation executed after cancellation")}
	cfg:=controllerTestConfig()
	cfg.MaxSampleAge=0
	if _,err:=NewController(cfg,host,c.supervisor,reg);!errors.Is(err,ErrControllerConfig){t.Fatal(err)}
}
func TestControllerSerializedConcurrentReconcile(t *testing.T){
	now:=when()
	host:=&fakeHostObserver{sample:HostSample{SampledAt:now,Queued:90,FreeCPUMilli:500,FreeMemoryMiB:256}}
	c,_,reg,runtime:=controllerForTest(t,host)
	var wg sync.WaitGroup
	errorsOut:=make(chan error,24)
	for i:=0;i<24;i++ {
		wg.Add(1)
		go func(){defer wg.Done();_,err:=c.Reconcile(context.Background(),now);errorsOut<-err}()
	}
	wg.Wait()
	close(errorsOut)
	for err:=range errorsOut{if err!=nil{t.Fatal(err)}}
	if runtime.created!=3 || reg.Count()!=3 {t.Fatalf("expected bounded three workers? created=%d count=%d",runtime.created,reg.Count())}
}
