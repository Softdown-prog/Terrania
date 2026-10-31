package raftlab

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/hashicorp/raft"
)

var ErrRaftPeerIdentity = errors.New("unauthorized raft peer TLS identity")

// TLSLayer implements raft.StreamLayer for explicitly configured peers.
// It supports ONLY loopback listeners in this experimental module and is
// never mounted by production. Certificates must be provisioned externally.
// A valid CA signature alone does not grant membership: every peer needs a
// registered address and an exact SPIFFE URI SAN.
//
// Unlike a production deployment this lab has no certificate rotation,
// revocation, remote addresses or enrollment protocol.
type TLSLayer struct {
	listener net.Listener
	server   *tls.Config
	client   *tls.Config
	peers    map[raft.ServerAddress]string
	allowed  map[string]struct{}
	mu       sync.Mutex
	closed   bool
}

func raftPeerURI(id string) string {
	return "spiffe://terrania.internal/raft/" + id
}

func peerID(cs tls.ConnectionState) (string, error) {
	if len(cs.VerifiedChains) == 0 || len(cs.PeerCertificates) != 1 {
		// Normally PeerCertificates includes the leaf and possibly issuing
		// intermediates; only leaf URI SAN should be inspected below.
		if len(cs.VerifiedChains) == 0 || len(cs.PeerCertificates) == 0 {
			return "", ErrRaftPeerIdentity
		}
	}
	cert := cs.PeerCertificates[0]
	if len(cert.URIs) != 1 {
		return "", ErrRaftPeerIdentity
	}
	u := cert.URIs[0]
	if u == nil || u.Scheme != "spiffe" || u.Host != "terrania.internal" ||
		u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.RawPath != "" {
		return "", ErrRaftPeerIdentity
	}
	const prefix = "/raft/"
	if len(u.Path) <= len(prefix) || u.Path[:len(prefix)] != prefix {
		return "", ErrRaftPeerIdentity
	}
	id := u.Path[len(prefix):]
	if !validName(id) || u.String() != raftPeerURI(id) {
		return "", ErrRaftPeerIdentity
	}
	return id, nil
}

// NewLoopbackTLSLayer refuses public binding and unknown members. TLS 1.3,
// chain verification, DNS SAN verification and strict SPIFFE URI verification
// are all required for a connection. DNS is never used to discover peers.
func NewLoopbackTLSLayer(listener net.Listener, ownID string, ownCert tls.Certificate, roots *x509.CertPool, roster map[raft.ServerAddress]string) (*TLSLayer, error) {
	if listener == nil || !validName(ownID) || roots == nil || len(ownCert.Certificate) == 0 || len(roster) == 0 {
		return nil, ErrRaftPeerIdentity
	}
	tcp, ok := listener.Addr().(*net.TCPAddr)
	if !ok || tcp.IP == nil || !tcp.IP.IsLoopback() {
		return nil, ErrRaftPeerIdentity
	}
	peers := make(map[raft.ServerAddress]string, len(roster))
	allowed := make(map[string]struct{}, len(roster))
	for address, id := range roster {
		if address == "" || !validName(id) || id == ownID {
			return nil, ErrRaftPeerIdentity
		}
		host, _, err := net.SplitHostPort(string(address))
		if err != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
			return nil, ErrRaftPeerIdentity
		}
		if _, duplicate := allowed[id]; duplicate {
			return nil, ErrRaftPeerIdentity
		}
		peers[address] = id
		allowed[id] = struct{}{}
	}
	server := &tls.Config{
		MinVersion:   tls.VersionTLS13,
		Certificates: []tls.Certificate{ownCert},
		ClientCAs:    roots,
		ClientAuth:   tls.RequireAndVerifyClientCert,
		VerifyConnection: func(cs tls.ConnectionState) error {
			id, err := peerID(cs)
			if err != nil {
				return err
			}
			if _, ok := allowed[id]; !ok {
				return ErrRaftPeerIdentity
			}
			return nil
		},
	}
	client := &tls.Config{
		MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{ownCert},
		RootCAs: roots,
	}
	return &TLSLayer{listener: listener, server: server, client: client,
		peers: peers, allowed: allowed}, nil
}

// Accept performs the full mutually authenticated handshake BEFORE Raft ever
// decodes an RPC. Malformed/mismatched clients are dropped, not passed through.
func (l *TLSLayer) Accept() (net.Conn, error) {
	for {
		conn, err := l.listener.Accept()
		if err != nil {
			return nil, err
		}
		secure := tls.Server(conn, l.server)
		_ = secure.SetDeadline(time.Now().Add(2 * time.Second))
		if err := secure.Handshake(); err != nil {
			_ = secure.Close()
			continue
		}
		_ = secure.SetDeadline(time.Time{})
		return secure, nil
	}
}

func (l *TLSLayer) Dial(address raft.ServerAddress, timeout time.Duration) (net.Conn, error) {
	if timeout <= 0 {
		return nil, ErrRaftPeerIdentity
	}
	id, ok := l.peers[address]
	if !ok {
		return nil, ErrRaftPeerIdentity
	}
	l.mu.Lock()
	closed := l.closed
	l.mu.Unlock()
	if closed {
		return nil, ErrRaftPeerIdentity
	}
	conf := l.client.Clone()
	conf.ServerName = "raft-" + id + ".terrania.internal"
	conf.VerifyConnection = func(cs tls.ConnectionState) error {
		actual, err := peerID(cs)
		if err != nil || actual != id {
			return ErrRaftPeerIdentity
		}
		return nil
	}
	dialer := &net.Dialer{Timeout: timeout}
	conn, err := tls.DialWithDialer(dialer, "tcp", string(address), conf)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRaftPeerIdentity, err)
	}
	return conn, nil
}

func (l *TLSLayer) Addr() net.Addr { return l.listener.Addr() }
func (l *TLSLayer) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return nil
	}
	l.closed = true
	return l.listener.Close()
}

var _ raft.StreamLayer = (*TLSLayer)(nil)
