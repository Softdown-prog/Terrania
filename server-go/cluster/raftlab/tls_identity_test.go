package raftlab

import (
	"crypto"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"errors"
	"math/big"
	"net"
	"net/url"
	"testing"
	"time"

	"github.com/hashicorp/raft"
)

func laboratoryLeaf(t *testing.T, ca *labCA, member string,
	notBefore, notAfter time.Time, usages []x509.ExtKeyUsage, uri string) tls.Certificate {
	t.Helper()
	cert := ca.sign(t, member)
	signer, ok := cert.PrivateKey.(crypto.Signer)
	if !ok {
		t.Fatal("test key is not crypto.Signer")
	}
	spiffe, err := url.Parse(uri)
	if err != nil {
		t.Fatal(err)
	}
	template := &x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()),
		Subject: pkix.Name{CommonName: "CN is not a trusted raft identity"},
		NotBefore: notBefore, NotAfter: notAfter,
		DNSNames: []string{"raft-" + member + ".terrania.internal"},
		URIs: []*url.URL{spiffe},
		KeyUsage: x509.KeyUsageDigitalSignature,
		ExtKeyUsage: usages,
	}
	leaf, err := x509.CreateCertificate(rand.Reader, template, ca.cert, signer.Public(), ca.key)
	if err != nil {
		t.Fatal(err)
	}
	cert.Certificate = [][]byte{leaf, ca.cert.Raw}
	return cert
}

func TestRaftLabLocalIdentityMustBeTrustedBeforeOpeningNetworkTransport(t *testing.T) {
	ca := makeLabCA(t)
	other := makeLabCA(t)
	valid := ca.sign(t,"node-a")
	now := time.Now()
	brokenKey := valid
	brokenKey.PrivateKey = ca.sign(t,"node-b").PrivateKey
	missingKey := valid
	missingKey.PrivateKey = nil
	brokenLeaf := valid
	brokenLeaf.Certificate = [][]byte{[]byte("not an X509 certificate"),ca.cert.Raw}
	cases := []struct{
		name string
		id string
		identity tls.Certificate
		roots *x509.CertPool
		allow bool
	}{
		{name:"valid identity",id:"node-a",identity:valid,roots:ca.roots,allow:true},
		{name:"wrong own member ID",id:"node-b",identity:valid,roots:ca.roots},
		{name:"untrusted local CA",id:"node-a",identity:valid,roots:other.roots},
		{name:"private key not matching certificate",id:"node-a",identity:brokenKey,roots:ca.roots},
		{name:"no private key",id:"node-a",identity:missingKey,roots:ca.roots},
		{name:"corrupted leaf",id:"node-a",identity:brokenLeaf,roots:ca.roots},
		{name:"expired certificate",id:"node-a",
			identity:laboratoryLeaf(t,ca,"node-a",now.Add(-2*time.Hour),now.Add(-time.Hour),
				[]x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth,x509.ExtKeyUsageServerAuth},raftPeerURI("node-a")),
			roots:ca.roots},
		{name:"missing client authentication EKU",id:"node-a",
			identity:laboratoryLeaf(t,ca,"node-a",now.Add(-time.Hour),now.Add(time.Hour),
				[]x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},raftPeerURI("node-a")),
			roots:ca.roots},
		{name:"missing server authentication EKU",id:"node-a",
			identity:laboratoryLeaf(t,ca,"node-a",now.Add(-time.Hour),now.Add(time.Hour),
				[]x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},raftPeerURI("node-a")),
			roots:ca.roots},
		{name:"wrong SPIFFE URI",id:"node-a",
			identity:laboratoryLeaf(t,ca,"node-a",now.Add(-time.Hour),now.Add(time.Hour),
				[]x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth,x509.ExtKeyUsageClientAuth},raftPeerURI("node-b")),
			roots:ca.roots},
	}
	for _,tc := range cases {
		t.Run(tc.name,func(t *testing.T){
			l := listenLab(t)
			layer,err := NewLoopbackTLSLayer(l,tc.id,tc.identity,tc.roots,
				map[raft.ServerAddress]string{"127.0.0.1:29999":"node-b"})
			if tc.allow {
				if err!=nil{t.Fatalf("valid TLS identity rejected: %v",err)}
				if err:=layer.Close();err!=nil{t.Fatal(err)}
				return
			}
			if !errors.Is(err,ErrRaftPeerIdentity) {
				if layer!=nil{_ = layer.Close()}
				t.Fatalf("invalid TLS identity was permitted: %v",err)
			}
			// The caller owns the listener on validation failure.
			if _,err:=net.DialTimeout("tcp",l.Addr().String(),20*time.Millisecond);err!=nil{
				t.Fatalf("pre-startup validation unexpectedly took ownership of listener: %v",err)
			}
		})
	}
}
