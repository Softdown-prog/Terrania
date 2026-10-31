package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

func TestGatewayPreservesRoomAffinityOverRealWebSockets(t *testing.T) {
	mkBackend:=func(name string) *httptest.Server {
		up:=websocket.Upgrader{CheckOrigin:func(r *http.Request)bool{return true}}
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
			ws,err:=up.Upgrade(w,r,nil)
			if err!=nil{return}
			defer ws.Close()
			_ = ws.WriteMessage(websocket.TextMessage,[]byte(name+":"+r.URL.Query().Get("room")))
		}))
	}
	a,b:=mkBackend("east"),mkBackend("west")
	defer a.Close();defer b.Close()
	router,err:=cluster.NewRouter("east="+a.URL+",west="+b.URL)
	if err!=nil {t.Fatal(err)}
	gateway:=httptest.NewServer(gatewayHandler(router,map[string]bool{"http://localhost:5173":true}))
	defer gateway.Close()
	connect:=func(room string)(string,error) {
		wsURL:="ws"+strings.TrimPrefix(gateway.URL,"http")+"/ws?room="+room
		ws,_,err:=websocket.DefaultDialer.Dial(wsURL,http.Header{"Origin":[]string{"http://localhost:5173"}})
		if err!=nil{return "",err}
		defer ws.Close()
		_,data,err:=ws.ReadMessage()
		return string(data),err
	}
	for i:=0;i<50;i++ {
		room:=fmt.Sprintf("room-%d",i)
		first,err:=connect(room)
		if err!=nil {t.Fatal(err)}
		again,err:=connect(room)
		if err!=nil {t.Fatal(err)}
		if first!=again {t.Fatalf("room %s routed to different workers: %s %s",room,first,again)}
		picked:=router.Pick(room)
		if first!=picked.ID+":"+room {t.Fatalf("wrong owner: %q != %s:%s",first,picked.ID,room)}
	}
}

func TestGatewayRejectsInvalidClients(t *testing.T) {
	r,_:=cluster.NewRouter("one=http://127.0.0.1:8788")
	gateway:=httptest.NewServer(gatewayHandler(r,map[string]bool{"https://rpg.analysepro.com":true}))
	defer gateway.Close()
	for _,tc:=range []struct{path,origin string; want int}{
		{"/ws?room=origins","https://evil.example",http.StatusForbidden},
		{"/ws?room=../../etc/passwd","https://rpg.analysepro.com",http.StatusBadRequest},
		{"/ws?room=origins&room=other","https://rpg.analysepro.com",http.StatusBadRequest},
		{"/ws?room=origins","https://rpg.analysepro.com",http.StatusBadRequest},
	} {
		request,err:=http.NewRequest(http.MethodGet,gateway.URL+tc.path,nil)
		if err!=nil {t.Fatal(err)}
		request.Header.Set("Origin",tc.origin)
		res,err:=http.DefaultClient.Do(request)
		if err!=nil {t.Fatal(err)}
		_ = res.Body.Close()
		if res.StatusCode!=tc.want {t.Errorf("%s origin=%s HTTP %d want %d",tc.path,tc.origin,res.StatusCode,tc.want)}
	}
}
