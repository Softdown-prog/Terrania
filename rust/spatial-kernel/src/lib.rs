#![deny(unsafe_code)]
#![deny(unused_variables)]
//! Spatial calculations and batched monster decisions. Go handles the network.

pub mod entity_arena;
#[allow(unsafe_code)]
mod ffi;
pub mod monsters;
pub use ffi::{terrania_monsters_plan, terrania_spatial_nearest, terrania_spatial_visible};

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}
const MAX_POINTS: usize = 1_000_000;

fn valid_query(x: f64, y: f64, radius: f64) -> bool {
    x.is_finite() && y.is_finite() && radius.is_finite() && radius >= 0.0
}
fn is_visible(p: Point, x: f64, y: f64, half: f64) -> bool {
    p.x.is_finite() && p.y.is_finite() && (p.x - x).abs() < half && (p.y - y).abs() < half
}

/// Keep original insertion order, matching Go room snapshot filtering.
///
/// # Errors
/// Returns an error for invalid query coordinates, unsupported point count,
/// or insufficient output capacity.
pub fn visible_into(
    points: &[Point],
    x: f64,
    y: f64,
    half: f64,
    out: &mut [u32],
) -> Result<usize, &'static str> {
    if !valid_query(x, y, half) || points.len() > MAX_POINTS {
        return Err("invalid query");
    }
    let needed = points
        .iter()
        .filter(|&&p| is_visible(p, x, y, half))
        .count();
    if out.len() < needed {
        return Err("insufficient capacity");
    }
    let mut n = 0;
    for (i, &p) in points.iter().enumerate() {
        if is_visible(p, x, y, half) {
            out[n] = u32::try_from(i).map_err(|_| "index too large")?;
            n += 1;
        }
    }
    Ok(n)
}

/// Nearest candidate strictly inside radius. Ties keep earliest inserted.
///
/// # Errors
/// Returns an error if the query is nonfinite, radius is negative,
/// or the requested point count exceeds the supported capacity.
pub fn nearest(
    points: &[Point],
    x: f64,
    y: f64,
    radius: f64,
) -> Result<Option<usize>, &'static str> {
    if !valid_query(x, y, radius) || points.len() > MAX_POINTS {
        return Err("invalid query");
    }
    let mut best = radius * radius;
    let mut winner = None;
    for (i, &p) in points.iter().enumerate() {
        if !p.x.is_finite() || !p.y.is_finite() {
            continue;
        }
        let dx = p.x - x;
        let dy = p.y - y;
        let squared = dx * dx + dy * dy;
        if squared < best {
            best = squared;
            winner = Some(i);
        }
    }
    Ok(winner)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_strict_bounds_order_and_invalid_points() {
        let p = [
            Point { x: 0.0, y: 0.0 },
            Point { x: 920.0, y: 0.0 },
            Point {
                x: -919.0,
                y: -919.0,
            },
            Point {
                x: 2.0,
                y: f64::NAN,
            },
            Point { x: 0.0, y: 920.0 },
            Point { x: 2.0, y: 3.0 },
        ];
        let mut out = [777; 6];
        assert_eq!(visible_into(&p, 0.0, 0.0, 920.0, &mut out), Ok(3));
        assert_eq!(&out[..3], &[0, 2, 5]);
        assert_eq!(out[3], 777);
    }
    #[test]
    fn insufficient_buffer_does_not_modify_output() {
        let p = [Point { x: 0.0, y: 0.0 }, Point { x: 1.0, y: 1.0 }];
        let mut out = [42u32];
        assert_eq!(
            visible_into(&p, 0.0, 0.0, 10.0, &mut out),
            Err("insufficient capacity")
        );
        assert_eq!(out, [42]);
    }
    #[test]
    fn nearest_preserves_first_equal_distance() {
        let p = [Point { x: 10.0, y: 0.0 }, Point { x: -10.0, y: 0.0 }];
        assert_eq!(nearest(&p, 0.0, 0.0, 10.0), Ok(None));
        assert_eq!(nearest(&p, 0.0, 0.0, 11.0), Ok(Some(0)));
        assert_eq!(nearest(&p, -11.0, 0.0, 30.0), Ok(Some(1)));
    }
    #[test]
    fn rejects_invalid_queries() {
        let p = [Point {
            x: f64::INFINITY,
            y: 0.0,
        }];
        assert_eq!(nearest(&p, 0.0, 0.0, 260.0), Ok(None));
        assert!(nearest(&p, f64::NAN, 0.0, 260.0).is_err());
        assert!(visible_into(&p, 0.0, 0.0, -1.0, &mut [0]).is_err());
    }
}
