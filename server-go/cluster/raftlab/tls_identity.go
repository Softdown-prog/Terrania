package raftlab

import (
	"bytes"
	"crypto"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"time"
)

// checkLocalRaftIdentity fails at STARTUP rather than allowing a Raft member
// with a wrong, expired, untrusted, or unmatched identity to participate in
// the laboratory. Passing a CA pool does not grant membership by itself.
//
// This check is separate from the mTLS peer verification, which continues to
// be required on every connection.
func checkLocalRaftIdentity(id string, certificate tls.Certificate, roots *x509.CertPool) error {
	if !validName(id) || roots == nil || certificate.PrivateKey == nil ||
		len(certificate.Certificate) == 0 {
		return ErrRaftPeerIdentity
	}
	signer, ok := certificate.PrivateKey.(crypto.Signer)
	if !ok {
		return ErrRaftPeerIdentity
	}
	leaf, err := x509.ParseCertificate(certificate.Certificate[0])
	if err != nil {
		return fmt.Errorf("%w: invalid local leaf: %v", ErrRaftPeerIdentity, err)
	}
	publicDER, err := x509.MarshalPKIXPublicKey(signer.Public())
	if err != nil {
		return ErrRaftPeerIdentity
	}
	// A manually assembled tls.Certificate may otherwise contain a leaf and
	// private key belonging to different entities.
	leafDER, err := x509.MarshalPKIXPublicKey(leaf.PublicKey)
	if err != nil || !bytes.Equal(publicDER, leafDER) {
		return ErrRaftPeerIdentity
	}
	if len(leaf.URIs) != 1 || leaf.URIs[0] == nil ||
		leaf.URIs[0].String() != raftPeerURI(id) {
		return ErrRaftPeerIdentity
	}
	// The DNS SAN, not Common Name, must match this member's exact identity.
	intermediates := x509.NewCertPool()
	for _, der := range certificate.Certificate[1:] {
		cert, err := x509.ParseCertificate(der)
		if err != nil {
			return ErrRaftPeerIdentity
		}
		intermediates.AddCert(cert)
	}
	name := "raft-" + id + ".terrania.internal"
	for _, usage := range []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth} {
		if _, err := leaf.Verify(x509.VerifyOptions{
			Roots: roots, Intermediates: intermediates, DNSName: name,
			CurrentTime: time.Now(), KeyUsages: []x509.ExtKeyUsage{usage},
		}); err != nil {
			return fmt.Errorf("%w: local TLS identity not trusted for both roles: %v", ErrRaftPeerIdentity, err)
		}
	}
	return nil
}
