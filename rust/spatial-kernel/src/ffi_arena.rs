//! Opaque Rust-owned arena accessible through a bounded, room-local C ABI.
//! This boundary is the only module allowed to dereference external pointers.
use crate::entity_arena::{Entity, EntityArena, EntityHandle};

/// Create a Rust-owned arena for one room; Go must call `terrania_arena_free`
/// exactly once, after its final use. Null means invalid capacity.
///
/// No Go memory is retained in the returned pointer.
#[no_mangle]
pub extern "C" fn terrania_arena_new(capacity: u32) -> *mut EntityArena {
    match EntityArena::new(capacity as usize) {
        Ok(arena) => Box::into_raw(Box::new(arena)),
        Err(_) => std::ptr::null_mut(),
    }}

/// Release the opaque arena. The pointer becomes invalid immediately.
///
/// # Safety
/// `arena` must be null or a pointer returned by `terrania_arena_new`,
/// owned by this caller, never freed before, with no concurrent users.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_free(arena: *mut EntityArena) {
    if !arena.is_null() {
        // SAFETY: exclusive ownership is transferred back to Rust by caller.
        drop(unsafe { Box::from_raw(arena) });
    }
}

/// Insert one entity and write its generation-checked handle.
/// Returns 0 success, -1 invalid input, -3 arena capacity exceeded.
///
/// # Safety
/// `arena` is a live, exclusive arena pointer, `handle` is writable,
/// aligned, disjoint, and no other thread touches the arena during this call.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_spawn(
    arena: *mut EntityArena,
    entity: Entity,
    handle: *mut u64,
) -> i32 {
    if arena.is_null() || handle.is_null() {
        return -1;
    }
    // SAFETY: exclusive live arena and output guaranteed by caller.
    let arena = unsafe { &mut *arena };
    match arena.spawn(entity) {
        Ok(value) => {
            // SAFETY: valid writable pointer with no alias.
            unsafe { handle.write(value.raw()) };
            0
        }
        Err("entity limit reached" | "slot capacity reached") => -3,
        Err(_) => -1,
    }
}

/// Apply a collision-free batch of entity snapshots without retaining inputs.
/// Validates the ENTIRE batch first to avoid partial updates on invalid data.
/// Return 0 for success, -1 invalid input, -2 stale/unknown handle.
///
/// # Safety
/// Live, exclusively accessed arena; `handles` and `entities` are aligned,
/// readable, initialized arrays of `count` elements disjoint from the arena.
/// Go must not access or free those buffers until this call has returned.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_update_batch(
    arena: *mut EntityArena,
    handles: *const u64,
    entities: *const Entity,
    count: u32,
) -> i32 {
    if arena.is_null()
        || count as usize > crate::entity_arena::MAX_ARENA_ENTITIES
        || (count > 0 && (handles.is_null() || entities.is_null()))
    {
        return -1;
    }
    // SAFETY: caller owns live exclusive arena, inputs are valid and disjoint.
    let arena = unsafe { &mut *arena };
    let handles = if count == 0 {
        &[]
    } else {
        // SAFETY: caller guarantees count initialized u64 values.
        unsafe { std::slice::from_raw_parts(handles, count as usize) }
    };
    let entities = if count == 0 {
        &[]
    } else {
        // SAFETY: caller guarantees count initialized Entity values.
        unsafe { std::slice::from_raw_parts(entities, count as usize) }
    };
    for (&handle, &entity) in handles.iter().zip(entities) {
        if entity.kind.0 == 0 || !entity.x.is_finite() || !entity.y.is_finite() {
            return -1;
        }
        if arena.get(EntityHandle::from_raw(handle)).is_none() {
            return -2;
        }
    }
    for (&handle, &entity) in handles.iter().zip(entities) {
        if arena
            .update(EntityHandle::from_raw(handle), entity)
            .is_err()
        {
            return -2;
        }
    }
    0
}

/// Remove one live entity. Returns 0 on success or -2 for stale handle.
///
/// # Safety
/// `arena` must be live, exclusively borrowed, and not concurrently freed.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_despawn(arena: *mut EntityArena, handle: u64) -> i32 {
    if arena.is_null() {
        return -1;
    }
    // SAFETY: exclusively borrowed live arena.
    let arena = unsafe { &mut *arena };
    if arena.despawn(EntityHandle::from_raw(handle)).is_some() {
        0
    } else {
        -2
    }
}

/// Retrieve a snapshot by stable handle; caller owns output storage.
///
/// # Safety
/// `arena` must be live and not concurrently mutated; `out` must be
/// aligned, writable, non-overlapping with `arena`, and initialized.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_get(
    arena: *const EntityArena,
    handle: u64,
    out: *mut Entity,
) -> i32 {
    if arena.is_null() || out.is_null() {
        return -1;
    }
    // SAFETY: caller owns live readable arena and output pointer.
    let arena = unsafe { &*arena };
    match arena.get(EntityHandle::from_raw(handle)) {
        Some(&entity) => {
            // SAFETY: out points to an independent writable Entity.
            unsafe { out.write(entity) };
            0
        }
        None => -2,
    }
}

/// Number of active entities; -1 for invalid arena.
///
/// # Safety
/// Arena pointer must be live and not concurrently modified or freed.
#[no_mangle]
pub unsafe extern "C" fn terrania_arena_len(arena: *const EntityArena) -> i32 {
    if arena.is_null() {
        return -1;
    }
    // SAFETY: caller supplies a valid immutable borrow.
    let arena = unsafe { &*arena };
    i32::try_from(arena.len()).unwrap_or(-1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity_arena::EntityKind;

    fn monster(x: f64) -> Entity {
        Entity {
            kind: EntityKind::MONSTER,
            x,
            y: 1.0,
            hp: 2,
            state: 0,
        }
    }

    #[test]
    fn ffi_round_trip_and_generation_protection() {
        let arena = terrania_arena_new(1024);
        assert!(!arena.is_null());
        let mut first = 0u64;
        let mut second = 0u64;
        let mut record = monster(0.0);
        // SAFETY: stack-owned buffers and live arena with single-thread access.
        unsafe {
            assert_eq!(
                terrania_arena_spawn(arena, monster(10.0), &raw mut first),
                0
            );
            assert_eq!(
                terrania_arena_spawn(arena, monster(20.0), &raw mut second),
                0
            );
            assert_ne!(first, second);
            assert_eq!(terrania_arena_len(arena), 2);
            let handles = [first, second];
            let entities = [monster(99.0), monster(77.0)];
            assert_eq!(
                terrania_arena_update_batch(arena, handles.as_ptr(), entities.as_ptr(), 2),
                0
            );
            assert_eq!(terrania_arena_get(arena, first, &raw mut record), 0);
            assert_eq!(record.x, 99.0);
            assert_eq!(terrania_arena_despawn(arena, first), 0);
            assert_eq!(terrania_arena_despawn(arena, first), -2);
            assert_eq!(terrania_arena_get(arena, first, &raw mut record), -2);
            let mut reused = 0;
            assert_eq!(
                terrania_arena_spawn(arena, monster(7.0), &raw mut reused),
                0
            );
            assert_ne!(reused, first);
            assert_eq!(
                terrania_arena_update_batch(arena, &raw const first, &raw const record, 1),
                -2
            );
            assert_eq!(terrania_arena_get(arena, reused, &raw mut record), 0);
            assert_eq!(record.x, 7.0);
            assert_eq!(terrania_arena_len(arena), 2);
            terrania_arena_free(arena);
        }
    }

    #[test]
    fn ffi_rejects_malformed_batch_without_partial_mutation() {
        let arena = terrania_arena_new(2);
        let mut handle = 0;
        let mut out = monster(0.0);
        // SAFETY: locally allocated arena/stack buffers, no concurrent calls.
        unsafe {
            assert_eq!(
                terrania_arena_spawn(arena, monster(1.0), &raw mut handle),
                0
            );
            let bad = [monster(55.0), monster(f64::NAN)];
            let handles = [handle, handle];
            assert_eq!(
                terrania_arena_update_batch(arena, handles.as_ptr(), bad.as_ptr(), 2),
                -1
            );
            assert_eq!(terrania_arena_get(arena, handle, &raw mut out), 0);
            assert_eq!(out.x, 1.0);
            assert_eq!(
                terrania_arena_update_batch(arena, std::ptr::null(), std::ptr::null(), 0),
                0
            );
            assert_eq!(terrania_arena_get(arena, handle, std::ptr::null_mut()), -1);
            terrania_arena_free(arena);
        }
    }
    #[test]
    fn ffi_200k_atomic_single_batch_and_capacity() {
        use std::time::Instant;
        const COUNT: usize = 200_000;
        assert!(terrania_arena_new((COUNT + 1) as u32).is_null());
        let arena = terrania_arena_new(COUNT as u32);
        assert!(!arena.is_null());
        let mut handles = Vec::with_capacity(COUNT);
        let mut values = Vec::with_capacity(COUNT);
        // SAFETY: the arena is exclusively owned until the final free; the
        // vectors and stack variables are valid, disjoint, initialized buffers.
        unsafe {
            for i in 0..COUNT {
                let mut handle = 0;
                let entity = monster(i as f64);
                assert_eq!(terrania_arena_spawn(arena, entity, &raw mut handle), 0);
                handles.push(handle);
                values.push(monster(i as f64 + 1.0));
            }
            assert_eq!(terrania_arena_len(arena), COUNT as i32);
            let extra = monster(999.0);
            let mut unused = 0u64;
            assert_eq!(terrania_arena_spawn(arena, extra, &raw mut unused), -3);
            let started = Instant::now();
            assert_eq!(
                terrania_arena_update_batch(arena, handles.as_ptr(), values.as_ptr(), COUNT as u32),
                0
            );
            let batch_time = started.elapsed();
            let mut check = monster(0.0);
            assert_eq!(terrania_arena_get(arena, handles[0], &raw mut check), 0);
            assert_eq!(check.x, 1.0);
            assert_eq!(
                terrania_arena_get(arena, handles[COUNT - 1], &raw mut check),
                0
            );
            assert_eq!(check.x, COUNT as f64);
            // Out-of-range count must be rejected before accessing any buffer.
            assert_eq!(
                terrania_arena_update_batch(
                    arena,
                    handles.as_ptr(),
                    values.as_ptr(),
                    (COUNT + 1) as u32
                ),
                -1
            );
            // Invalid final element must not partially apply earlier updates.
            values[0].x = 600.0;
            values[COUNT - 1].x = f64::NAN;
            assert_eq!(
                terrania_arena_update_batch(arena, handles.as_ptr(), values.as_ptr(), COUNT as u32),
                -1
            );
            assert_eq!(terrania_arena_get(arena, handles[0], &raw mut check), 0);
            assert_eq!(check.x, 1.0);
            println!(
                "ffi_200k: single_batch_update_200k_ms={}",
                batch_time.as_millis()
            );
            terrania_arena_free(arena);
        }
    }

}
