package main

import ("testing";"unsafe")

func testConfig() scenario {return scenario{Entities:1200,Players:120,RoomSize:12,Ticks:2,Samples:100,SnapshotBytes:2048,SnapshotHz:10,InputBytes:48,InputHz:20,MemoryGuardMiB:64}}
func TestMillionPlayersTenMillionEntitiesProjection(t *testing.T){
 c:=testConfig();c.Entities=10_000_000;c.Players=1_000_000
 p:=projection(c)
 if p["minimum_rooms_at_room_size"].(int)!=83_334||p["min_workers_by_configured_limits_only"].(int)!=100||p["max_entities_assigned_to_one_room"].(int)!=120{t.Fatalf("room/worker partition: %+v",p)}
 if p["assumed_snapshot_egress_bytes_per_second"].(uint64)!=20_480_000_000||p["assumed_input_ingress_bytes_per_second"].(uint64)!=960_000_000 {t.Fatalf("network arithmetic: %+v",p)}
 if p["full_scan_entity_updates_at_20hz"].(uint64)!=200_000_000||p["room_tick_schedules_at_20hz"].(uint64)!=1_666_680{t.Fatalf("tick arithmetic: %+v",p)}
 if unsafe.Sizeof(entity{})!=24||unsafe.Sizeof(player{})!=24{t.Fatal("compact record sizes changed")}
}
func TestSyntheticMaterializationAndChecksums(t *testing.T){
 out,err:=run(testConfig());if err!=nil{t.Fatal(err)}
 m:=out["measured_on_this_machine"].(map[string]any)
 if m["checksum"].(uint64)==0||len(m["full_array_motion_scan_ms_per_tick"].([]float64))!=2{t.Fatalf("synthetic scan missing: %+v",m)}
 if m["measured_target_candidate_searches"].(int)!=100{t.Fatalf("sample wrong: %+v",m)}
}
func TestGuardRejectsOversizeBeforeAllocation(t *testing.T){
 c:=testConfig()
 tests:=[]func(*scenario){func(s *scenario){s.Entities=10_000_001},func(s *scenario){s.Players=1_000_001},func(s *scenario){s.RoomSize=1000},func(s *scenario){s.Ticks=0},func(s *scenario){s.Samples=100_001},func(s *scenario){s.Entities=10_000_000;s.Players=1_000_000;s.MemoryGuardMiB=128}}
 for _,change:=range tests{
  x:=c;change(&x)
  if _,err:=run(x);err==nil{t.Fatalf("accepted invalid config: %+v",x)}
 }
}
func TestArenaCapacityCannotBeGlobalized(t *testing.T){
 c:=testConfig();c.Players=1;c.Entities=1_000_000
 p:=projection(c)
 if p["minimum_rooms_at_room_size"].(int)!=5||p["max_entities_assigned_to_one_room"].(int)!=200_000{t.Fatalf("arena partition incorrect: %+v",p)}
}
