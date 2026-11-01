package raftlab

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"path/filepath"
)

// ReadPrivateRaftIdentity is a STRICT, offline-only reader for already
// provisioned laboratory credentials. It creates no keys and never modifies
// the certificates. Every component inside root must be a private regular
// file, not a symlink; callers must protect root's ancestor directories too.
//
// Root layout:
//  root/             mode 0700
//    ca.pem          mode 0600
//    member-id/      mode 0700
//      cert.pem      mode 0600
//      key.pem       mode 0600
func ReadPrivateRaftIdentity(root,id string)(tls.Certificate,*x509.CertPool,error){
	reject:=func(reason string)(tls.Certificate,*x509.CertPool,error){
		return tls.Certificate{},nil,fmt.Errorf("%w: %s",ErrRaftPeerIdentity,reason)
	}
	if !filepath.IsAbs(root)||!validName(id){return reject("invalid private credential root or member")}
	if err:=privateDirectory(root,false);err!=nil{return reject("invalid root directory")}
	memberDir:=filepath.Join(root,id)
	if err:=privateDirectory(memberDir,false);err!=nil{return reject("invalid member directory")}
	paths:=[]string{
		filepath.Join(root,"ca.pem"),
		filepath.Join(memberDir,"cert.pem"),
		filepath.Join(memberDir,"key.pem"),
	}
	for _,path:=range paths{
		info,err:=os.Lstat(path)
		if err!=nil||!info.Mode().IsRegular()||info.Mode().Perm()!=0600{
			return reject("unsafe or missing private certificate file")
		}
	}
	pemCA,err:=os.ReadFile(paths[0])
	if err!=nil||len(pemCA)==0||len(pemCA)>64*1024{
		return reject("invalid root CA")
	}
	pool:=x509.NewCertPool()
	if !pool.AppendCertsFromPEM(pemCA){return reject("invalid root CA PEM")}
	certificate,err:=tls.LoadX509KeyPair(paths[1],paths[2])
	if err!=nil{return reject("invalid member key pair")}
	if err:=checkLocalRaftIdentity(id,certificate,pool);err!=nil{
		return reject("local certificate does not match signed member identity")
	}
	return certificate,pool,nil
}
