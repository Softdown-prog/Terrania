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

#ifdef __cplusplus
}
#endif
#endif
