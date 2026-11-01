package cluster

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const ipcTestToken = "51b8dd2dbe796d24576b7a2c6d3810b6e44f707e5e514edeb9604d588bb7b14"

func TestRegistryIPCUnixSocketAuthenticatesAndDrains(t *testing.T){
	path:=filepath.Join(t.TempDir(),"gateway.sock")
	reg,err:=NewWorkerRegistry(48,8)
	if err!=nil{t.Fatal(err)}
	handler,err:=NewRegistryIPCHandler(reg,ipcTestToken)
	if err!=nil{t.Fatal(err)}
	listener,err:=ListenRegistryIPC(path)
	if err!=nil{t.Fatal(err)}
	defer listener.Close()
	info,err:=os.Stat(path)
	if err!=nil||info.Mode().Perm()!=0600{t.Fatalf("socket must be private 0600: %v %v",info,err)}
	server:=&http.Server{Handler:handler,ReadHeaderTimeout:2*time.Second}
	defer server.Close()
	go func(){_ = server.Serve(listener)}()

	client,err:=NewRegistryIPCClient(path,ipcTestToken)
	if err!=nil{t.Fatal(err)}
	ctx,cancel:=context.WithTimeout(context.Background(),5*time.Second)
	defer cancel()
	snapshot,err:=client.Snapshot(ctx)
	if err!=nil||len(snapshot)!=0{t.Fatalf("initial snapshot: %v %+v",err,snapshot)}
	if err:=client.Register(ctx,Backend{ID:"as-worker-0001",URL:mustIPCURL(t,"http://127.0.0.1:8788")});err!=nil{t.Fatal(err)}
	if _,_,err:=reg.Acquire("unready");!errors.Is(err,ErrNoWorkerCapacity) {t.Fatal("registered but not healthy worker admitted a session")}
	if err:=client.SetReady(ctx,"as-worker-0001");err!=nil{t.Fatal(err)}
	_,release,err:=reg.Acquire("origins")
	if err!=nil{t.Fatal(err)}
	if err:=client.Drain(ctx,"as-worker-0001");err!=nil{t.Fatal(err)}
	if err:=client.Remove(ctx,"as-worker-0001");!errors.Is(err,ErrRegistryIPCUnavailable){t.Fatalf("occupied worker removed: %v",err)}
	if _,_,err:=reg.Acquire("other");!errors.Is(err,ErrNoWorkerCapacity){t.Fatal("draining worker accepted a room")}
	release()
	if err:=client.Remove(ctx,"as-worker-0001");err!=nil {t.Fatalf("could not remove safely drained worker: %v",err)}
	if reg.Count()!=0{t.Fatal("worker retained after removal")}
}

func mustIPCURL(t *testing.T,raw string)*url.URL{
	t.Helper()
	u,e:=url.Parse(raw);if e!=nil{t.Fatal(e)}
	return u
}

func TestRegistryIPCRejectsUntrustedClientsAndPublicBackends(t *testing.T){
	path:=filepath.Join(t.TempDir(),"gateway.sock")
	reg,_:=NewWorkerRegistry(48,8)
	handler,_:=NewRegistryIPCHandler(reg,ipcTestToken)
	listener,err:=ListenRegistryIPC(path)
	if err!=nil{t.Fatal(err)}
	server:=&http.Server{Handler:handler}
	defer server.Close()
	go func(){_ = server.Serve(listener)}()
	wrong,err:=NewRegistryIPCClient(path,strings.Repeat("z",64))
	if err!=nil{t.Fatal(err)}
	ctx:=context.Background()
	if _,err:=wrong.Snapshot(ctx);!errors.Is(err,ErrRegistryIPCUnavailable) {t.Fatalf("wrong token accepted: %v",err)}
	good,_:=NewRegistryIPCClient(path,ipcTestToken)
	for _,address:=range []string{
		"http://8.8.8.8:8788",
		"http://evil.example.com:8788",
		"http://127.0.0.1:9000",
		"https://127.0.0.1:8788",
		"http://127.0.0.1:8788/private",
		"http://127.0.0.1:8788/?room=evil",
	}{
		err:=good.Register(ctx,Backend{ID:"as-worker-0001",URL:mustIPCURL(t,address)})
		if !errors.Is(err,ErrRegistryIPCUnavailable){t.Errorf("untrusted backend %s accepted: %v",address,err)}
	}
	if reg.Count()!=0 {t.Fatal("untrusted registration mutated registry")}
}

func TestRegistryIPCRequiresPrivateSocketParentAndCredentials(t *testing.T){
	tmp:=t.TempDir()
	if _,err:=NewRegistryIPCHandler(nil,ipcTestToken);!errors.Is(err,ErrRegistryIPCConfig){t.Fatal(err)}
	r,_:=NewWorkerRegistry(48,8)
	if _,err:=NewRegistryIPCHandler(r,"short");!errors.Is(err,ErrRegistryIPCConfig){t.Fatal(err)}
	if _,err:=NewRegistryIPCClient("relative.sock",ipcTestToken);!errors.Is(err,ErrRegistryIPCConfig){t.Fatal(err)}
	if _,err:=ListenRegistryIPC("relative.sock");!errors.Is(err,ErrRegistryIPCConfig){t.Fatal(err)}
	dir:=filepath.Join(tmp,"too-open")
	if err:=os.Mkdir(dir,0755);err!=nil{t.Fatal(err)}
	if _,err:=ListenRegistryIPC(filepath.Join(dir,"admin.sock"));!errors.Is(err,ErrRegistryIPCConfig){t.Fatalf("world-accessible parent accepted: %v",err)}
	parent:=filepath.Join(tmp,"private")
	if err:=os.Mkdir(parent,0700);err!=nil{t.Fatal(err)}
	path:=filepath.Join(parent,"admin.sock")
	if err:=os.WriteFile(path,[]byte("occupied"),0600);err!=nil{t.Fatal(err)}
	if _,err:=ListenRegistryIPC(path);!errors.Is(err,ErrRegistryIPCConfig){t.Fatalf("existing path overwritten: %v",err)}
}

func TestRegistryIPCClientUnreachableFailsClosed(t *testing.T){
	client,err:=NewRegistryIPCClient(filepath.Join(t.TempDir(),"missing.sock"),ipcTestToken)
	if err!=nil{t.Fatal(err)}
	if _,err:=client.Snapshot(context.Background());!errors.Is(err,ErrRegistryIPCUnavailable){
		t.Fatalf("missing socket returned empty healthy state: %v",err)
	}
}
