/* Terrânia: optional spatial kernel ABI v1. C11, no Go runtime dependency. */
#ifndef TERRANIA_SPATIAL_H
#define TERRANIA_SPATIAL_H

#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    double x;
    double y;
} TerraniaPoint;

/* Returns number of points written; -1 invalid input; -2 insufficient capacity.
 * Visibility uses strict |dx| < half_extent AND |dy| < half_extent, stable input order.
 * If count > 0, points must refer to at least count readable points.
 * If capacity > 0, out_indices must refer to at least capacity writable uint32_t.
 * Do not alias out_indices with points: overlapping input/output is unsupported.
 */
int32_t terrania_spatial_visible(const TerraniaPoint *points, uint32_t count,
                                double center_x, double center_y, double half_extent,
                                uint32_t *out_indices, uint32_t capacity);

/* Returns nearest index, -1 if none, -2 for invalid input.
 * Distance strictly < radius; stable input-order tie break.
 * If count > 0, points must refer to at least count readable points.
 */
int32_t terrania_spatial_nearest(const TerraniaPoint *points, uint32_t count,
                                double x, double y, double radius);

/* Monster decisions are calculated in one call per room tick. Go owns
 * movement collision, entity identities, HP, networking and world state.
 * Each pointer must reference initialized disjoint arrays of the specified
 * length. No memory is retained by Rust after returning. */
typedef struct {
    double x, y, after_x, after_y;
    double pulse, hurt_time, cooldown, knock_x, knock_y;
} TerraniaMonsterInput;
typedef struct {
    double x, y;
    uint32_t in_village;
} TerraniaMonsterPlayer;
typedef struct {
    double pulse, hurt_time, cooldown, knock_x, knock_y, move_x, move_y;
    int32_t target_index;
    uint32_t attack;
} TerraniaMonsterPlan;
/* Returns count >= 0 or -1 for invalid input, -2 for insufficient output. */
int32_t terrania_monsters_plan(const TerraniaMonsterInput *monsters, uint32_t count,
                              const TerraniaMonsterPlayer *players, uint32_t player_count,
                              double dt, TerraniaMonsterPlan *out, uint32_t capacity);

/* Optional persistent Rust-owned arena, one per Go room.
 * Handles are slot/generation IDs, scoped to that arena (never globally unique).
 * Safe concurrency policy: the owning room must serialize all arena calls;
 * a pointer must never be used after terrania_arena_free.
 * Gameplay authority, world collisions and networking stay in Go. */
typedef struct TerraniaArena TerraniaArena;
typedef struct {
    uint16_t kind; /* 1 monster, 2 NPC, 3 projectile, 4 resource, 5 ambient */
    double x, y;
    int32_t hp;
    uint32_t state;
} TerraniaEntity;

/* new returns NULL for invalid capacity. Free NULL is a no-op. */
TerraniaArena *terrania_arena_new(uint32_t capacity);
void terrania_arena_free(TerraniaArena *arena);
/* Returns 0 success, -1 invalid data, -2 stale handle, -3 full. */
int32_t terrania_arena_spawn(TerraniaArena *arena, TerraniaEntity entity,
                            uint64_t *out_handle);
int32_t terrania_arena_update_batch(TerraniaArena *arena, const uint64_t *handles,
                                   const TerraniaEntity *entities, uint32_t count);
int32_t terrania_arena_despawn(TerraniaArena *arena, uint64_t handle);
int32_t terrania_arena_get(const TerraniaArena *arena, uint64_t handle,
                          TerraniaEntity *out);
int32_t terrania_arena_len(const TerraniaArena *arena);

#ifdef __cplusplus
}
#endif
#endif
