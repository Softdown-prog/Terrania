// Offline synthetic capacity test. No socket, gameplay room or VPS is touched.
package main

import (
 "encoding/json"
 "errors"
 "flag"
 "fmt"
 "math"
 "os"
 "runtime"
 "time"
 "unsafe"
)

const maxEntities=10_000_000
const maxPlayers=1_000_000
const arenaCap=200_000
const workerClientCap=10_000
const workerRoomCap=10_000

type entity struct {x,y,vx,vy float32; room uint32; kind,hp uint16}
type player struct {x,y,vx,vy float32; room,flags uint32}

type scenario struct {
 Entities int `json:"entities"`
 Players int `json:"players"`
 RoomSize int `json:"players_per_room"`
 Ticks int `json:"measured_ticks"`
 Samples int `json:"target_samples"`
 SnapshotBytes int `json:"assumed_snapshot_bytes"`
 SnapshotHz int `json:"assumed_snapshot_hz"`
 InputBytes int `json:"assumed_input_bytes"`
 InputHz int `json:"assumed_input_hz"`
 MemoryGuardMiB int `json:"memory_guard_mib"`
}
func divUp(n,d int)int{return n/d + (n%d+d-1)/d} // d positive, no n+d overflow
func valid(c scenario)error{
 if c.Entities<1||c.Entities>maxEntities||c.Players<1||c.Players>maxPlayers{return errors.New("entities 1..10m; players 1..1m")}
 if c.RoomSize!=12{return errors.New("room size remains 12 for protocol parity")}
 if c.Ticks<1||c.Ticks>12||c.Samples<0||c.Samples>100_000{return errors.New("ticks 1..12; target samples 0..100000")}
 if c.SnapshotHz<1||c.SnapshotHz>30||c.InputHz<1||c.InputHz>60{return errors.New("message Hz out of range")}
 if c.SnapshotBytes<1||c.SnapshotBytes>1_000_000||c.InputBytes<1||c.InputBytes>1_000_000{return errors.New("message bytes out of range")}
 if c.MemoryGuardMiB<32||c.MemoryGuardMiB>65536{return errors.New("memory guard out of range")}
 arrays:=uint64(c.Entities)*uint64(unsafe.Sizeof(entity{}))+uint64(c.Players)*uint64(unsafe.Sizeof(player{}))
 if arrays*2>uint64(c.MemoryGuardMiB)*1024*1024{return fmt.Errorf("synthetic arrays need %.1f MiB with 2x safety factor, guard is %d MiB",float64(arrays*2)/(1024*1024),c.MemoryGuardMiB)}
 return nil
}
func projection(c scenario)map[string]any{
 rooms:=divUp(c.Players,12)
 if min:=divUp(c.Entities,arenaCap);rooms<min{rooms=min}
 workersByClients:=divUp(c.Players,workerClientCap)
 workersByRooms:=divUp(rooms,workerRoomCap)
 workers:=workersByClients;if workersByRooms>workers{workers=workersByRooms}
 snapshots:=uint64(c.Players)*uint64(c.SnapshotHz)
 inputs:=uint64(c.Players)*uint64(c.InputHz)
 outBytes:=snapshots*uint64(c.SnapshotBytes);inBytes:=inputs*uint64(c.InputBytes)
 return map[string]any{
  "minimum_rooms_at_room_size":rooms,
  "min_workers_at_configured_client_ceiling":workersByClients,
  "min_workers_at_configured_room_ceiling":workersByRooms,
  "min_workers_by_configured_limits_only":workers,
  "mean_entities_per_room":float64(c.Entities)/float64(rooms),
  "max_entities_assigned_to_one_room":divUp(c.Entities,rooms),
  "compact_entity_bytes_only":uint64(c.Entities)*uint64(unsafe.Sizeof(entity{})),
  "compact_player_bytes_only":uint64(c.Players)*uint64(unsafe.Sizeof(player{})),
  "modeled_snapshots_per_second":snapshots,
  "modeled_inputs_per_second":inputs,
  "assumed_snapshot_egress_bytes_per_second":outBytes,
  "assumed_input_ingress_bytes_per_second":inBytes,
  "assumed_combined_payload_gbps":float64(outBytes+inBytes)*8/1e9,
  "full_scan_entity_updates_at_20hz":uint64(c.Entities)*20,
  "full_scan_player_updates_at_20hz":uint64(c.Players)*20,
  "room_tick_schedules_at_20hz":uint64(rooms)*20,
  "potential_one_batch_per_room_at_20hz":uint64(rooms)*20,
  "current_live_monster_limit_per_room":96,
 }
}
func run(c scenario)(map[string]any,error){
 if err:=valid(c);err!=nil{return nil,err}
 p:=projection(c);rooms:=p["minimum_rooms_at_room_size"].(int)
 start:=time.Now()
 players:=make([]player,c.Players)
 entities:=make([]entity,c.Entities)
 for i:=range players{
  players[i]=player{x:float32(i%12)*20,y:float32((i/12)%7)*15,vx:.13,vy:-.11,room:uint32(i/12),flags:1}
 }
 for i:=range entities{
  room:=uint32((uint64(i)*uint64(rooms))/uint64(c.Entities))
  entities[i]=entity{x:float32(i%2000)*.31,y:float32((i/2000)%2000)*.23,vx:.12,vy:.07,room:room,kind:uint16(i%5+1),hp:100}
 }
 initMs:=float64(time.Since(start).Microseconds())/1e3
 ticks:=make([]float64,0,c.Ticks)
 var check uint64
 var total,max float64
 for tick:=0;tick<c.Ticks;tick++{
  begin:=time.Now()
  for i:=range players{players[i].x+=players[i].vx;players[i].y+=players[i].vy;if i&1023==0{check+=uint64(math.Float32bits(players[i].x))}}
  for i:=range entities{entities[i].x+=entities[i].vx;entities[i].y+=entities[i].vy;if i&1023==0{check+=uint64(math.Float32bits(entities[i].x))}}
  ms:=float64(time.Since(begin).Microseconds())/1e3
  ticks=append(ticks,ms);total+=ms;if ms>max{max=ms}
 }
 samples:=c.Samples;if samples>c.Entities{samples=c.Entities}
 begin:=time.Now()
 for i:=0;i<samples;i++{
  idx:=int(uint64(i)*uint64(c.Entities)/uint64(samples))
  e:=entities[idx]
  from:=int(e.room)*12;to:=from+12;if to>len(players){to=len(players)}
  best:=float32(260*260)
  for j:=from;j<to;j++{
   dx:=players[j].x-e.x;dy:=players[j].y-e.y
   distance:=dx*dx+dy*dy
   if distance<best{best=distance;check+=uint64(j+1)}
  }
 }
 targetMs:=float64(time.Since(begin).Microseconds())/1e3
 var mem runtime.MemStats;runtime.ReadMemStats(&mem)
 runtime.KeepAlive(players);runtime.KeepAlive(entities)
 extrapolate:=0.0;if samples>0{extrapolate=targetMs*float64(c.Entities)/float64(samples)}
 measured:=map[string]any{
  "initialization_ms":initMs,
  "full_array_motion_scan_ms_per_tick":ticks,
  "mean_full_array_motion_scan_ms":total/float64(c.Ticks),
  "longest_full_array_motion_scan_ms":max,
  "measured_target_candidate_searches":samples,
  "measured_target_search_ms":targetMs,
  "linear_target_search_estimate_ms_not_measured":extrapolate,
  "observed_go_heap_alloc_bytes":mem.HeapAlloc,
  "sizeof_compact_entity":unsafe.Sizeof(entity{}),
  "sizeof_compact_player":unsafe.Sizeof(player{}),
  "checksum":check,
 }
 limitations:=[]string{
 "SYNTHETIC OFFLINE: No real TCP/WebSocket clients, Go game Room/Slime objects, network IO, authentication, combat, collisions, replication, scheduling goroutines or distributed services.",
 "The heap describes compact records only, excluding connections, real gameplay objects, queues, memory allocator overhead and operating system RSS.",
 "Snapshot/input byte rates are assumptions from flags; they are not measured protocol traffic and exclude compression, TLS, packet framing, retries and region subscriptions.",
 "Worker minimum comes from administrative ceilings, not CPU, RAM, network, routing or availability certification.",
 "Each of 83334 simulated rooms does NOT have a real ticker; 50ms per room is not directly comparable with a single global sequential full-array scan.",
 "Target CPU projection extrapolates a sampled 12-candidate scan to all entity records. Static items and spatial indexing could change the work drastically.",
 "Rust arena limit remains 200000 per arena; live Go monster limit remains 96 per room. Never treat this as a 10m monster gameplay test.",
 }
 return map[string]any{"scenario":c,"projection":p,"measured_on_this_machine":measured,"important_limitations":limitations},nil
}
func main(){
 c:=scenario{}
 flag.IntVar(&c.Entities,"entities",100_000,"materialized synthetic entity records (max 10 million)")
 flag.IntVar(&c.Players,"players",10_000,"materialized virtual players (max 1 million)")
 flag.IntVar(&c.RoomSize,"room-size",12,"Go room size (must remain 12)")
 flag.IntVar(&c.Ticks,"ticks",3,"simplified motion passes (max 12)")
 flag.IntVar(&c.Samples,"target-samples",100_000,"sampled room-local target searches (max 100000)")
 flag.IntVar(&c.SnapshotBytes,"snapshot-bytes",2048,"assumed bytes per outgoing snapshot")
 flag.IntVar(&c.SnapshotHz,"snapshot-hz",10,"assumed outgoing snapshots per player each second")
 flag.IntVar(&c.InputBytes,"input-bytes",48,"assumed bytes per incoming input")
 flag.IntVar(&c.InputHz,"input-hz",20,"assumed incoming input messages per second")
 flag.IntVar(&c.MemoryGuardMiB,"memory-guard-mib",768,"2x guard for synthetic arrays")
 reportPath:=flag.String("report","","write JSON to a file in addition to stdout")
 flag.Parse()
 result,err:=run(c);if err!=nil{fmt.Fprintln(os.Stderr,"capacity-lab:",err);os.Exit(2)}
 raw,err:=json.MarshalIndent(result,"","  ");if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
 if *reportPath!=""{if err:=os.WriteFile(*reportPath,append(raw,'\n'),0600);err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}}
 fmt.Println(string(raw))
}
