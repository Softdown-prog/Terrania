package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net"
	"os"
	"os/signal"
	"syscall"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/Softdown-prog/Terrania/server-go/engine"
	"github.com/Softdown-prog/Terrania/server-go/presence"
)

type client struct {
	socket *websocket.Conn
	id string
	room *roomSession
	welcome engine.Welcome
	out chan *engine.Snapshot
	done chan struct{}
	count int
	windowStart time.Time
}

type gameServer struct {
	mu sync.Mutex
	rooms map[string]*roomSession
	ctx context.Context // set by run; guarded by s.mu
	clients map[*websocket.Conn]*client
	allowed map[string]bool
	revision string
	limits limits
	ticks atomic.Uint64
	tickOverruns atomic.Uint64
	lastTickNs atomic.Int64
	ready atomic.Bool // true only after the live 2-player probe in production
	nextName int
}

func newGameServer(allowed []string,revision string) *gameServer {
	return newGameServerWithLimits(allowed,revision,defaultLimits())
}

func newGameServerWithLimits(allowed []string,revision string,l limits) *gameServer {
	if err:=l.validate();err!=nil {panic(err)}
	s:=&gameServer{rooms:make(map[string]*roomSession),
		clients:make(map[*websocket.Conn]*client),allowed:make(map[string]bool),limits:l}
	for _,origin:=range allowed { if origin!="" { s.allowed[strings.TrimSpace(origin)]=true } }
	if regexp.MustCompile("^[0-9a-f]{40}$").MatchString(revision) { s.revision=revision }
	// In unit tests the HTTP handler is used without a real listener.
	s.ready.Store(true)
	return s
}

func (s *gameServer) handler() http.Handler {
	mux:=http.NewServeMux()
	mux.HandleFunc("/presence", presence.Handler(s.allowed, "server", func(context.Context) (int, int, error) {
		if !s.ready.Load() { return 0, 0, errors.New("engine warming up") }
		s.mu.Lock()
		defer s.mu.Unlock()
		return len(s.clients), len(s.rooms), nil
	}))
	mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request) {
		if r.Method!=http.MethodGet { http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return }
		w.Header().Set("Content-Type","application/json")
		w.Header().Set("Cache-Control","no-store")
		if !s.ready.Load() { http.Error(w,"engine warming up",http.StatusServiceUnavailable); return }
		var rev any
		if s.revision!="" { rev=s.revision }
		_ = json.NewEncoder(w).Encode(map[string]any{"status":"ok","revision":rev,"engine":"go"})
	})
	mux.HandleFunc("/status",func(w http.ResponseWriter,r *http.Request) {
		if r.Method!=http.MethodGet {http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return}
		s.mu.Lock()
		connected,rooms:=len(s.clients),len(s.rooms)
		var maxRoomTickNs int64
		for _,rs:=range s.rooms {
			if ns:=rs.lastTickNs.Load();ns>maxRoomTickNs {maxRoomTickNs=ns}
		}
		s.mu.Unlock()
		w.Header().Set("Content-Type","application/json")
		w.Header().Set("Cache-Control","no-store")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"engine":"go","revision":s.revision,"ready":s.ready.Load(),
			"connected":connected,"rooms":rooms,"maxClients":s.limits.clients,
			"maxRooms":s.limits.rooms,"maxRoomClients":s.limits.perRoom,
			"ticks":s.ticks.Load(),"tickOverruns":s.tickOverruns.Load(),
			"lastTickMs":float64(s.lastTickNs.Load())/1e6,
			"maxRoomTickMs":float64(maxRoomTickNs)/1e6,
			"tickScope":"completed-room-ticks",
		})
	})
	mux.HandleFunc("/ws",s.handleWS)
	return mux
}

func (s *gameServer) handleWS(w http.ResponseWriter,r *http.Request) {
	origin:=r.Header.Get("Origin")
	if origin==""||!s.allowed[origin] {
		http.Error(w,"forbidden",http.StatusForbidden);return
	}
	roomID:=r.URL.Query().Get("room")
	if roomID=="" { roomID="origins" }
	if !engine.ValidRoom(roomID) {
		http.Error(w,"invalid room",http.StatusTooManyRequests);return
	}
	s.mu.Lock()
	room:=s.rooms[roomID]
	full:=len(s.clients)>=s.limits.clients||
		(room==nil&&len(s.rooms)>=s.limits.rooms)||
		(room!=nil&&room.members>=s.limits.perRoom)
	s.mu.Unlock()
	if full { http.Error(w,"capacity reached",http.StatusServiceUnavailable);return }
	upgrader:=websocket.Upgrader{
		ReadBufferSize:512,WriteBufferSize:4096,
		EnableCompression:false,
		CheckOrigin:func(req *http.Request) bool { return s.allowed[req.Header.Get("Origin")] },
	}
	ws,err:=upgrader.Upgrade(w,r,nil)
	if err!=nil { return }
	var idBytes [16]byte
	if _,err=rand.Read(idBytes[:]);err!=nil { _=ws.Close();return }
	id:=hex.EncodeToString(idBytes[:])
	s.mu.Lock()
	room=s.rooms[roomID]
	if len(s.clients)>=s.limits.clients||
		(room==nil&&len(s.rooms)>=s.limits.rooms)||
		(room!=nil&&room.members>=s.limits.perRoom) {
		s.mu.Unlock()
		_ = ws.WriteControl(websocket.CloseMessage,websocket.FormatCloseMessage(1013,"capacity"),time.Now().Add(time.Second))
		_ = ws.Close()
		return
	}
	if room==nil {
		room=newRoomSession(roomID)
		s.rooms[roomID]=room
		if s.ctx!=nil {go s.runRoom(s.ctx,room)}
	}
	// Reserve the seat atomically under the *short* registry lock, then
	// release it BEFORE taking the room lock. A slow room must not delay
	// admissions, disconnections or status checks in unrelated rooms.
	room.members++
	s.nextName++
	c:=&client{socket:ws,id:id,room:room,welcome:engine.NewWelcome(id,roomID,room.room.Seed),out:make(chan *engine.Snapshot,1),done:make(chan struct{}),windowStart:time.Now()}
	s.clients[ws]=c
	name:="Aventureiro "+strconv.Itoa(s.nextName)
	s.mu.Unlock()
	room.mu.Lock()
	room.room.Add(id,name)
	room.clients[c]=struct{}{}
	room.mu.Unlock()
	go s.writePump(c)
	s.readPump(c)
}

func (s *gameServer) readPump(c *client) {
	defer s.leave(c)
	c.socket.SetReadLimit(engine.MaxInputBytes)
	_ = c.socket.SetReadDeadline(time.Now().Add(65*time.Second))
	c.socket.SetPongHandler(func(string) error {
		return c.socket.SetReadDeadline(time.Now().Add(65*time.Second))
	})
	for {
		messageType,data,err:=c.socket.ReadMessage()
		if err!=nil { return }
		now:=time.Now()
		// This connection has exactly one readPump; rate counters are local.
		if now.Sub(c.windowStart)>=time.Second {c.count=0;c.windowStart=now}
		c.count++
		excess:=c.count>35||messageType!=websocket.TextMessage
		if excess {
			_ = c.socket.WriteControl(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.ClosePolicyViolation,"input limit"),time.Now().Add(time.Second))
			return
		}
		in,err:=engine.ParseInput(data)
		if err!=nil {
			_ = c.socket.WriteControl(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.ClosePolicyViolation,"invalid input"),time.Now().Add(time.Second))
			return
		}
		c.room.mu.Lock()
		c.room.room.ReceiveInput(c.id,in,now)
		c.room.mu.Unlock()
	}
}

func (s *gameServer) leave(c *client) {
	s.mu.Lock()
	delete(s.clients,c.socket)
	c.room.members--
	if c.room.members==0 && s.rooms[c.room.room.ID]==c.room {
		delete(s.rooms,c.room.room.ID)
		close(c.room.stop) // no active/reserved seats remain
	}
	s.mu.Unlock()
	c.room.mu.Lock()
	c.room.room.Remove(c.id)
	delete(c.room.clients,c)
	c.room.mu.Unlock()
	close(c.done)
	_ = c.socket.Close()
}

func (s *gameServer) writePump(c *client) {
	// Send welcome first: never lose it when snapshots are congested.
	_ = c.socket.SetWriteDeadline(time.Now().Add(5*time.Second))
	if err:=c.socket.WriteJSON(c.welcome);err!=nil { _ = c.socket.Close(); return }
	ping:=time.NewTicker(30*time.Second)
	defer ping.Stop()
	for {
		select {
		case <-c.done: return
		case item:=<-c.out:
			_ = c.socket.SetWriteDeadline(time.Now().Add(5*time.Second))
			if err:=c.socket.WriteJSON(item);err!=nil { _=c.socket.Close();return }
		case <-ping.C:
			if err:=c.socket.WriteControl(websocket.PingMessage,nil,time.Now().Add(5*time.Second));err!=nil {
				_=c.socket.Close();return
			}
		}
	}
}

// Um unico loop autoritativo: 20 ticks/s, snapshots a cada dois ticks.
// Keep only the latest pending snapshot for slow connections.
func (c *client) enqueueSnapshot(state *engine.Snapshot) {
	select {
	case c.out<-state:
		return
	default:
	}
	select {
	case <-c.out:
	default:
	}
	select {
	case c.out<-state:
	default:
	}
}

// Run is a lifecycle coordinator only: it never holds the global registry
// mutex during simulation, physics, mob AI or network snapshot generation.
func (s *gameServer) run(ctx context.Context) {
	s.mu.Lock()
	if s.ctx!=nil {s.mu.Unlock();panic("gameServer.run called more than once")}
	s.ctx=ctx
	for _,room:=range s.rooms {go s.runRoom(ctx,room)}
	s.mu.Unlock()
	<-ctx.Done()
	s.mu.Lock()
	s.ctx=nil
	s.mu.Unlock()
}

func main() {
	port:=os.Getenv("PORT")
	if port=="" { port="8788" } // nao toma a porta 8787 do Node.
	n,err:=strconv.Atoi(port)
	if err!=nil||n<1||n>65535 { log.Fatal("invalid PORT") }
	if len(os.Args)>1 && os.Args[1]=="--healthcheck" {
		c:=&http.Client{Timeout:2*time.Second}
		resp,e:=c.Get("http://127.0.0.1:"+port+"/health")
		if e!=nil { os.Exit(1) }
		defer func(){_ = resp.Body.Close()}()
		if resp.StatusCode!=http.StatusOK { os.Exit(1) }
		return
	}
	allowed:=strings.Split(os.Getenv("ALLOWED_ORIGINS"),",")
	if os.Getenv("ALLOWED_ORIGINS")=="" {
		if os.Getenv("NODE_ENV")=="production" { log.Fatal("ALLOWED_ORIGINS mandatory in production") }
		allowed=[]string{"http://localhost:5173","http://127.0.0.1:5173"}
	}
	l,err:=limitsFromEnv()
	if err!=nil {log.Fatal("invalid Go worker limits: ",err)}
	log.Printf("Go worker capacity configured: maxClients=%d maxRooms=%d playersPerRoom=%d",l.clients,l.rooms,l.perRoom)
	s:=newGameServerWithLimits(allowed,os.Getenv("GIT_SHA"),l)
	// A running HTTP process is not sufficient: validate two actual WS clients
	// before reporting ready to Docker / the GitHub-to-VPS broker.
	s.ready.Store(false)
	ctx,stop:=signal.NotifyContext(context.Background(),syscall.SIGTERM,syscall.SIGINT)
	defer stop()
	go s.run(ctx)
	server:=&http.Server{Addr:":"+port,Handler:s.handler(),ReadHeaderTimeout:5*time.Second}
	listener,err:=net.Listen("tcp",":"+port)
	if err!=nil { log.Fatal("Unable to listen on ",port,": ",err) }
	errs:=make(chan error,1)
	go func(){ errs<-server.Serve(listener) }()
	go func(){
		origin:=""
		for _,raw:=range allowed {
			if candidate:=strings.TrimSpace(raw);candidate!="" {origin=candidate;break}
		}
		if origin=="" {log.Print("No allowed Origin for startup probe");os.Exit(1)}
		if err:=probeMultiplayer(port,origin);err!=nil {
			log.Print("Go live 2-player startup probe FAILED: ",err)
			os.Exit(1) // Docker restart policy handles a failed boot.
		}
		s.ready.Store(true)
		log.Print("Go live 2-player startup probe OK; health ready")
	}()
	log.Print("Terrania Go shadow server listening on ",port)
	select {
	case <-ctx.Done():
		log.Print("Terrania Go: stopping shadow server")
	case err:=<-errs:
		if err!=nil&&!errors.Is(err,http.ErrServerClosed) { log.Print("HTTP failed: ",err);os.Exit(1) }
		return
	}
	shutdownCtx,cancel:=context.WithTimeout(context.Background(),5*time.Second)
	defer cancel()
	if err:=server.Shutdown(shutdownCtx);err!=nil { log.Print("HTTP shutdown: ",err) }
	// http.Server.Shutdown does not manage upgraded WebSocket sessions.
	s.mu.Lock()
	sockets:=make([]*websocket.Conn,0,len(s.clients))
	for ws:=range s.clients {sockets=append(sockets,ws)}
	s.mu.Unlock()
	for _,ws:=range sockets {
		_ = ws.WriteControl(websocket.CloseMessage,websocket.FormatCloseMessage(websocket.CloseGoingAway,"server restarting"),time.Now().Add(time.Second))
		_ = ws.Close()
	}
}
