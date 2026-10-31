package cluster

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	WorkerLeasePath = "/internal/region/worker-lease"
	maxWorkerLeaseWireBytes = 4096
)

type WorkerLeaseCommand struct {
	Action string
	Permit WorkerLeasePermit
	Province Province
	WorkerID string
	BootID string
	Epoch uint64
}

type WorkerLeaseReceipt struct {
	Province Province
	WorkerID string
	BootID string
	Epoch uint64
	Sequence uint64
	Action string
}

// WorkerLeaseEndpoint permits only an authenticated, selected internal
// coordinator certificate to install or revoke bounded signed leases.
// This endpoint is NOT registered in cmd/terrania nor in the public gateway.
// TLS servers MUST use RequireAndVerifyClientCert with a pinned internal CA.
type WorkerLeaseEndpoint struct {
	gate *WorkerLeaseGate
	coordinatorID string
}

func NewWorkerLeaseEndpoint(g *WorkerLeaseGate,coordinatorID string)(*WorkerLeaseEndpoint,error){
	if g==nil||!validServiceID(coordinatorID){return nil,ErrWorkerLeaseInvalid}
	return &WorkerLeaseEndpoint{gate:g,coordinatorID:coordinatorID},nil
}

func validServiceID(v string)bool{
	if len(v)==0||len(v)>32{return false}
	for _,ch:=range v{
		if (ch<'a'||ch>'z')&&(ch<'0'||ch>'9')&&ch!='-' {return false}
	}
	return true
}

// Authenticate the URI SAN and verified certificate chain, never HTTP headers
// nor the certificate Common Name. This is disjoint from worker identities.
func peerCoordinatorID(r *http.Request)(string,bool){
	if r.TLS==nil||len(r.TLS.VerifiedChains)==0||len(r.TLS.PeerCertificates)==0{return "",false}
	uris:=r.TLS.PeerCertificates[0].URIs
	if len(uris)!=1{return "",false}
	u:=uris[0]
	if u==nil||u.Scheme!="spiffe"||u.Host!="terrania.internal"||
		u.User!=nil||u.RawQuery!=""||u.Fragment!=""||u.RawPath!=""||
		!strings.HasPrefix(u.Path,"/coordinator/"){return "",false}
	id:=strings.TrimPrefix(u.Path,"/coordinator/")
	return id,validServiceID(id)
}

func (h *WorkerLeaseEndpoint) ServeHTTP(w http.ResponseWriter,r *http.Request){
	if r.URL.Path!=WorkerLeasePath{http.NotFound(w,r);return}
	if r.Method!=http.MethodPost{http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return}
	id,ok:=peerCoordinatorID(r)
	if !ok||id!=h.coordinatorID{http.Error(w,"unauthorized coordinator",http.StatusForbidden);return}
	if r.ContentLength>maxWorkerLeaseWireBytes{
		http.Error(w,"request too large",http.StatusRequestEntityTooLarge);return
	}
	r.Body=http.MaxBytesReader(w,r.Body,maxWorkerLeaseWireBytes)
	defer r.Body.Close()
	dec:=json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var command WorkerLeaseCommand
	if err:=dec.Decode(&command);err!=nil{
		var limit *http.MaxBytesError
		if errors.As(err,&limit){http.Error(w,"request too large",http.StatusRequestEntityTooLarge);return}
		http.Error(w,"invalid lease command",http.StatusBadRequest);return
	}
	var trailing any
	if err:=dec.Decode(&trailing);err!=io.EOF{
		http.Error(w,"unexpected lease command suffix",http.StatusBadRequest);return
	}
	g:=h.gate
	var err error
	var receipt WorkerLeaseReceipt
	switch command.Action{
	case "install":
		p:=command.Permit
		if command.Province!=p.Province||command.WorkerID!=p.WorkerID||
			command.BootID!=p.BootID||command.Epoch!=p.Epoch {
			http.Error(w,"lease command scope mismatch",http.StatusForbidden);return
		}
		err=g.Install(p)
		receipt=WorkerLeaseReceipt{Province:p.Province,WorkerID:p.WorkerID,
			BootID:p.BootID,Epoch:p.Epoch,Sequence:p.Sequence,Action:"installed"}
	case "revoke":
		g.mu.RLock()
		match:=g.province==command.Province&&g.worker==command.WorkerID&&
			g.bootID==command.BootID&&g.initialized&&g.epoch==command.Epoch
		g.mu.RUnlock()
		if !match{http.Error(w,"revocation scope mismatch",http.StatusForbidden);return}
		var evidence WorkerRevocationEvidence
		evidence,err=g.Revoke()
		receipt=WorkerLeaseReceipt{Province:evidence.Province,WorkerID:evidence.WorkerID,
			BootID:evidence.BootID,Epoch:evidence.Epoch,Sequence:evidence.Sequence,Action:"revoked"}
	default:
		http.Error(w,"unknown lease command",http.StatusBadRequest);return
	}
	if err!=nil{http.Error(w,"lease not accepted",http.StatusConflict);return}
	w.Header().Set("Content-Type","application/json")
	w.Header().Set("Cache-Control","no-store")
	_ = json.NewEncoder(w).Encode(receipt)
}

// SendWorkerLeaseCommand transmits only to an explicitly configured HTTPS
// endpoint. The client must authenticate with the selected coordinator's
// certificate and verify the destination certificate against its CA/hostname.
// Neither callback redirects nor insecure transports may forward lease data.
func SendWorkerLeaseCommand(ctx context.Context,client *http.Client,endpoint string,command WorkerLeaseCommand)(WorkerLeaseReceipt,error){
	if client==nil{return WorkerLeaseReceipt{},ErrWorkerLeaseInvalid}
	u,err:=url.Parse(endpoint)
	if err!=nil||u==nil||u.Scheme!="https"||u.Host==""||u.User!=nil||
		u.RawQuery!=""||u.Fragment!=""||u.Path!=WorkerLeasePath{
		return WorkerLeaseReceipt{},ErrWorkerLeaseInvalid
	}
	if command.Action!="install"&&command.Action!="revoke"{return WorkerLeaseReceipt{},ErrWorkerLeaseInvalid}
	body,err:=json.Marshal(command)
	if err!=nil||len(body)>maxWorkerLeaseWireBytes{return WorkerLeaseReceipt{},ErrWorkerLeaseInvalid}
	req,err:=http.NewRequestWithContext(ctx,http.MethodPost,endpoint,bytes.NewReader(body))
	if err!=nil{return WorkerLeaseReceipt{},err}
	req.Header.Set("Content-Type","application/json")
	secureClient:=*client
	secureClient.CheckRedirect=func(*http.Request,[]*http.Request)error{return http.ErrUseLastResponse}
	resp,err:=secureClient.Do(req)
	if err!=nil{return WorkerLeaseReceipt{},err}
	defer resp.Body.Close()
	if resp.StatusCode!=http.StatusOK{
		return WorkerLeaseReceipt{},fmt.Errorf("worker rejected lease command: HTTP %d",resp.StatusCode)
	}
	var receipt WorkerLeaseReceipt
	decoder:=json.NewDecoder(io.LimitReader(resp.Body,1024))
	decoder.DisallowUnknownFields()
	if err:=decoder.Decode(&receipt);err!=nil{return WorkerLeaseReceipt{},fmt.Errorf("invalid lease acknowledgment: %w",err)}
	expectedAction:="installed"
	expectedSeq:=command.Permit.Sequence
	if command.Action=="revoke"{expectedAction="revoked";expectedSeq=0}
	if receipt.Action!=expectedAction||receipt.Province!=command.Province||
		receipt.WorkerID!=command.WorkerID||receipt.BootID!=command.BootID||
		receipt.Epoch!=command.Epoch||(command.Action=="install"&&receipt.Sequence!=expectedSeq){
		return WorkerLeaseReceipt{},ErrWorkerLeaseInvalid
	}
	return receipt,nil
}

// LeaseCommandFor creates an installation envelope explicitly scoped to its
// signed permit. Revoke commands require a separate explicit instruction.
func LeaseCommandFor(p WorkerLeasePermit)WorkerLeaseCommand{
	return WorkerLeaseCommand{Action:"install",Permit:p,Province:p.Province,
		WorkerID:p.WorkerID,BootID:p.BootID,Epoch:p.Epoch}
}

