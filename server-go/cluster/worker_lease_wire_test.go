package cluster

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestPrivateLeaseTransportRequiresCoordinatorMTLS(t *testing.T){
	pub,key:=testLeaseKeys(t)
	g,err:=NewWorkerLeaseGate(pub,"east",Province{-3,8})
	if err!=nil{t.Fatal(err)}
	defer g.Close()
	endpoint,err:=NewWorkerLeaseEndpoint(g,"control")
	if err!=nil{t.Fatal(err)}
	srv,clients:=testMutualTLS(t,endpoint)
	url:=srv.URL+WorkerLeasePath
	permit:=testSignedLease(t,key,g,1,1,time.Second)
	cmd:=LeaseCommandFor(permit)
	// mTLS certificate for another worker cannot impersonate coordinator.
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("west"),url,cmd);err==nil{
		t.Fatal("worker certificate installed lease")
	}
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("unknown"),url,cmd);err==nil{
		t.Fatal("anonymous connection installed lease")
	}
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),"http://127.0.0.1"+WorkerLeasePath,cmd);err==nil{
		t.Fatal("plaintext transport accepted")
	}
	receipt,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,cmd)
	if err!=nil{t.Fatal(err)}
	if receipt.Action!="installed"||receipt.Sequence!=1||receipt.Epoch!=1||
		receipt.BootID!=g.BootID(){t.Fatalf("unexpected ACK: %+v",receipt)}
	if err:=g.WithLease(func()error{return nil});err!=nil{t.Fatal(err)}
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,cmd);err==nil{
		t.Fatal("replayed sequence accepted over mTLS")
	}
	wrong:=testSignedLease(t,key,g,1,2,time.Second)
	forged:=LeaseCommandFor(wrong)
	forged.Permit.SignatureHex="00"
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,forged);err==nil{
		t.Fatal("bad signature installed")
	}
	scope:=LeaseCommandFor(wrong)
	scope.Province.X++
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,scope);err==nil{
		t.Fatal("cross-province lease installed")
	}
	renewal,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,LeaseCommandFor(wrong))
	if err!=nil||renewal.Sequence!=2{t.Fatalf("renewal failed: %+v %v",renewal,err)}
}

func TestRemoteMTLSRevokeWaitsForInflightSimulation(t *testing.T){
	pub,key:=testLeaseKeys(t)
	g,err:=NewWorkerLeaseGate(pub,"east",Province{11,3})
	if err!=nil{t.Fatal(err)}
	defer g.Close()
	handler,err:=NewWorkerLeaseEndpoint(g,"control")
	if err!=nil{t.Fatal(err)}
	srv,clients:=testMutualTLS(t,handler)
	url:=srv.URL+WorkerLeasePath
	p:=testSignedLease(t,key,g,1,1,time.Second)
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,LeaseCommandFor(p));err!=nil{t.Fatal(err)}
	started:=make(chan struct{})
	release:=make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func(){
		defer wg.Done()
		_ = g.WithLease(func()error{close(started);<-release;return nil})
	}()
	<-started
	revocation:=WorkerLeaseCommand{Action:"revoke",Province:g.province,WorkerID:g.worker,BootID:g.BootID(),Epoch:1}
	result:=make(chan error,1)
	go func(){
		ack,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,revocation)
		if err==nil&&(ack.Action!="revoked"||ack.Sequence!=1){err=ErrWorkerLeaseInvalid}
		result<-err
	}()
	select{
	case err:=<-result:t.Fatalf("revocation acknowledged while tick active: %v",err)
	case <-time.After(35*time.Millisecond):
	}
	close(release)
	wg.Wait()
	if err:=<-result;err!=nil{t.Fatal(err)}
	if err:=g.WithLease(func()error{t.Fatal("revoked room ticked");return nil});!errors.Is(err,ErrWorkerLeaseRevoked){
		t.Fatalf("revocation did not fence worker: %v",err)
	}
	late:=testSignedLease(t,key,g,1,2,time.Second)
	if _,err:=SendWorkerLeaseCommand(context.Background(),clients("control"),url,LeaseCommandFor(late));err==nil{
		t.Fatal("revoked worker was reauthorized")
	}
}

func TestWorkerLeaseTransportRejectsHeaderSpoofingAndUnknownFields(t *testing.T){
	pub,_:=testLeaseKeys(t)
	g,err:=NewWorkerLeaseGate(pub,"east",Province{0,0})
	if err!=nil{t.Fatal(err)}
	defer g.Close()
	handler,err:=NewWorkerLeaseEndpoint(g,"control")
	if err!=nil{t.Fatal(err)}
	raw:=httptest.NewRequest(http.MethodPost,WorkerLeasePath,bytes.NewReader([]byte(`{}`)))
	raw.Header.Set("X-Worker-ID","control")
	w:=httptest.NewRecorder()
	handler.ServeHTTP(w,raw)
	if w.Code!=http.StatusForbidden{t.Fatalf("spoofed header authorized coordinator: %d",w.Code)}
	srv,clients:=testMutualTLS(t,handler)
	wire,_:=json.Marshal(map[string]any{"Action":"revoke","UnknownField":"ignored"})
	response,err:=clients("control").Post(srv.URL+WorkerLeasePath,"application/json",bytes.NewReader(wire))
	if err!=nil{t.Fatal(err)}
	defer response.Body.Close()
	if response.StatusCode!=http.StatusBadRequest{
		t.Fatalf("extra lease fields accepted: %d",response.StatusCode)
	}
}
