//! Optional isolated spatial kernel. Go remains the authoritative game engine.
//! No IO, database, WebSocket, thread, or Go dependency.

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
            out[n] = i as u32;
            n += 1;
        }
    }
    Ok(n)
}

/// Nearest candidate strictly inside radius. Ties keep earliest inserted.
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

/// FFI: returns visible count, -1 invalid arguments, -2 insufficient buffer.
///
/// # Safety
/// Non-null pointers must address aligned, initialized buffers of their
/// declared length, remain accessible for the entire call, and not overlap.
/// The Rust side cannot validate arbitrary caller-provided memory addresses.
#[no_mangle]
pub unsafe extern "C" fn terrania_spatial_visible(
    points: *const Point,
    count: u32,
    cx: f64,
    cy: f64,
    half: f64,
    out: *mut u32,
    capacity: u32,
) -> i32 {
    if count as usize > MAX_POINTS
        || (count > 0 && points.is_null())
        || (capacity > 0 && out.is_null())
        || !valid_query(cx, cy, half)
    {
        return -1;
    }
    let input = if count == 0 {
        &[]
    } else {
        // SAFETY: guaranteed by the external caller contract.
        unsafe { std::slice::from_raw_parts(points, count as usize) }
    };
    let output = if capacity == 0 {
        &mut []
    } else {
        // SAFETY: guaranteed by caller; disjoint from input.
        unsafe { std::slice::from_raw_parts_mut(out, capacity as usize) }
    };
    match visible_into(input, cx, cy, half, output) {
        Ok(n) => n as i32,
        Err("insufficient capacity") => -2,
        Err(_) => -1,
    }
}

/// FFI: returns nearest candidate index, -1 none, -2 invalid arguments.
///
/// # Safety
/// If count is nonzero, points must point to an aligned, readable buffer
/// of count initialized Point values, unchanged for this call.
#[no_mangle]
pub unsafe extern "C" fn terrania_spatial_nearest(
    points: *const Point,
    count: u32,
    x: f64,
    y: f64,
    radius: f64,
) -> i32 {
    if count as usize > MAX_POINTS || (count > 0 && points.is_null()) {
        return -2;
    }
    let input = if count == 0 {
        &[]
    } else {
        // SAFETY: guaranteed by the external caller contract.
        unsafe { std::slice::from_raw_parts(points, count as usize) }
    };
    match nearest(input, x, y, radius) {
        Ok(Some(n)) => n as i32,
        Ok(None) => -1,
        Err(_) => -2,
    }
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
    #[test]
    fn ffi_rejects_null_and_checks_capacity() {
        // SAFETY: null pointers are used only on rejected/zero-size inputs.
        unsafe {
            assert_eq!(
                terrania_spatial_visible(
                    std::ptr::null(),
                    1,
                    0.0,
                    0.0,
                    10.0,
                    std::ptr::null_mut(),
                    0
                ),
                -1
            );
            assert_eq!(
                terrania_spatial_nearest(std::ptr::null(), 1, 0.0, 0.0, 10.0),
                -2
            );
            let p = [Point { x: 0.0, y: 0.0 }];
            let mut out = [777u32];
            assert_eq!(
                terrania_spatial_visible(p.as_ptr(), 1, 0.0, 0.0, 10.0, out.as_mut_ptr(), 0),
                -2
            );
            assert_eq!(out, [777]);
            assert_eq!(
                terrania_spatial_visible(p.as_ptr(), 1, 0.0, 0.0, 10.0, out.as_mut_ptr(), 1),
                1
            );
            assert_eq!(out, [0]);
            assert_eq!(terrania_spatial_nearest(p.as_ptr(), 1, 0.0, 0.0, 10.0), 0);
            assert_eq!(
                terrania_spatial_visible(
                    std::ptr::null(),
                    0,
                    0.0,
                    0.0,
                    10.0,
                    std::ptr::null_mut(),
                    0
                ),
                0
            );
        }
    }
}
