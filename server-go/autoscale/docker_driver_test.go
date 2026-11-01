package autoscale

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
)

type dockerRoundTrip func(*http.Request)(*http.Response,error)
func (f dockerRoundTrip)RoundTrip(r *http.Request)(*http.Response,error){return f(r)}
func jsonResponse(status int,body string)*http.Response{
	return &http.Response{StatusCode:status,Body:io.NopCloser(strings.NewReader(body)),Header:make(http.Header)}
}
func dockerOptions()DockerOptions{
	return DockerOptions{
		SocketPath:"/var/run/docker.sock",
		Image:"ghcr.io/softdown-prog/terrania-go@sha256:"+strings.Repeat("a",64),
		Network:"terrania-autoscale",AllowedOrigins:"https://rpg.example.com",
		CPUMilli:500,MemoryMiB:256,MaxClients:48,MaxRooms:8,
	}
}
func dockerDriverForTest(t *testing.T,handler dockerRoundTrip)*DockerDriver{
	t.Helper()
	d,err:=NewDockerDriver(dockerOptions())
	if err!=nil {t.Fatal(err)}
	d.client=&http.Client{Transport:handler}
	return d
}
func dockerInspectFixture(cid,id string,ready,correctOwner bool)string{
	label:=id
	if !correctOwner {label="other-app"}
	status:="starting"
	if ready {status="healthy"}
	obj:=map[string]any{
		"ID":cid,"Name":"/terrania-"+id,
		"Config":map[string]any{"Labels":map[string]string{workerLabel:label,managedLabel:workerRole}},
		"State":map[string]any{"Running":true,"Health":map[string]string{"Status":status}},
		"NetworkSettings":map[string]any{"Networks":map[string]any{"terrania-autoscale":map[string]string{"IPAddress":"172.29.10.4"}}},
	}
	b,_:=json.Marshal(obj)
	return string(b)
}
func TestDockerDriverCreatesOnlyPinnedIsolatedWorker(t *testing.T){
	cid:=strings.Repeat("a",64)
	var mu sync.Mutex
	var methods []string
	d:=dockerDriverForTest(t,func(req *http.Request)(*http.Response,error){
		mu.Lock();defer mu.Unlock()
		methods=append(methods,req.Method+" "+req.URL.Path)
		switch {
		case req.Method=="POST" && strings.HasSuffix(req.URL.Path,"/containers/create"):
			if req.URL.Query().Get("name")!="terrania-as-worker-0001" {t.Error("unsafe container name")}
			var payload struct{
				Image string
				Labels map[string]string
				Env []string
				HostConfig struct {
					NetworkMode string
					NanoCpus int64
					Memory int64
					ReadonlyRootfs bool
					PublishAllPorts bool
					CapDrop []string
					PidsLimit int64
				}
			}
			if err:=json.NewDecoder(req.Body).Decode(&payload);err!=nil {t.Error(err)}
			if payload.Image!=dockerOptions().Image || payload.Labels[workerLabel]!="as-worker-0001" ||
				payload.Labels[managedLabel]!=workerRole || payload.HostConfig.NetworkMode!="terrania-autoscale" ||
				payload.HostConfig.NanoCpus!=500000000 || payload.HostConfig.Memory!=268435456 ||
				!payload.HostConfig.ReadonlyRootfs || payload.HostConfig.PublishAllPorts ||
				payload.HostConfig.PidsLimit!=64 || len(payload.HostConfig.CapDrop)!=1 {
				t.Errorf("unsafe Docker request: %+v",payload)
			}
			return jsonResponse(201,`{"Id":"`+cid+`"}`),nil
		case req.Method=="GET" && strings.HasSuffix(req.URL.Path,"/json"):
			return jsonResponse(200,dockerInspectFixture(cid,"as-worker-0001",true,true)),nil
		case req.Method=="POST" && strings.HasSuffix(req.URL.Path,"/start"):
			return jsonResponse(204,""),nil
		case req.Method=="POST" && strings.HasSuffix(req.URL.Path,"/stop"):
			return jsonResponse(204,""),nil
		case req.Method=="DELETE" && strings.Contains(req.URL.Path,"/containers/"):
			if req.URL.Query().Get("force")!="false" {t.Error("forced delete")}
			return jsonResponse(204,""),nil
		}
		return jsonResponse(404,""),nil
	})
	ctx:=context.Background()
	got,err:=d.Create(ctx,"as-worker-0001")
	if err!=nil||got!=cid {t.Fatalf("Docker create: %v %s",err,got)}
	if err:=d.Start(ctx,"as-worker-0001",cid);err!=nil {t.Fatal(err)}
	b,err:=d.ReadyBackend(ctx,"as-worker-0001",cid)
	if err!=nil||b.ID!="as-worker-0001"||b.URL.String()!="http://172.29.10.4:8788" {
		t.Fatalf("not routed to isolated IP: %+v %v",b,err)
	}
	if err:=d.StopAndRemove(ctx,"as-worker-0001",cid);err!=nil {t.Fatal(err)}
	mu.Lock();defer mu.Unlock()
	if len(methods)!=7 {t.Fatalf("unexpected Docker operations: %v",methods)}
}
func TestDockerDriverNeverStopsUnownedContainer(t *testing.T){
	cid:=strings.Repeat("b",64)
	postCalls:=0
	d:=dockerDriverForTest(t,func(req *http.Request)(*http.Response,error){
		if req.Method!="GET" {postCalls++}
		return jsonResponse(200,dockerInspectFixture(cid,"as-worker-0001",true,false)),nil
	})
	if err:=d.StopAndRemove(context.Background(),"as-worker-0001",cid);err!=ErrDockerOwnership {
		t.Fatalf("foreign container not rejected: %v",err)
	}
	if postCalls!=0 {t.Fatal("Docker mutation attempted on unowned container")}
}
func TestDockerDriverNoRouteBeforeHealthy(t *testing.T){
	cid:=strings.Repeat("b",64)
	d:=dockerDriverForTest(t,func(req *http.Request)(*http.Response,error){
		return jsonResponse(200,dockerInspectFixture(cid,"as-worker-0001",false,true)),nil
	})
	if _,err:=d.ReadyBackend(context.Background(),"as-worker-0001",cid);err!=ErrWorkerNotReady {
		t.Fatalf("unhealthy container considered ready: %v",err)
	}
}
func TestDockerDriverRejectsUnsafeConfiguration(t *testing.T){
	base:=dockerOptions()
	bad:=[]DockerOptions{}
	change:=func(fn func(*DockerOptions)){c:=base;fn(&c);bad=append(bad,c)}
	change(func(c *DockerOptions){c.SocketPath="/tmp/other.sock"})
	change(func(c *DockerOptions){c.Image="terrania-go:latest"})
	change(func(c *DockerOptions){c.Network="host"})
	change(func(c *DockerOptions){c.Network="bridge"})
	change(func(c *DockerOptions){c.AllowedOrigins="http://insecure.example"})
	change(func(c *DockerOptions){c.MemoryMiB=0})
	change(func(c *DockerOptions){c.CPUMilli=0})
	change(func(c *DockerOptions){c.MaxClients=0})
	for i,c:=range bad {
		if _,err:=NewDockerDriver(c);err==nil {t.Errorf("unsafe config %d allowed",i)}
	}
	d,_:=NewDockerDriver(base)
	if _,err:=d.Create(context.Background(),"../../other-project");err==nil {t.Fatal("bad worker ID accepted")}
}
