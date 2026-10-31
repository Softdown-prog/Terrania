package main

import (
	"errors"
	"fmt"
	"sync"
)

var errLobbyFull = errors.New("lobby capacity reached")
var errRoomFull = errors.New("room capacity reached")

// This is a single gateway's admission ledger, NOT a distributed database.
// A single active gateway must own all clients until a shared coordinator exists.
// The room owner in Go remains authoritative for actual admission and gameplay.
type lobby struct {
	mu sync.Mutex
	seats map[string]int
	total int
	maxClients int
	maxRooms int
	maxPerRoom int
}
func newLobby(maxClients,maxRooms,maxPerRoom int) *lobby {
	if maxClients<1||maxRooms<1||maxPerRoom<1 {panic("invalid lobby capacity")}
	return &lobby{seats:make(map[string]int),maxClients:maxClients,maxRooms:maxRooms,maxPerRoom:maxPerRoom}
}

// Acquire reserves a seat for the lifetime of one proxied WebSocket connection.
// "origins" means automatic matchmaking: spill into origins-2, origins-3...
// Explicit room URLs remain private/shareable and never get moved to another room.
func (l *lobby) acquire(requested string) (string,func(),error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.total>=l.maxClients {return "",nil,errLobbyFull}
	room:=requested
	if requested=="origins" {
		found:=false
		for i:=1;i<=l.maxRooms;i++ {
			candidate:="origins"
			if i>1 {candidate=fmt.Sprintf("origins-%d",i)}
			if l.seats[candidate]<l.maxPerRoom {
				if l.seats[candidate]>0||len(l.seats)<l.maxRooms {
					room=candidate;found=true;break
				}
			}
		}
		if !found {return "",nil,errLobbyFull}
	} else if l.seats[room]>=l.maxPerRoom {
		return "",nil,errRoomFull
	}
	if l.seats[room]==0&&len(l.seats)>=l.maxRooms {
		return "",nil,errLobbyFull
	}
	l.seats[room]++
	l.total++
	return room,func(){
		l.mu.Lock()
		defer l.mu.Unlock()
		l.total--
		l.seats[room]--
		if l.seats[room]==0 {delete(l.seats,room)}
	},nil
}
func (l *lobby) status() (int,int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.total,len(l.seats)
}
