package raftlab

import (
	"crypto/ecdsa"
	"crypto/elliptic"
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

type labCA struct {
	roots *x509.CertPool
	cert  *x509.Certificate
	key   *ecdsa.PrivateKey
}

func makeLabCA(t *testing.T) *labCA {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	ca := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "Terrania offline test CA"},
		NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour),
		IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature}
	der, err := x509.CreateCertificate(rand.Reader, ca, ca, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatal(err)
	}
	roots := x509.NewCertPool()
	roots.AddCert(parsed)
	return &labCA{roots: roots, cert: parsed, key: key}
}
func (ca *labCA) sign(t *testing.T, id string) tls.Certificate {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	uri, err := url.Parse(raftPeerURI(id))
	if err != nil {
		t.Fatal(err)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(time.Now().UnixNano()),
		Subject:   pkix.Name{CommonName: "untrusted CN ignored"},
		NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour),
		DNSNames:    []string{"raft-" + id + ".terrania.internal"},
		URIs:        []*url.URL{uri},
		KeyUsage:    x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth}}
	der, err := x509.CreateCertificate(rand.Reader, template, ca.cert, &key.PublicKey, ca.key)
	if err != nil {
		t.Fatal(err)
	}
	return tls.Certificate{Certificate: [][]byte{der, ca.cert.Raw}, PrivateKey: key}
}

func listenLab(t *testing.T) net.Listener {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = l.Close() })
	return l
}

func TestRaftLabTLSMutualAuthenticationAndPeerIsolation(t *testing.T) {
	ca := makeLabCA(t)
	aListen, bListen := listenLab(t), listenLab(t)
	aAddress, bAddress := raft.ServerAddress(aListen.Addr().String()), raft.ServerAddress(bListen.Addr().String())
	a, err := NewLoopbackTLSLayer(aListen, "node-a", ca.sign(t, "node-a"), ca.roots, map[raft.ServerAddress]string{bAddress: "node-b"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := NewLoopbackTLSLayer(bListen, "node-b", ca.sign(t, "node-b"), ca.roots, map[raft.ServerAddress]string{aAddress: "node-a"})
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	defer b.Close()
	accepted := make(chan error, 1)
	go func() {
		conn, err := b.Accept()
		if err != nil {
			accepted <- err
			return
		}
		defer conn.Close()
		buf := make([]byte, 4)
		_, err = conn.Read(buf)
		if err == nil && string(buf) != "ping" {
			err = ErrRaftPeerIdentity
		}
		accepted <- err
	}()
	conn, err := a.Dial(bAddress, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Write([]byte("ping")); err != nil {
		t.Fatal(err)
	}
	_ = conn.Close()
	select {
	case err := <-accepted:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("authenticated listener never received traffic")
	}
	if _, err := a.Dial(raft.ServerAddress("127.0.0.1:1"), time.Second); !errors.Is(err, ErrRaftPeerIdentity) {
		t.Fatalf("unknown peer route was allowed: %v", err)
	}
}

func TestRaftLabTLSRejectsWrongPinnedServerAndUnknownClient(t *testing.T) {
	ca := makeLabCA(t)
	clientListener, serverListener := listenLab(t), listenLab(t)
	clientAddr, serverAddr := raft.ServerAddress(clientListener.Addr().String()), raft.ServerAddress(serverListener.Addr().String())
	client, err := NewLoopbackTLSLayer(clientListener, "node-a", ca.sign(t, "node-a"), ca.roots, map[raft.ServerAddress]string{serverAddr: "node-b"})
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	// The listening host has a cert signed by the trusted CA but NOT the
	// identity pinned for this address. TLS must reject it.
	server, err := NewLoopbackTLSLayer(serverListener, "node-c", ca.sign(t, "node-c"), ca.roots, map[raft.ServerAddress]string{clientAddr: "node-a"})
	if err != nil {
		t.Fatal(err)
	}
	defer server.Close()
	serveDone := make(chan struct{})
	go func() {
		defer close(serveDone)
		conn, err := server.Accept()
		if err == nil {
			_ = conn.Close()
		}
	}()
	if c, err := client.Dial(serverAddr, 800*time.Millisecond); err == nil {
		_ = c.Close()
		t.Fatal("trusted CA with WRONG node identity accepted")
	}
	_ = server.Close()
	select {
	case <-serveDone:
	case <-time.After(3 * time.Second):
		t.Fatal("accept did not exit after close")
	}
	// A CA-signed intruder may not enter the trusted peer roster.
	allowed := map[raft.ServerAddress]string{clientAddr: "node-a"}
	valid, err := NewLoopbackTLSLayer(listenLab(t), "node-b", ca.sign(t, "node-b"), ca.roots, allowed)
	if err != nil {
		t.Fatal(err)
	}
	defer valid.Close()
	intruder, err := NewLoopbackTLSLayer(listenLab(t), "intruder", ca.sign(t, "intruder"), ca.roots, map[raft.ServerAddress]string{
		raft.ServerAddress(valid.Addr().String()): "node-b",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer intruder.Close()
	done := make(chan error, 1)
	go func() {
		connection, err := valid.Accept()
		if err == nil {
			_ = connection.Close()
		}
		done <- err
	}()
	attacker, err := intruder.Dial(raft.ServerAddress(valid.Addr().String()), time.Second)
	if err == nil {
		_ = attacker.Close()
	}
	select {
	case err := <-done:
		t.Fatalf("unregistered client reached Accept: %v", err)
	case <-time.After(75 * time.Millisecond):
	}
	_ = valid.Close()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("listener failed to exit")
	}
}

func TestRaftLabTLSRejectsUntrustedRootsAndInvalidRoster(t *testing.T) {
	ca := makeLabCA(t)
	otherCA := makeLabCA(t)
	listener := listenLab(t)
	if layer, err := NewLoopbackTLSLayer(listener, "node-a", ca.sign(t, "node-a"), nil, map[raft.ServerAddress]string{
		"127.0.0.1:9999": "node-b",
	}); err == nil {
		_ = layer.Close()
		t.Fatal("missing root CA accepted")
	}
	if layer, err := NewLoopbackTLSLayer(listener, "node-a", ca.sign(t, "node-a"), otherCA.roots, map[raft.ServerAddress]string{
		"192.0.2.1:9999": "node-b",
	}); err == nil {
		_ = layer.Close()
		t.Fatal("non-loopback peer was accepted")
	}
	if layer, err := NewLoopbackTLSLayer(listener, "node-a", ca.sign(t, "node-a"), ca.roots, map[raft.ServerAddress]string{
		"127.0.0.1:9999": "node-a",
	}); err == nil {
		_ = layer.Close()
		t.Fatal("node may not peer with itself")
	}
}
