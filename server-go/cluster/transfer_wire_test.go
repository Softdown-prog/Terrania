package cluster

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"testing"
	"time"
)

func signedTestCertificate(t *testing.T, ca *x509.Certificate, key *ecdsa.PrivateKey, serial int64, worker string, server bool) tls.Certificate {
	t.Helper()
	leafKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	spec := &x509.Certificate{
		SerialNumber: big.NewInt(serial), NotBefore: time.Now().Add(-time.Hour),
		NotAfter: time.Now().Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
	}
	if server {
		spec.ExtKeyUsage = []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
		spec.DNSNames = []string{"localhost"}
		spec.IPAddresses = []net.IP{net.ParseIP("127.0.0.1")}
	} else {
		spec.ExtKeyUsage = []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
		identity := "spiffe://terrania.internal/worker/" + worker
		if worker == "control" {
			identity = "spiffe://terrania.internal/coordinator/control"
		}
		uri, err := url.Parse(identity)
		if err != nil {
			t.Fatal(err)
		}
		spec.URIs = []*url.URL{uri}
	}
	der, err := x509.CreateCertificate(rand.Reader, spec, ca, &leafKey.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	priv, err := x509.MarshalPKCS8PrivateKey(leafKey)
	if err != nil {
		t.Fatal(err)
	}
	cert, err := tls.X509KeyPair(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}),
		pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: priv}))
	if err != nil {
		t.Fatal(err)
	}
	return cert
}

func testMutualTLS(t *testing.T, h http.Handler) (*httptest.Server, func(string) *http.Client) {
	t.Helper()
	caKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	ca := &x509.Certificate{
		SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "Terrania test-only root"},
		NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour),
		IsCA: true, BasicConstraintsValid: true,
		KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, ca, ca, &caKey.PublicKey, caKey)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := x509.ParseCertificate(caDER)
	if err != nil {
		t.Fatal(err)
	}
	roots := x509.NewCertPool()
	roots.AddCert(parsed)
	serverCert := signedTestCertificate(t, parsed, caKey, 2, "", true)
	clients := map[string]tls.Certificate{
		"east":    signedTestCertificate(t, parsed, caKey, 3, "east", false),
		"west":    signedTestCertificate(t, parsed, caKey, 4, "west", false),
		"center":  signedTestCertificate(t, parsed, caKey, 5, "center", false),
		"control": signedTestCertificate(t, parsed, caKey, 6, "control", false),
	}
	server := httptest.NewUnstartedServer(h)
	server.TLS = &tls.Config{
		MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{serverCert},
		ClientAuth: tls.RequireAndVerifyClientCert, ClientCAs: roots,
	}
	server.StartTLS()
	t.Cleanup(server.Close)
	return server, func(id string) *http.Client {
		transport := &http.Transport{
			TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: roots},
		}
		if cert, exists := clients[id]; exists {
			transport.TLSClientConfig.Certificates = []tls.Certificate{cert}
		}
		client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
		t.Cleanup(client.CloseIdleConnections)
		return client
	}
}

func newWireTestTransfer(t *testing.T, d *RegionDirectory, p Province, from, to string, epoch uint64) (RegionSnapshotRequest, func()) {
	t.Helper()
	_, err := d.Register(p, from)
	if err != nil {
		t.Fatal(err)
	}
	s := RegionSnapshot{Version: RegionSnapshotVersion, Province: p, OldEpoch: epoch,
		Tick: 330, Sequence: 1, Payload: []byte("opaque and frozen application state")}
	ticket, err := d.Begin(p, from, to, epoch, s.Digest(), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	freeze := func() {
		t.Helper()
		if err := d.FreezeSource(ticket, time.Now()); err != nil {
			t.Fatal(err)
		}
	}
	return RegionSnapshotRequest{Ticket: ticket, Snapshot: s}, freeze
}

func TestRegionSnapshotDigestBindsMetadataAndPayload(t *testing.T) {
	s := RegionSnapshot{Version: RegionSnapshotVersion, Province: Province{1, -2}, OldEpoch: 2,
		Tick: 100, Sequence: 5, Payload: []byte("binary state")}
	hash := s.Digest()
	for _, change := range []func(*RegionSnapshot){
		func(s *RegionSnapshot) { s.Province.X++ },
		func(s *RegionSnapshot) { s.Province.Y++ },
		func(s *RegionSnapshot) { s.OldEpoch++ },
		func(s *RegionSnapshot) { s.Tick++ },
		func(s *RegionSnapshot) { s.Sequence++ },
		func(s *RegionSnapshot) { s.Version++ },
		func(s *RegionSnapshot) { s.Payload = []byte("other state") },
	} {
		snapshot := s
		change(&snapshot)
		if hash == snapshot.Digest() {
			t.Fatalf("digest did not bind metadata: %+v", snapshot)
		}
	}
	if err := s.Validate(); err != nil {
		t.Fatal(err)
	}
	s.Payload = nil
	if err := s.Validate(); !errors.Is(err, ErrSnapshotInvalid) {
		t.Fatal("accepted empty payload")
	}
}

func TestPrivateSnapshotHTTPSMutualTLSAndCommit(t *testing.T) {
	d := testDirectory(t)
	receiver, err := NewSnapshotReceiver(d, "west")
	if err != nil {
		t.Fatal(err)
	}
	srv, client := testMutualTLS(t, receiver)
	p := Province{X: -7, Y: 9}
	req, freeze := newWireTestTransfer(t, d, p, "east", "west", 1)
	if _, err := SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath, req); err == nil {
		t.Fatal("staged before source freeze")
	}
	freeze()
	receipt, err := SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath, req)
	if err != nil {
		t.Fatal(err)
	}
	if !receipt.Staged || receipt.Epoch != 2 || receipt.Bytes != len(req.Snapshot.Payload) {
		t.Fatalf("wrong ACK: %+v", receipt)
	}
	stored, ok := receiver.StagedCopy(p)
	if !ok || !bytes.Equal(stored.Payload, req.Snapshot.Payload) {
		t.Fatal("destination did not retain exact state")
	}
	stored.Payload[0] ^= 0xff
	another, _ := receiver.StagedCopy(p)
	if !bytes.Equal(another.Payload, req.Snapshot.Payload) {
		t.Fatal("caller mutated stored frame")
	}
	if _, err := SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath, req); err != nil {
		t.Fatalf("retry during staging must be idempotent: %v", err)
	}
	if d.CanSimulate(p, "east", 1) || d.CanSimulate(p, "west", 2) {
		t.Fatal("authoritative gameplay resumed during transfer")
	}
	if err := d.QuiesceSource(req.Ticket, time.Now()); err != nil {
		t.Fatal(err)
	}
	own, err := d.Commit(req.Ticket, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if own.WorkerID != "west" || own.Epoch != 2 || !d.CanSimulate(p, "west", 2) {
		t.Fatal("new owner was not fenced correctly")
	}
	if _, err := SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath, req); err == nil {
		t.Fatal("old committed transfer ticket replay accepted")
	}
}

func TestRegionTransferRejectsWrongCertificateCorruptedPayloadAndHTTP(t *testing.T) {
	d := testDirectory(t)
	receiver, err := NewSnapshotReceiver(d, "west")
	if err != nil {
		t.Fatal(err)
	}
	srv, client := testMutualTLS(t, receiver)
	p := Province{2, 5}
	req, freeze := newWireTestTransfer(t, d, p, "east", "west", 1)
	freeze()
	endpoint := srv.URL + RegionSnapshotPath
	if _, err := SendRegionSnapshot(context.Background(), client("west"), endpoint, req); err == nil {
		t.Fatal("certificate authenticated as wrong worker was accepted")
	}
	if _, err := SendRegionSnapshot(context.Background(), client("unknown"), endpoint, req); err == nil {
		t.Fatal("missing mTLS certificate was accepted")
	}
	if _, err := SendRegionSnapshot(context.Background(), client("east"), "http://localhost"+RegionSnapshotPath, req); err == nil {
		t.Fatal("plaintext transport accepted")
	}
	altered := req
	altered.Snapshot.Payload = []byte("corrupted")
	if _, err := SendRegionSnapshot(context.Background(), client("east"), endpoint, altered); err == nil {
		t.Fatal("corrupt digest escaped client validation")
	}
	altered = req
	altered.Ticket.Token = "stolen"
	if _, err := SendRegionSnapshot(context.Background(), client("east"), endpoint, altered); err == nil {
		t.Fatal("fake transfer token accepted")
	}
	// Raw HTTPS bypasses the sender's validation and tests the receiver.
	altered = req
	altered.Snapshot.Payload = []byte("corrupted")
	body, _ := json.Marshal(altered)
	r, err := client("east").Post(endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	_ = r.Body.Close()
	if r.StatusCode != http.StatusConflict {
		t.Fatalf("receiver accepted corrupt payload: %d", r.StatusCode)
	}
	if _, ok := receiver.StagedCopy(p); ok {
		t.Fatal("corrupted data was staged")
	}
}

func TestRegionSnapshotWireBudgetAndAuthenticationWithoutHandlerTLS(t *testing.T) {
	d := testDirectory(t)
	receiver, err := NewSnapshotReceiver(d, "west")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, RegionSnapshotPath, bytes.NewBufferString("{}"))
	out := httptest.NewRecorder()
	receiver.ServeHTTP(out, req)
	if out.Code != http.StatusForbidden {
		t.Fatalf("unverified TLS identity was trusted: %d", out.Code)
	}
	srv, client := testMutualTLS(t, receiver)
	p := Province{1, 1}
	good, freeze := newWireTestTransfer(t, d, p, "east", "west", 1)
	freeze()
	huge := good
	huge.Snapshot.Payload = make([]byte, MaxRegionSnapshotBytes+1)
	if _, err := SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath, huge); !errors.Is(err, ErrSnapshotTooLarge) {
		t.Fatalf("accepted oversized data %v", err)
	}
	resp, err := client("east").Post(srv.URL+RegionSnapshotPath, "application/json",
		bytes.NewReader(bytes.Repeat([]byte("x"), MaxRegionWireBytes+1)))
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("wire limit ineffective: %d", resp.StatusCode)
	}
}

func TestConcurrentPrivateSnapshotsBoundedByStagingBudget(t *testing.T) {
	d := testDirectory(t)
	receiver, err := NewSnapshotReceiver(d, "west")
	if err != nil {
		t.Fatal(err)
	}
	srv, client := testMutualTLS(t, receiver)
	const count = MaxStagedRegionSnapshots + 1
	var wg sync.WaitGroup
	results := make(chan error, count)

	for i := 0; i < count; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			p := Province{X: int64(i), Y: -1}
			owner, err := d.Register(p, "east")
			if err != nil {
				results <- err
				return
			}
			s := RegionSnapshot{Version: 1, Province: p, OldEpoch: owner.Epoch, Tick: 1,
				Sequence: 1, Payload: []byte(fmt.Sprintf("payload-%d", i))}
			ticket, err := d.Begin(p, "east", "west", owner.Epoch, s.Digest(), time.Now())
			if err != nil {
				results <- err
				return
			}
			if err := d.FreezeSource(ticket, time.Now()); err != nil {
				results <- err
				return
			}
			_, err = SendRegionSnapshot(context.Background(), client("east"), srv.URL+RegionSnapshotPath,
				RegionSnapshotRequest{Ticket: ticket, Snapshot: s})
			results <- err
		}(i)
	}
	wg.Wait()
	close(results)
	success, overBudget := 0, 0
	for err := range results {
		if err == nil {
			success++
		} else if err.Error() == "snapshot destination rejected transfer: HTTP 503" {
			overBudget++
		} else {
			t.Errorf("unexpected staging error: %v", err)
		}
	}
	if success != MaxStagedRegionSnapshots || overBudget != 1 {
		t.Fatalf("staging budget mismatch: success=%d rejected=%d", success, overBudget)
	}
}
