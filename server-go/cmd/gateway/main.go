package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
	"github.com/Softdown-prog/Terrania/server-go/engine"
	"github.com/Softdown-prog/Terrania/server-go/presence"
)

func gatewayHandler(router *cluster.Router, allowed map[string]bool) http.Handler {
	return gatewayHandlerWithLobby(router,allowed,newLobby(1000,84,12))
}

func gatewayHandlerWithLobby(router *cluster.Router,allowed map[string]bool,l *lobby) http.Handler {
	mux:=http.NewServeMux()
	mux.HandleFunc("/presence", presence.Handler(allowed, "cluster", func(ctx context.Context) (int, int, error) {
		workers := make([]string, 0, router.Count())
		for _, node := range router.Backends() { workers = append(workers, node.URL.String()) }
		return presence.Collect(ctx, workers)
	}))
	mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request){
		w.Header().Set("Content-Type","application/json")
		w.Header().Set("Cache-Control","no-store")
		_ = json.NewEncoder(w).Encode(map[string]any{"status":"ok","gateway":"go","workers":router.Count()})
	})
	mux.HandleFunc("/capacity",func(w http.ResponseWriter,r *http.Request){
		if r.Method!=http.MethodGet {http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return}
		active,rooms:=l.status()
		w.Header().Set("Cache-Control","no-store")
		w.Header().Set("Content-Type","application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"active":active,"rooms":rooms,"maxClients":l.maxClients,
			"maxRooms":l.maxRooms,"roomSize":l.maxPerRoom,"workers":router.Count(),
			"scope":"single-gateway-admission-only",
		})
	})
	mux.HandleFunc("/ws",func(w http.ResponseWriter,r *http.Request){
		if r.Method!=http.MethodGet {http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return}
		if !allowed[r.Header.Get("Origin")]||r.Header.Get("Origin")=="" {
			http.Error(w,"forbidden origin",http.StatusForbidden);return
		}
		if !strings.EqualFold(r.Header.Get("Upgrade"),"websocket") {
			http.Error(w,"websocket required",http.StatusBadRequest);return
		}
		if len(r.URL.Query()["room"])>1 {http.Error(w,"duplicate room",http.StatusBadRequest);return}
		room:=r.URL.Query().Get("room")
		if room=="" {room="origins"}
		if !engine.ValidRoom(room) {http.Error(w,"invalid room",http.StatusBadRequest);return}
		allocated,release,err:=l.acquire(room)
		if err!=nil {http.Error(w,"no available room seats",http.StatusServiceUnavailable);return}
		defer release() // reverse proxy blocks until WebSocket closes.
		q:=r.URL.Query()
		q.Set("room",allocated)
		r.URL.RawQuery=q.Encode()
		node:=router.Pick(allocated)
		// Fixed, admin-controlled upstream only. No URL in the client can override it.
		proxy:=httputil.NewSingleHostReverseProxy(node.URL)
		proxy.FlushInterval=-1
		proxy.ErrorHandler=func(w http.ResponseWriter,_ *http.Request,err error){
			log.Printf("shard %s unavailable: %v",node.ID,err)
			http.Error(w,"room server unavailable; reconnect later",http.StatusServiceUnavailable)
		}
		proxy.ServeHTTP(w,r)
	})
	return mux
}

func main(){
	port:=os.Getenv("GATEWAY_PORT")
	if port=="" {port="8790"}
	n,err:=strconv.Atoi(port)
	if err!=nil||n<1||n>65535 {log.Fatal("invalid GATEWAY_PORT")}
	router,err:=cluster.NewRouter(os.Getenv("GO_SHARDS"))
	if err!=nil {log.Fatal(err)}
	origins:=os.Getenv("ALLOWED_ORIGINS")
	if strings.TrimSpace(origins)=="" {log.Fatal("ALLOWED_ORIGINS is required")}
	allowed:=map[string]bool{}
	for _,origin:=range strings.Split(origins,","){
		if o:=strings.TrimSpace(origin);o!="" {allowed[o]=true}
	}
	maxPlayers,err:=capacityEnv("GATEWAY_MAX_CLIENTS",1000,10000)
	if err!=nil {log.Fatal(err)}
	maxRooms,err:=capacityEnv("GATEWAY_MAX_ROOMS",84,10000)
	if err!=nil {log.Fatal(err)}
	srv:=&http.Server{Addr:":"+port,Handler:gatewayHandlerWithLobby(router,allowed,newLobby(maxPlayers,maxRooms,12)),
		ReadHeaderTimeout:5*time.Second}
	log.Printf("Terrania Go gateway listening on :%s with %d workers",port,router.Count())
	log.Fatal(srv.ListenAndServe())
}


func capacityEnv(name string,standard,ceiling int)(int,error) {
	value:=os.Getenv(name)
	if value=="" {return standard,nil}
	n,err:=strconv.Atoi(value)
	if err!=nil||n<1||n>ceiling {return 0,fmt.Errorf("%s must be 1..%d",name,ceiling)}
	return n,nil
}
