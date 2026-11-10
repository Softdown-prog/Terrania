package engine

import "testing"

func TestSouthCityWorldParityAndGates(t *testing.T) {
  cityY:=southCityY
  if got:= (World{Seed:842136}).Tile(0,cityY);got.Ground!="path"||got.Biome!="trail"||got.Tree||got.Rock {
    t.Fatalf("city avenue: %#v",got)
  }
  for _,seed:=range []uint32{0,42,842136,4294967295}{
    w:=World{Seed:seed}
    for x:=-28;x<=27;x++{for y:=-24;y<=23;y++{
      if ground:=w.Tile(x,cityY+y).Ground;ground!="path"&&ground!="sand"{
        t.Fatalf("invalid town tile %d,%d = %s",x,y,ground)
      }
    }}
    for _,y:=range []int{-24,23}{
      if !w.CanMove(16,(float64(cityY+y)+.5)*32) {t.Fatalf("gate blocked at %d",y)}
      if w.CanMove((8+.5)*32,(float64(cityY+y)+.5)*32) {t.Fatalf("wall walkable at %d",y)}
    }
    if w.CanMove(16,(float64(cityY)+.5)*32) {t.Fatal("well is not solid")}
    if !southCitySafe(0,cityY) || southCitySafe(0,cityY-25) {t.Fatal("safe perimeter wrong")}
  }
}
