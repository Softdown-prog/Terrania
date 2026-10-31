package main

import (
	"fmt"
	"os"
	"strconv"
)

// Limits are per Go worker, NOT a cluster-wide promise of hardware capacity.
// The public Node server remains at 48 until the Go gateway is approved.
type limits struct {
	clients int
	rooms int
	perRoom int
}

const (
	defaultMaxClients = 48
	defaultMaxRooms = 8
	defaultRoomClients = 12
	// Hard ceilings protect a misconfigured instance from unbounded sessions.
	maxConfigClients = 10000
	maxConfigRooms = 10000
)

func defaultLimits() limits {
	return limits{clients:defaultMaxClients,rooms:defaultMaxRooms,perRoom:defaultRoomClients}
}

func (l limits) validate() error {
	if l.clients<1 || l.clients>maxConfigClients {return fmt.Errorf("MAX_CLIENTS must be 1..%d",maxConfigClients)}
	if l.rooms<1 || l.rooms>maxConfigRooms {return fmt.Errorf("MAX_ROOMS must be 1..%d",maxConfigRooms)}
	if l.perRoom!=defaultRoomClients {return fmt.Errorf("room size must remain %d for protocol parity",defaultRoomClients)}
	return nil
}

func limitsFromEnv() (limits,error) {
	l:=defaultLimits()
	for _,setting:=range []struct{key string;target *int}{
		{"MAX_CLIENTS",&l.clients},{"MAX_ROOMS",&l.rooms},
	} {
		if value,exists:=os.LookupEnv(setting.key);exists {
			n,err:=strconv.Atoi(value)
			if err!=nil {return limits{},fmt.Errorf("%s: %w",setting.key,err)}
			*setting.target=n
		}
	}
	return l,l.validate()
}
