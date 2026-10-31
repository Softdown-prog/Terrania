package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/Softdown-prog/Terrania/server-go/engine"
)

const (
	maxClients = 48
	maxRooms = 8
	maxRoomClients = 12
)

type client struct {
	socket *websocket.Conn
	id string
	room *engine.Room
	welcome engine.Welcome
	out chan *engine.Snapshot
	done chan struct{}
	count int
	windowStart time.Time
}

type gameServer struct {
	mu sync.Mutex
	rooms map[string]*engine.Room
	clients map[*websocket.Conn]*client
	allowed map[string]bool
	revision string
	nextName int
}

func newGameServer(allowed []string,revision string) *gameServer {
	s:=&gameServer{rooms:make(map[string]*engine.Room),
		clients:make(map[*websocket.Conn]*client),allowed:make(map[string]bool)}
	for _,origin:=range allowed { if origin!="" { s.allowed[strings.TrimSpace(origin)]=true } }
	if regexp.MustCompile("^[0-9a-f]{40}$").MatchString(revision) { s.revision=revision }
	return s
}

func (s *gameServer) handler() http.Handler {
	mux:=http.NewServeMux()
	mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request) {
		if r.Method!=http.MethodGet { http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return }
		w.Header().Set("Content-Type","application/json")
		w.Header().Set("Cache-Control","no-store")
		var rev any
		if s.revision!="" { rev=s.revision }
		_ = json.NewEncoder(w).Encode(map[string]any{"status":"ok","revision":rev,"engine":"go"})
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
	full:=len(s.clients)>=maxClients||
		(room==nil&&len(s.rooms)>=maxRooms)||
		(room!=nil&&len(room.Guests)>=maxRoomClients)
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
	if len(s.clients)>=maxClients||
		(room==nil&&len(s.rooms)>=maxRooms)||
		(room!=nil&&len(room.Guests)>=maxRoomClients) {
		s.mu.Unlock()
		_ = ws.WriteControl(websocket.CloseMessage,websocket.FormatCloseMessage(1013,"capacity"),time.Now().Add(time.Second))
		_ = ws.Close()
		return
	}
	if room==nil { room=engine.NewRoom(roomID);s.rooms[roomID]=room }
	s.nextName++
	room.Add(id,"Aventureiro "+strconv.Itoa(s.nextName))
	c:=&client{socket:ws,id:id,room:room,welcome:engine.NewWelcome(id,roomID,room.Seed),out:make(chan *engine.Snapshot,1),done:make(chan struct{}),windowStart:time.Now()}
	s.clients[ws]=c
	s.mu.Unlock()
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
		s.mu.Lock()
		if now.Sub(c.windowStart)>=time.Second { c.count=0;c.windowStart=now }
		c.count++
		excess:=c.count>35||messageType!=websocket.TextMessage
		s.mu.Unlock()
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
		s.mu.Lock()
		c.room.ReceiveInput(c.id,in,now)
		s.mu.Unlock()
	}
}

func (s *gameServer) leave(c *client) {
	s.mu.Lock()
	delete(s.clients,c.socket)
	c.room.Remove(c.id)
	if len(c.room.Guests)==0 { delete(s.rooms,c.room.ID) }
	close(c.done)
	s.mu.Unlock()
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

func (s *gameServer) run(ctx context.Context) {
	ticker:=time.NewTicker(50*time.Millisecond)
	defer ticker.Stop()
	previous:=time.Now()
	frame:=0
	for {
		select {
		case <-ctx.Done():return
		case now:=<-ticker.C:
			dt:=now.Sub(previous).Seconds()
			previous=now
			if dt<0 { dt=0 }
			if dt>.05 { dt=.05 }
			s.mu.Lock()
			for _,room:=range s.rooms { room.Tick(dt,now) }
			frame++
			if frame%2==0 {
				for _,c:=range s.clients {
					if state:=c.room.SnapshotFor(c.id);state!=nil {
						c.enqueueSnapshot(state)
					}
				}
			}
			s.mu.Unlock()
		}
	}
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
		defer resp.Body.Close()
		if resp.StatusCode!=http.StatusOK { os.Exit(1) }
		return
	}
	allowed:=strings.Split(os.Getenv("ALLOWED_ORIGINS"),",")
	if os.Getenv("ALLOWED_ORIGINS")=="" {
		if os.Getenv("NODE_ENV")=="production" { log.Fatal("ALLOWED_ORIGINS mandatory in production") }
		allowed=[]string{"http://localhost:5173","http://127.0.0.1:5173"}
	}
	s:=newGameServer(allowed,os.Getenv("GIT_SHA"))
	ctx,cancel:=context.WithCancel(context.Background())
	defer cancel()
	go s.run(ctx)
	server:=&http.Server{Addr:":"+port,Handler:s.handler(),ReadHeaderTimeout:5*time.Second}
	log.Print("Terrania Go shadow server listening on ",port)
	if err:=server.ListenAndServe();err!=nil&&!errors.Is(err,http.ErrServerClosed) { log.Fatal(err) }
}
