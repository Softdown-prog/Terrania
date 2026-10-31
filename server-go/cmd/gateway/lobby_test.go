package main

import (
	"fmt"
	"sync"
	"testing"
)

func TestAutomaticLobbyHas1000LogicalSeats(t *testing.T) {
	l:=newLobby(1000,84,12)
	releases:=make([]func(),0,1000)
	rooms:=map[string]int{}
	for i:=0;i<1000;i++ {
		room,release,err:=l.acquire("origins")
		if err!=nil {t.Fatalf("seat %d: %v",i+1,err)}
		releases=append(releases,release)
		rooms[room]++
		if rooms[room]>12 {t.Fatalf("room %s over capacity",room)}
		if i==0&&room!="origins" {t.Fatalf("first guest must keep original world seed: %s",room)}
		if i==12&&room!="origins-2" {t.Fatalf("overflow must create origins-2: %s",room)}
	}
	if active,used:=l.status();active!=1000||used!=84 {
		t.Fatalf("expected 1000 clients across 84 rooms, got %d and %d",active,used)
	}
	if _,_,err:=l.acquire("origins");err!=errLobbyFull {t.Fatalf("1001st client accepted: %v",err)}
	for _,release:=range releases {release()}
	if active,used:=l.status();active!=0||used!=0 {t.Fatalf("leaked seats: %d %d",active,used)}
}

func TestPrivateRoomNeverRedirectsAndFillsUp(t *testing.T) {
	l:=newLobby(30,4,12)
	var releases []func()
	for i:=0;i<12;i++ {
		room,done,err:=l.acquire("friend-room")
		if err!=nil||room!="friend-room" {t.Fatalf("shared room moved: %s, %v",room,err)}
		releases=append(releases,done)
	}
	if _,_,err:=l.acquire("friend-room");err!=errRoomFull {t.Fatalf("room did not reject 13th guest: %v",err)}
	room,done,err:=l.acquire("origins")
	if err!=nil||room!="origins" {t.Fatalf("separate lobby blocked: %v",err)}
	done()
	for _,done:=range releases {done()}
}

func TestConcurrentLobbyClaimsNeverExceedCapacity(t *testing.T) {
	l:=newLobby(1000,84,12)
	type ticket struct{room string;release func();err error}
	out:=make(chan ticket,1100)
	var wg sync.WaitGroup
	for i:=0;i<1100;i++ {
		wg.Add(1)
		go func(){
			defer wg.Done()
			room,release,err:=l.acquire("origins")
			out<-ticket{room,release,err}
		}()
	}
	wg.Wait()
	close(out)
	accepted:=0
	for x:=range out {
		if x.err==nil {accepted++;x.release()} else if x.err!=errLobbyFull {t.Fatalf("unexpected: %v",x.err)}
	}
	if accepted!=1000 {t.Fatalf("accepted %d, expected 1000",accepted)}
	if active,_:=l.status();active!=0 {t.Fatal("unreleased seat")}
}

func TestLotsOfDistinctRoomsStayWithinConfiguredBound(t *testing.T){
	l:=newLobby(1000,84,12)
	releases:=make([]func(),0,84)
	for i:=0;i<84;i++ {
		_,release,err:=l.acquire(fmt.Sprintf("private-%d",i))
		if err!=nil {t.Fatal(err)}
		releases=append(releases,release)
	}
	if _,_,err:=l.acquire("new-room");err!=errLobbyFull {t.Fatalf("room count must be enforced: %v",err)}
	for _,release:=range releases {release()}
}
