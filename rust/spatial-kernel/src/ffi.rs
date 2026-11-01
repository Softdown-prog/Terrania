//! The sole module allowed to use unsafe Rust. Strictly bounded C ABI.
use crate::monsters::{plan_into, MonsterInput, MonsterPlan, MonsterPlayer};
use crate::{nearest, valid_query, visible_into, Point, MAX_POINTS};

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
        Ok(n) => i32::try_from(n).unwrap_or(-1),
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
        Ok(Some(n)) => i32::try_from(n).unwrap_or(-2),
        Ok(None) => -1,
        Err(_) => -2,
    }
}

/// Batch-monster ABI: 0..count on success; -1 invalid input; -2 insufficient output.
/// Input and output buffers must be initialized, aligned, disjoint, and remain valid
/// until the function returns. The function retains no external memory.
/// # Safety
/// Raw pointers must refer to arrays of their specified element counts. No aliases.
#[no_mangle]
pub unsafe extern "C" fn terrania_monsters_plan(
    monsters: *const MonsterInput,
    count: u32,
    players: *const MonsterPlayer,
    players_count: u32,
    dt: f64,
    out: *mut MonsterPlan,
    capacity: u32,
) -> i32 {
    if count as usize > MAX_POINTS
        || players_count as usize > MAX_POINTS
        || (count > 0 && monsters.is_null())
        || (players_count > 0 && players.is_null())
        || (capacity > 0 && out.is_null())
        || !dt.is_finite()
        || dt <= 0.0
        || dt > 0.05
    {
        return -1;
    }
    if capacity < count {
        return -2;
    }
    let monster_slice = if count == 0 {
        &[]
    } else {
        // SAFETY: upheld by the documented caller contract.
        unsafe { std::slice::from_raw_parts(monsters, count as usize) }
    };
    let player_slice = if players_count == 0 {
        &[]
    } else {
        // SAFETY: upheld by the documented caller contract.
        unsafe { std::slice::from_raw_parts(players, players_count as usize) }
    };
    let output_slice = if count == 0 {
        &mut []
    } else {
        // SAFETY: upheld by the documented caller contract; disjoint buffers.
        unsafe { std::slice::from_raw_parts_mut(out, count as usize) }
    };
    match plan_into(monster_slice, player_slice, dt, output_slice) {
        Ok(n) => i32::try_from(n).unwrap_or(-1),
        Err(_) => -1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
    #[test]
    fn monster_ffi_checks_pointers_and_capacity() {
        let m = MonsterInput {
            x: 0.0,
            y: 0.0,
            after_x: 0.0,
            after_y: 0.0,
            pulse: 0.0,
            hurt_time: 0.0,
            cooldown: 0.0,
            knock_x: 0.0,
            knock_y: 0.0,
        };
        // SAFETY: invalid pointer calls return before dereference; valid call uses
        // live non-overlapping stack allocations with matching lengths.
        unsafe {
            assert_eq!(
                terrania_monsters_plan(
                    std::ptr::null(),
                    1,
                    std::ptr::null(),
                    0,
                    0.05,
                    std::ptr::null_mut(),
                    0
                ),
                -1
            );
            assert_eq!(
                terrania_monsters_plan(
                    &raw const m,
                    1,
                    std::ptr::null(),
                    0,
                    0.05,
                    std::ptr::null_mut(),
                    0
                ),
                -2
            );
            let mut out = [MonsterPlan::default()];
            assert_eq!(
                terrania_monsters_plan(
                    &raw const m,
                    1,
                    std::ptr::null(),
                    0,
                    0.05,
                    out.as_mut_ptr(),
                    1
                ),
                1
            );
            assert_eq!(out[0].target_index, -1);
        }
    }
}
