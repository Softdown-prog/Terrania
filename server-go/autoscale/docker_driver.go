package autoscale

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

const workerLabel = "io.terrania.autoscale.worker-id"
const managedLabel = "io.terrania.autoscale.role"
const workerRole = "game-worker"
const dockerAPIVersion = "/v1.41"

var workerIDPattern = regexp.MustCompile(`^as-worker-[0-9]{4}$`)
var dockerIDPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)
var pinnedImagePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$`)

var ErrWorkerNotReady = errors.New("Terrania worker is not Docker-healthy")
var ErrDockerOwnership = errors.New("Docker container is not an owned Terrania autoscale worker")
var ErrDockerConfig = errors.New("invalid isolated Docker worker configuration")

// DockerOptions are provisioned ONLY by a trusted local controller, never a
// client or an unauthenticated HTTP API. This adapter has Docker privileges.
type DockerOptions struct {
	SocketPath string
	Image string // immutable, digest-pinned image
	Network string // dedicated internal network, attached also to the gateway
	AllowedOrigins string
	CPUMilli int
	MemoryMiB int
	MaxClients int
	MaxRooms int
}

func (o DockerOptions) Validate() error {
	if o.SocketPath != "/var/run/docker.sock" && o.SocketPath != "/run/docker.sock" {
		return fmt.Errorf("%w: only the local Docker Unix socket is allowed",ErrDockerConfig)
	}
	if !pinnedImagePattern.MatchString(o.Image) || !regexp.MustCompile(`^terrania-[a-z0-9-]{1,42}$`).MatchString(o.Network) {
		return fmt.Errorf("%w: immutable image digest and dedicated terrania-* network required",ErrDockerConfig)
	}
	if o.CPUMilli < 100 || o.CPUMilli > 4000 || o.MemoryMiB < 64 || o.MemoryMiB > 4096 ||
		o.MaxClients < 1 || o.MaxClients > 10000 || o.MaxRooms < 1 || o.MaxRooms > 10000 {
		return fmt.Errorf("%w: unsafe CPU/RAM or worker capacity limits",ErrDockerConfig)
	}
	if len(o.AllowedOrigins) > 1024 || len(o.AllowedOrigins) == 0 {
		return fmt.Errorf("%w: explicit allowed origins are required",ErrDockerConfig)
	}
	for _, entry := range strings.Split(o.AllowedOrigins,",") {
		u,err := url.Parse(strings.TrimSpace(entry))
		if err != nil || u == nil || u.Scheme != "https" || u.Host == "" || u.User != nil ||
			u.RawQuery != "" || u.Fragment != "" || u.Path != "" {
			return fmt.Errorf("%w: origins must be exact HTTPS origins",ErrDockerConfig)
		}
	}
	return nil
}

type DockerDriver struct {
	options DockerOptions
	client *http.Client
}

func NewDockerDriver(options DockerOptions) (*DockerDriver,error) {
	if err := options.Validate(); err != nil { return nil,err }
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn,error) {
			return (&net.Dialer{Timeout:3*time.Second}).DialContext(ctx,"unix",options.SocketPath)
		},
		DisableKeepAlives: true,
	}
	return &DockerDriver{options:options,client:&http.Client{Transport:transport,Timeout:8*time.Second}},nil
}

func (d *DockerDriver) request(ctx context.Context, method, path string, input any, output any) error {
	if d == nil || d.client == nil { return ErrDockerConfig }
	var body io.Reader
	if input != nil {
		raw,err := json.Marshal(input)
		if err != nil { return err }
		body = bytes.NewReader(raw)
	}
	req,err := http.NewRequestWithContext(ctx,method,"http://docker"+dockerAPIVersion+path,body)
	if err != nil { return err }
	if input != nil {req.Header.Set("Content-Type","application/json")}
	res,err := d.client.Do(req)
	if err != nil { return err }
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("docker %s returned HTTP %d",method,res.StatusCode)
	}
	if output == nil { _,_ = io.Copy(io.Discard,io.LimitReader(res.Body,4096));return nil }
	return json.NewDecoder(io.LimitReader(res.Body,65536)).Decode(output)
}

func workerName(id string) string {return "terrania-"+id}

// Create generates an isolated container with NO public port, NO privileged
// mode, readonly rootfs and bounded CPU, memory, pids and file capabilities.
// It never builds/pulls images or launches a shell.
func (d *DockerDriver) Create(ctx context.Context, workerID string) (string,error) {
	if !workerIDPattern.MatchString(workerID) { return "",ErrDockerConfig }
	o := d.options
	labels := map[string]string{workerLabel:workerID,managedLabel:workerRole}
	type host struct {
		NetworkMode string
		NanoCpus int64
		Memory int64
		PidsLimit int64
		ReadonlyRootfs bool
		CapDrop []string
		SecurityOpt []string
		Tmpfs map[string]string
		PublishAllPorts bool
	}
	payload := struct {
		Image string
		Labels map[string]string
		Env []string
		HostConfig host
	}{
		Image:o.Image,Labels:labels,
		Env:[]string{
			"PORT=8788","NODE_ENV=production","ALLOWED_ORIGINS="+o.AllowedOrigins,
			"MAX_CLIENTS="+strconv.Itoa(o.MaxClients),"MAX_ROOMS="+strconv.Itoa(o.MaxRooms),
		},
		HostConfig:host{
			NetworkMode:o.Network, NanoCpus:int64(o.CPUMilli)*1000000,Memory:int64(o.MemoryMiB)*1048576,
			PidsLimit:64,ReadonlyRootfs:true,CapDrop:[]string{"ALL"},SecurityOpt:[]string{"no-new-privileges"},
			Tmpfs:map[string]string{"/tmp":"rw,noexec,nosuid,size=8m"},PublishAllPorts:false,
		},
	}
	var created struct{ ID string }
	if err := d.request(ctx,http.MethodPost,"/containers/create?name="+url.QueryEscape(workerName(workerID)),payload,&created);err!=nil {return "",err}
	if !dockerIDPattern.MatchString(created.ID) {return "",errors.New("Docker returned an invalid container ID")}
	return created.ID,nil
}

func (d *DockerDriver) inspect(ctx context.Context, workerID, containerID string) (struct{
	ID string
	Name string
	Config struct{Labels map[string]string}
	State struct{Running bool;Health *struct{Status string}}
	NetworkSettings struct{Networks map[string]struct{IPAddress string}}
},error) {
	var info struct{
		ID string
		Name string
		Config struct{Labels map[string]string}
		State struct{Running bool;Health *struct{Status string}}
		NetworkSettings struct{Networks map[string]struct{IPAddress string}}
	}
	if !workerIDPattern.MatchString(workerID) || !dockerIDPattern.MatchString(containerID) {return info,ErrDockerOwnership}
	err := d.request(ctx,http.MethodGet,"/containers/"+containerID+"/json",nil,&info)
	if err!=nil {return info,err}
	if info.ID != containerID || info.Name != "/"+workerName(workerID) ||
		info.Config.Labels[workerLabel] != workerID || info.Config.Labels[managedLabel] != workerRole {
		return info,ErrDockerOwnership
	}
	return info,nil
}

func (d *DockerDriver) Start(ctx context.Context,workerID,containerID string) error {
	if _,err:=d.inspect(ctx,workerID,containerID);err!=nil {return err}
	return d.request(ctx,http.MethodPost,"/containers/"+containerID+"/start",nil,nil)
}

// ReadyBackend requires a matching Docker HEALTHY state and an internal IP on
// the explicitly configured Terrania network; no host port is published.
func (d *DockerDriver) ReadyBackend(ctx context.Context,workerID,containerID string)(cluster.Backend,error){
	info,err:=d.inspect(ctx,workerID,containerID)
	if err!=nil {return cluster.Backend{},err}
	if !info.State.Running || info.State.Health==nil || info.State.Health.Status!="healthy" {
		return cluster.Backend{},ErrWorkerNotReady
	}
	netInfo,ok:=info.NetworkSettings.Networks[d.options.Network]
	if !ok || net.ParseIP(netInfo.IPAddress)==nil {return cluster.Backend{},ErrWorkerNotReady}
	u:=&url.URL{Scheme:"http",Host:net.JoinHostPort(netInfo.IPAddress,"8788")}
	return cluster.Backend{ID:workerID,URL:u},nil
}

// StopAndRemove requires the exact local container ID and ownership labels.
// The coordinator MUST remove the drained worker from admissions FIRST.
func (d *DockerDriver) StopAndRemove(ctx context.Context,workerID,containerID string)error{
	info,err:=d.inspect(ctx,workerID,containerID)
	if err!=nil {return err}
	if info.State.Running {
		if err:=d.request(ctx,http.MethodPost,"/containers/"+containerID+"/stop?t=10",nil,nil);err!=nil {return err}
	}
	if _,err:=d.inspect(ctx,workerID,containerID);err!=nil {return err}
	return d.request(ctx,http.MethodDelete,"/containers/"+containerID+"?force=false&v=false",nil,nil)
}
