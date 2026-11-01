package raftlab

import (
	"crypto/x509"
	"encoding/pem"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func writePrivateRaftTestIdentity(t *testing.T)(string,string){
	t.Helper()
	ca:=makeLabCA(t)
	member:="node-a"
	root:=filepath.Join(t.TempDir(),"raft-members")
	if err:=os.Mkdir(root,0700);err!=nil{t.Fatal(err)}
	dir:=filepath.Join(root,member)
	if err:=os.Mkdir(dir,0700);err!=nil{t.Fatal(err)}
	certificate:=ca.sign(t,member)
	var certPEM []byte
	for _,der:=range certificate.Certificate{
		certPEM=append(certPEM,pem.EncodeToMemory(&pem.Block{Type:"CERTIFICATE",Bytes:der})...)
	}
	keyDER,err:=x509.MarshalPKCS8PrivateKey(certificate.PrivateKey)
	if err!=nil{t.Fatal(err)}
	files:=map[string][]byte{
		filepath.Join(root,"ca.pem"):pem.EncodeToMemory(&pem.Block{Type:"CERTIFICATE",Bytes:ca.cert.Raw}),
		filepath.Join(dir,"cert.pem"):certPEM,
		filepath.Join(dir,"key.pem"):pem.EncodeToMemory(&pem.Block{Type:"PRIVATE KEY",Bytes:keyDER}),
	}
	for path,content:=range files{
		if err:=os.WriteFile(path,content,0600);err!=nil{t.Fatal(err)}
	}
	return root,member
}

func TestRaftLabPrivateCredentialReaderRejectsUnsafeFilesystem(t *testing.T){
	actions:=[]struct{
		name string
		tamper func(*testing.T,string,string)
	}{
		{"world-readable private key",func(t *testing.T,root,id string){
			if err:=os.Chmod(filepath.Join(root,id,"key.pem"),0644);err!=nil{t.Fatal(err)}
		}},
		{"world-readable certificate",func(t *testing.T,root,id string){
			if err:=os.Chmod(filepath.Join(root,id,"cert.pem"),0644);err!=nil{t.Fatal(err)}
		}},
		{"insecure root directory",func(t *testing.T,root,id string){
			if err:=os.Chmod(root,0755);err!=nil{t.Fatal(err)}
		}},
		{"insecure member directory",func(t *testing.T,root,id string){
			if err:=os.Chmod(filepath.Join(root,id),0750);err!=nil{t.Fatal(err)}
		}},
		{"missing CA",func(t *testing.T,root,id string){
			if err:=os.Remove(filepath.Join(root,"ca.pem"));err!=nil{t.Fatal(err)}
		}},
		{"missing member key",func(t *testing.T,root,id string){
			if err:=os.Remove(filepath.Join(root,id,"key.pem"));err!=nil{t.Fatal(err)}
		}},
		{"CA symbolic link",func(t *testing.T,root,id string){
			file:=filepath.Join(root,"ca.pem")
			if err:=os.Rename(file,file+".saved");err!=nil{t.Fatal(err)}
			if err:=os.Symlink(file+".saved",file);err!=nil{t.Fatal(err)}
		}},
		{"member private key symbolic link",func(t *testing.T,root,id string){
			file:=filepath.Join(root,id,"key.pem")
			if err:=os.Rename(file,file+".saved");err!=nil{t.Fatal(err)}
			if err:=os.Symlink(file+".saved",file);err!=nil{t.Fatal(err)}
		}},
		{"member certificate symbolic link",func(t *testing.T,root,id string){
			file:=filepath.Join(root,id,"cert.pem")
			if err:=os.Rename(file,file+".saved");err!=nil{t.Fatal(err)}
			if err:=os.Symlink(file+".saved",file);err!=nil{t.Fatal(err)}
		}},
		{"member directory symbolic link",func(t *testing.T,root,id string){
			dir:=filepath.Join(root,id)
			if err:=os.Rename(dir,dir+".saved");err!=nil{t.Fatal(err)}
			if err:=os.Symlink(dir+".saved",dir);err!=nil{t.Fatal(err)}
		}},
		{"wrong trust anchor",func(t *testing.T,root,id string){
			other:=makeLabCA(t)
			encoded:=pem.EncodeToMemory(&pem.Block{Type:"CERTIFICATE",Bytes:other.cert.Raw})
			if err:=os.WriteFile(filepath.Join(root,"ca.pem"),encoded,0600);err!=nil{t.Fatal(err)}
		}},
		{"wrong member leaf",func(t *testing.T,root,id string){
			// Keep the node-a private key and replace its leaf with a
			// different, independently signed node-b certificate.
			other:=makeLabCA(t)
			cert:=other.sign(t,"node-b")
			var encoded []byte
			for _,der:=range cert.Certificate{
				encoded=append(encoded,pem.EncodeToMemory(&pem.Block{Type:"CERTIFICATE",Bytes:der})...)
			}
			if err:=os.WriteFile(filepath.Join(root,id,"cert.pem"),encoded,0600);err!=nil{t.Fatal(err)}
		}},
	}
	for _,tc:=range actions{
		t.Run(tc.name,func(t *testing.T){
			root,id:=writePrivateRaftTestIdentity(t)
			if _,_,err:=ReadPrivateRaftIdentity(root,id);err!=nil{
				t.Fatalf("valid initial identity rejected: %v",err)
			}
			tc.tamper(t,root,id)
			if _,_,err:=ReadPrivateRaftIdentity(root,id);!errors.Is(err,ErrRaftPeerIdentity){
				t.Fatalf("unsafe identity was loaded: %v",err)
			}
		})
	}
}

func TestRaftLabPrivateCredentialReaderRequiresAbsoluteRootAndExactMember(t *testing.T){
	root,id:=writePrivateRaftTestIdentity(t)
	cert,roots,err:=ReadPrivateRaftIdentity(root,id)
	if err!=nil||roots==nil||len(cert.Certificate)==0{t.Fatalf("valid local credentials rejected: %v",err)}
	for _,tc:=range []struct{root,id string}{
		{".",id},{root,"../node-a"},{root,"unlisted"},{root,""},
	}{
		if _,_,err:=ReadPrivateRaftIdentity(tc.root,tc.id);!errors.Is(err,ErrRaftPeerIdentity){
			t.Fatalf("invalid credential path was accepted %q/%q: %v",tc.root,tc.id,err)
		}
	}
}
