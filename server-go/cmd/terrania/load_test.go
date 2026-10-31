package main

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
    "time"

    "github.com/gorilla/websocket"
    "github.com/Softdown-prog/Terrania/server-go/engine"
)

const loadOrigin = "http://localhost:5173"

func connectLoad(t *testing.T, base, room string) *websocket.Conn {
    t.Helper()
    url := "ws"+strings.TrimPrefix(base,"http")+"/ws?room="+room
    headers:=http.Header{"Origin":[]string{loadOrigin}}
    ws,resp,err:=websocket.DefaultDialer.Dial(url,headers)
    if err!=nil {
        code:=0
        if resp!=nil {code=resp.StatusCode; _=resp.Body.Close()}
        t.Fatalf("websocket room %s: %v (HTTP %d)",room,err,code)
    }
    _=ws.SetReadDeadline(time.Now().Add(3*time.Second))
    var msg engine.Welcome
    if err:=ws.ReadJSON(&msg);err!=nil {t.Fatal(err)}
    if msg.Type!="welcome" || msg.Version!=engine.ProtocolVersion || msg.Room!=room || msg.ID=="" {
        t.Fatalf("bad handshake in %s: %+v",room,msg)
    }
    return ws
}

func deniedLoad(t *testing.T,base,room string,status int) {
    t.Helper()
    url:="ws"+strings.TrimPrefix(base,"http")+"/ws?room="+room
    ws,resp,err:=websocket.DefaultDialer.Dial(url,http.Header{"Origin":[]string{loadOrigin}})
    if ws!=nil {_=ws.Close()}
    if err==nil||resp==nil||resp.StatusCode!=status {
        t.Fatalf("room %s: wanted HTTP %d, got %v error %v",room,status,resp,err)
    }
    _=resp.Body.Close()
}

func waitClients(t *testing.T,s *gameServer,want int) {
    t.Helper()
    deadline:=time.Now().Add(3*time.Second)
    for time.Now().Before(deadline) {
        s.mu.Lock()
        count:=len(s.clients)
        s.mu.Unlock()
        if count==want{return}
        time.Sleep(10*time.Millisecond)
    }
    t.Fatalf("websocket cleanup: did not reach %d clients",want)
}

func TestRoomLimitAndIsolation(t *testing.T) {
    s:=newGameServer([]string{loadOrigin},"")
    srv:=httptest.NewServer(s.handler())
    defer srv.Close()
    sockets:=make([]*websocket.Conn,0,20)
    defer func(){ for _,ws:=range sockets {_=ws.Close()} }()
    for _,room:=range []string{"origins","room1","room2","room3","room4","room5","room6","room7"} {
        sockets=append(sockets,connectLoad(t,srv.URL,room))
    }
    deniedLoad(t,srv.URL,"ninth",http.StatusServiceUnavailable)
    for i:=0;i<11;i++ {
        sockets=append(sockets,connectLoad(t,srv.URL,"origins"))
    }
    deniedLoad(t,srv.URL,"origins",http.StatusServiceUnavailable)
    s.mu.Lock()
    if len(s.rooms)!=8||len(s.rooms["origins"].Guests)!=12 {
        s.mu.Unlock();t.Fatal("room or room-client limits wrong")
    }
    roomState:=s.rooms["room1"].SnapshotFor(
        // Snapshot must only reveal players of this room, not origins.
        func() string {
            for id:=range s.rooms["room1"].Guests{return id}
            return ""
        }(),
    )
    s.mu.Unlock()
    if roomState==nil||len(roomState.Players)!=1 {t.Fatalf("cross-room state leak: %+v",roomState)}
    for _,ws:=range sockets {_=ws.Close()}
    waitClients(t,s,0)
    s.mu.Lock()
    remaining:=len(s.rooms)
    s.mu.Unlock()
    if remaining!=0 {t.Fatalf("rooms not removed after disconnect: %d",remaining)}
}

func TestGlobalClientCapAndReconnect(t *testing.T) {
    s:=newGameServer([]string{loadOrigin},"")
    srv:=httptest.NewServer(s.handler())
    defer srv.Close()
    sockets:=make([]*websocket.Conn,0,48)
    defer func(){for _,ws:=range sockets {_=ws.Close()}}()
    for _,room:=range []string{"origins","room1","room2","room3"} {
        for i:=0;i<12;i++ {sockets=append(sockets,connectLoad(t,srv.URL,room))}
    }
    deniedLoad(t,srv.URL,"room4",http.StatusServiceUnavailable)
    _=sockets[0].Close()
    waitClients(t,s,47)
    ws:=connectLoad(t,srv.URL,"origins")
    sockets=append(sockets,ws)
    waitClients(t,s,48)
    for _,c:=range sockets {_=c.Close()}
    waitClients(t,s,0)
}

func TestNoStaleSnapshotsOrDroppedWelcome(t *testing.T) {
    c:=&client{out:make(chan *engine.Snapshot,1)}
    for i:=1;i<=3;i++ {
        c.enqueueSnapshot(&engine.Snapshot{
            Type:"state",
            Players:[]engine.HeroState{{ID:"p",X:float64(i)}},
        })
    }
    got:=<-c.out
    if len(got.Players)!=1||got.Players[0].X!=3 {t.Fatalf("stale snapshot delivered: %+v",got)}
}

func TestInvalidAndRateLimitedMessages(t *testing.T) {
    cases:=[]struct{name string; messages []string}{
        {"coordinates",[]string{`{"type":"input","x":99,"y":0,"attack":false}`}},
        {"forgedHP",[]string{`{"type":"input","x":0,"y":0,"attack":false,"hp":999}`}},
        {"flood",func()[]string{
            list:=make([]string,36)
            for i:=range list { list[i]=`{"type":"input","x":1,"y":0,"attack":false}` }
            return list
        }()},
    }
    for _,tc:=range cases {t.Run(tc.name,func(t *testing.T){
        s:=newGameServer([]string{loadOrigin},"")
        srv:=httptest.NewServer(s.handler())
        defer srv.Close()
        ws:=connectLoad(t,srv.URL,"origins")
        defer ws.Close()
        for _,raw:=range tc.messages {
            if err:=ws.WriteMessage(websocket.TextMessage,[]byte(raw));err!=nil {break}
        }
        _=ws.SetReadDeadline(time.Now().Add(3*time.Second))
        for i:=0;i<4;i++ {
            _,_,err:=ws.ReadMessage()
            if err!=nil {
                if websocket.IsCloseError(err,websocket.ClosePolicyViolation) {return}
                t.Fatalf("expected protocol violation, got %v",err)
            }
        }
        t.Fatal("invalid traffic was not disconnected")
    })}
}
