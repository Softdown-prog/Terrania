package cluster

import (
	"errors"
	"fmt"
	"math"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// ProvinceChunks is an experimental geographic partition, not the current
// matchmaking room size. One province spans 16 x 16 existing world chunks.
const ProvinceChunks = 16

// Province uses signed grid coordinates: negative world coordinates must use
// floor (not integer truncation), or players disagree about border ownership.
type Province struct{ X, Y int64 }

func (p Province) Key() string { return fmt.Sprintf("province:%d:%d", p.X, p.Y) }

var ErrInvalidPosition = errors.New("province: invalid world position")

// ProvinceAt uses the exact engine chunk width and the current movement bound.
// It does not alter world collision, seeds, or gameplay room identity.
func ProvinceAt(x, y float64) (Province, error) {
	if math.IsNaN(x) || math.IsInf(x, 0) ||
		math.IsNaN(y) || math.IsInf(y, 0) ||
		math.Abs(x) > 1_000_000 || math.Abs(y) > 1_000_000 {
		return Province{}, ErrInvalidPosition
	}
	span := float64(engine.ChunkPixels * ProvinceChunks)
	return Province{X: int64(math.Floor(x / span)), Y: int64(math.Floor(y / span))}, nil
}

// PickProvince computes a stable future placement, separate from Pick(room).
// Do not use it for an ACTIVE province without draining its old owner: adding
// nodes to rendezvous hashing will otherwise reassign some regions.
func (r *Router) PickProvince(p Province) Backend {
	return r.Pick("province\x00" + p.Key())
}
