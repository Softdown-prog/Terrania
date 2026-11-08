package engine

import "math"

// Port independente das regras de regiões, clima e biomas de src/world/*.ts.
// Alterações de geração exigem validar go run ./cmd/parity contra TS.
type regionWeights struct { center, north, south, east, west float64 }
type terrainProfile struct {
    region string
    weights regionWeights
    temperature, humidity, altitude, coast, ruggedness float64
}
func clamp01(n float64) float64 { return math.Max(0, math.Min(1,n)) }
func smooth(a,b,x float64) float64 {
    t:=clamp01((x-a)/(b-a))
    return t*t*(3-2*t)
}
func getRegionWeights(x,y float64) regionWeights {
    if math.IsNaN(x)||math.IsInf(x,0)||math.IsNaN(y)||math.IsInf(y,0) {
        return regionWeights{center:1}
    }
    wx:=x+(ValueNoise(x/4700,y/4700,119)-.5)*950
    wy:=y+(ValueNoise(x/4700,y/4700,251)-.5)*950
    wild:=smooth(3800,9700,math.Max(math.Abs(wx),math.Abs(wy)))
    total:=math.Abs(wx)+math.Abs(wy)
    if total==0 { total=1 }
    return regionWeights{center:1-wild,
        north:wild*math.Max(0,-wy)/total,
        south:wild*math.Max(0,wy)/total,
        east:wild*math.Max(0,wx)/total,
        west:wild*math.Max(0,-wx)/total}
}
func worldRegion(w regionWeights) string {
    region,best:="center",w.center
    if w.north>best { region,best="north",w.north }
    if w.south>best { region,best="south",w.south }
    if w.east>best { region,best="east",w.east }
    if w.west>best { region="west" }
    return region
}
func regionDifficulty(tx,ty float64) int {
    switch worldRegion(getRegionWeights(tx,ty)) {
    case "east": return 2
    case "north": return 3
    case "south": return 4
    case "west": return 5
    }
    return 1
}
func getTerrainProfile(x,y float64,seed uint32) terrainProfile {
    w:=getRegionWeights(x,y)
    wide:=ValueNoise(x/230,y/230,seed+541)
    moisture:=ValueNoise(x/170,y/170,seed+379)
    ridge:=ValueNoise(x/105,y/105,seed+677)
    return terrainProfile{
        region:worldRegion(w),weights:w,
        temperature:clamp01(.56-w.north*.7+w.south*.42-w.west*.09+(wide-.5)*.14),
        humidity:clamp01(.52+w.north*.10+w.east*.13-w.south*.47-w.west*.14+(moisture-.5)*.44),
        altitude:clamp01(.36+w.west*.5-w.east*.22+(ridge-.5)*.47),
        coast:clamp01(w.east*smooth(7100,23000,x)+(wide-.5)*w.east*.28),
        ruggedness:clamp01(w.west*.7+(ridge-.5)*.48),
    }
}
func classifyBiome(p terrainProfile) string {
    if p.weights.north>.42&&p.temperature<.29 {
        if p.altitude>.46||p.humidity>.54 { return "snowfield" }
        return "tundra"
    }
    if p.weights.south>.41&&p.humidity<.31 {
        if p.humidity>.25 { return "oasis" }
        if p.altitude>.55 { return "ruins" }
        return "dunes"
    }
    if p.weights.east>.4 {
        if p.coast>.61 { return "open-sea" }
        if p.coast>.34 { return "island" }
        return "beach"
    }
    if p.weights.west>.41 {
        if p.altitude>.75 { return "stone-peak" }
        if p.ruggedness>.74&&p.humidity<.36 { return "volcanic" }
        return "highlands"
    }
    if p.temperature<.35 {
        if p.altitude>.45 { return "snowfield" }
        return "tundra"
    }
    if p.temperature>.76&&p.humidity<.30 { return "dunes" }
    if p.humidity>.54 { return "woodland" }
    return "meadow"
}
