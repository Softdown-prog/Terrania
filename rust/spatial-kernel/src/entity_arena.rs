//! Bounded, reusable storage for many types of simulated world entities.
//! Slot/generation handles prevent stale references after despawn and slot reuse.
//! This is a safe Rust building block, not a second multiplayer server.
#![forbid(unsafe_code)]

use std::mem::size_of;

/// Current experimental per-room limit. This does not change Go's spawn cap.
pub const MAX_ARENA_ENTITIES: usize = 200_000;

#[repr(transparent)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EntityKind(pub u16);

impl EntityKind {
    pub const MONSTER: Self = Self(1);
    pub const NPC: Self = Self(2);
    pub const PROJECTILE: Self = Self(3);
    pub const RESOURCE: Self = Self(4);
    pub const AMBIENT: Self = Self(5);
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Entity {
    pub kind: EntityKind,
    pub x: f64,
    pub y: f64,
    pub hp: i32,
    pub state: u32,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub struct EntityHandle(u64);

impl EntityHandle {
    #[must_use]
    pub const fn raw(self) -> u64 {
        self.0
    }

    /// Decode an untrusted Go handle; each arena validates generation and slot.
    #[must_use]
    pub const fn from_raw(raw: u64) -> Self {
        Self(raw)
    }
}

#[derive(Debug)]
struct Slot {
    generation: u32,
    dense_index: Option<usize>,
}

#[derive(Debug)]
struct Entry {
    slot: u32,
    entity: Entity,
}

/// Dense storage, constant-time lookup and swap-removal, with bounded growth.
/// Does not own player/network state and never exposes Rust pointers to Go.
#[derive(Debug)]
pub struct EntityArena {
    max_entities: usize,
    slots: Vec<Slot>,
    entries: Vec<Entry>,
    free: Vec<u32>,
}

impl EntityArena {
    /// # Errors
    /// Rejects zero capacity or capacity above `MAX_ARENA_ENTITIES`.
    pub fn new(max_entities: usize) -> Result<Self, &'static str> {
        if max_entities == 0 || max_entities > MAX_ARENA_ENTITIES {
            return Err("invalid capacity");
        }
        Ok(Self {
            max_entities,
            slots: Vec::new(),
            entries: Vec::new(),
            free: Vec::new(),
        })
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    #[must_use]
    pub fn max_entities(&self) -> usize {
        self.max_entities
    }

    /// Upper-bound estimate for the three internal Vec allocations.
    #[must_use]
    pub fn allocated_bytes(&self) -> usize {
        self.slots.capacity() * size_of::<Slot>()
            + self.entries.capacity() * size_of::<Entry>()
            + self.free.capacity() * size_of::<u32>()
    }

    /// # Errors
    /// Rejects invalid entity data, exhausted limits and allocation failure.
    pub fn spawn(&mut self, entity: Entity) -> Result<EntityHandle, &'static str> {
        if entity.kind.0 == 0 || !entity.x.is_finite() || !entity.y.is_finite() {
            return Err("invalid entity");
        }
        if self.entries.len() >= self.max_entities {
            return Err("entity limit reached");
        }
        self.entries
            .try_reserve(1)
            .map_err(|_| "allocation failed")?;
        let slot = if let Some(free) = self.free.pop() {
            free
        } else {
            if self.slots.len() >= self.max_entities {
                return Err("slot capacity reached");
            }
            self.slots.try_reserve(1).map_err(|_| "allocation failed")?;
            let id = u32::try_from(self.slots.len()).map_err(|_| "slot overflow")?;
            self.slots.push(Slot {
                generation: 1,
                dense_index: None,
            });
            id
        };
        let dense_index = self.entries.len();
        let generation = self.slots[usize::try_from(slot).map_err(|_| "slot overflow")?].generation;
        self.slots[usize::try_from(slot).map_err(|_| "slot overflow")?].dense_index =
            Some(dense_index);
        self.entries.push(Entry { slot, entity });
        Ok(EntityHandle(
            (u64::from(generation) << 32) | u64::from(slot),
        ))
    }

    #[must_use]
    pub fn get(&self, handle: EntityHandle) -> Option<&Entity> {
        let slot_index = usize::try_from(handle.0 & u64::from(u32::MAX)).ok()?;
        let slot = self.slots.get(slot_index)?;
        if u64::from(slot.generation) != (handle.0 >> 32) {
            return None;
        }
        self.entries
            .get(slot.dense_index?)
            .map(|entry| &entry.entity)
    }

    /// # Errors
    /// Rejects stale handles or non-finite positions without mutating the arena.
    pub fn move_to(&mut self, handle: EntityHandle, x: f64, y: f64) -> Result<(), &'static str> {
        if !x.is_finite() || !y.is_finite() {
            return Err("invalid position");
        }
        let slot_index =
            usize::try_from(handle.0 & u64::from(u32::MAX)).map_err(|_| "invalid handle")?;
        let Some(slot) = self.slots.get(slot_index) else {
            return Err("invalid handle");
        };
        if u64::from(slot.generation) != (handle.0 >> 32) {
            return Err("stale handle");
        }
        let dense_index = slot.dense_index.ok_or("stale handle")?;
        self.entries[dense_index].entity.x = x;
        self.entries[dense_index].entity.y = y;
        Ok(())
    }

    /// Replace data for an existing entity without changing its stable handle.
    ///
    /// # Errors
    /// Rejects invalid coordinates or entity kind and stale handles.
    pub fn update(&mut self, handle: EntityHandle, entity: Entity) -> Result<(), &'static str> {
        if entity.kind.0 == 0 || !entity.x.is_finite() || !entity.y.is_finite() {
            return Err("invalid entity");
        }
        let index =
            usize::try_from(handle.raw() & u64::from(u32::MAX)).map_err(|_| "invalid handle")?;
        let slot = self.slots.get(index).ok_or("invalid handle")?;
        if u64::from(slot.generation) != handle.raw() >> 32 {
            return Err("stale handle");
        }
        let dense = slot.dense_index.ok_or("stale handle")?;
        self.entries[dense].entity = entity;
        Ok(())
    }

    /// Swap-removal keeps iteration compact. Returns None for stale handles.
    pub fn despawn(&mut self, handle: EntityHandle) -> Option<Entity> {
        let slot_index = usize::try_from(handle.0 & u64::from(u32::MAX)).ok()?;
        let slot = self.slots.get(slot_index)?;
        if u64::from(slot.generation) != (handle.0 >> 32) {
            return None;
        }
        let dense_index = slot.dense_index?;
        let last_index = self.entries.len() - 1;
        let removed = self.entries.swap_remove(dense_index).entity;
        if dense_index < last_index {
            let moved_slot = usize::try_from(self.entries[dense_index].slot).ok()?;
            self.slots[moved_slot].dense_index = Some(dense_index);
        }
        let slot = &mut self.slots[slot_index];
        slot.dense_index = None;
        if let Some(next_generation) = slot.generation.checked_add(1) {
            slot.generation = next_generation;
            self.free.push(u32::try_from(slot_index).ok()?);
        } // If exhausted, permanently retire this slot rather than revalidate stale handles.
        Some(removed)
    }

    /// Dense iteration is suitable for mixed-type batched systems.
    ///
    /// # Panics
    /// Only if internal slot invariants are corrupted (never by a valid public handle).
    pub fn iter(&self) -> impl Iterator<Item = (EntityHandle, &Entity)> {
        self.entries.iter().map(|entry| {
            let generation =
                self.slots[usize::try_from(entry.slot).expect("bounded slot")].generation;
            (
                EntityHandle((u64::from(generation) << 32) | u64::from(entry.slot)),
                &entry.entity,
            )
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entity(kind: EntityKind, n: usize) -> Entity {
        Entity {
            kind,
            x: f64::from(u32::try_from(n).expect("test count bounded")),
            y: 5.0,
            hp: 10,
            state: 0,
        }
    }

    #[test]
    fn supports_more_than_one_thousand_mixed_entities() {
        let mut arena = EntityArena::new(16_384).unwrap();
        let kinds = [
            EntityKind::MONSTER,
            EntityKind::NPC,
            EntityKind::PROJECTILE,
            EntityKind::RESOURCE,
            EntityKind::AMBIENT,
        ];
        let mut handles = Vec::new();
        for i in 0..16_384 {
            handles.push(arena.spawn(entity(kinds[i % kinds.len()], i)).unwrap());
        }
        assert_eq!(arena.len(), 16_384);
        assert!(arena.spawn(entity(EntityKind::MONSTER, 0)).is_err());
        assert!(arena.allocated_bytes() < 4 * 1024 * 1024);
        assert_eq!(arena.iter().count(), 16_384);
        for (i, handle) in handles.iter().enumerate().step_by(2) {
            assert_eq!(
                arena.despawn(*handle).unwrap().x,
                entity(EntityKind::MONSTER, i).x
            );
            assert!(arena.get(*handle).is_none());
        }
        assert_eq!(arena.len(), 8_192);
        for i in 0..8_192 {
            arena.spawn(entity(EntityKind::PROJECTILE, i)).unwrap();
        }
        assert_eq!(arena.len(), 16_384);
        assert!(handles.iter().step_by(2).all(|&h| arena.get(h).is_none()));
        assert!(handles
            .iter()
            .skip(1)
            .step_by(2)
            .all(|&h| arena.get(h).is_some()));
    }

    #[test]
    fn reuse_does_not_revive_stale_handles() {
        let mut arena = EntityArena::new(2).unwrap();
        let first = arena.spawn(entity(EntityKind::MONSTER, 0)).unwrap();
        let survivor = arena.spawn(entity(EntityKind::NPC, 1)).unwrap();
        assert!(arena.despawn(first).is_some());
        let reused = arena.spawn(entity(EntityKind::RESOURCE, 2)).unwrap();
        assert_ne!(first.raw(), reused.raw());
        assert!(arena.get(first).is_none());
        assert_eq!(arena.get(survivor).unwrap().kind, EntityKind::NPC);
        arena.move_to(reused, -7.0, 20.0).unwrap();
        assert_eq!(arena.get(reused).unwrap().x, -7.0);
        assert!(arena.move_to(first, 0.0, 0.0).is_err());
        assert!(arena.move_to(reused, f64::NAN, 0.0).is_err());
        assert_eq!(arena.get(reused).unwrap().x, -7.0);
    }

    #[test]
    fn rejects_unbounded_allocation_and_invalid_entities() {
        assert!(EntityArena::new(MAX_ARENA_ENTITIES + 1).is_err());
        assert!(EntityArena::new(0).is_err());
        let mut arena = EntityArena::new(1).unwrap();
        assert!(arena.spawn(entity(EntityKind(0), 0)).is_err());
        assert!(arena.is_empty());
    }
    #[test]
    fn arena_200k_mixed_lifecycle_and_bounded_memory() {
        use std::time::Instant;
        let kinds = [
            EntityKind::MONSTER,
            EntityKind::NPC,
            EntityKind::PROJECTILE,
            EntityKind::RESOURCE,
            EntityKind::AMBIENT,
        ];
        assert!(EntityArena::new(MAX_ARENA_ENTITIES + 1).is_err());
        let mut arena = EntityArena::new(MAX_ARENA_ENTITIES).unwrap();
        let mut handles = Vec::with_capacity(MAX_ARENA_ENTITIES);
        let started = Instant::now();
        for i in 0..MAX_ARENA_ENTITIES {
            handles.push(arena.spawn(entity(kinds[i % kinds.len()], i)).unwrap());
        }
        let spawn_time = started.elapsed();
        assert_eq!(arena.len(), MAX_ARENA_ENTITIES);
        assert!(arena.spawn(entity(EntityKind::MONSTER, 0)).is_err());
        let bytes = arena.allocated_bytes();
        assert!(bytes < 48 * 1024 * 1024, "native arena allocated {bytes} bytes");
        let started = Instant::now();
        for (i, &handle) in handles.iter().enumerate() {
            let updated = Entity {
                kind: kinds[i % kinds.len()],
                x: (i as f64) + 0.25,
                y: -2.0,
                hp: 4,
                state: 42,
            };
            arena.update(handle, updated).unwrap();
        }
        let update_time = started.elapsed();
        assert_eq!(arena.get(handles[199_999]).unwrap().state, 42);
        let started = Instant::now();
        for &handle in handles.iter().step_by(2) {
            assert!(arena.despawn(handle).is_some());
            assert!(arena.get(handle).is_none());
        }
        let despawn_time = started.elapsed();
        assert_eq!(arena.len(), 100_000);
        for i in 0..100_000 {
            arena.spawn(entity(EntityKind::PROJECTILE, i)).unwrap();
        }
        assert_eq!(arena.len(), MAX_ARENA_ENTITIES);
        assert!(handles.iter().step_by(2).all(|&h| arena.get(h).is_none()));
        assert!(handles.iter().skip(1).step_by(2).all(|&h| arena.get(h).is_some()));
        println!(
            "arena_200k: spawn_200k_ms={} update_200k_ms={} despawn_100k_ms={} native_capacity_bytes={}",
            spawn_time.as_millis(),
            update_time.as_millis(),
            despawn_time.as_millis(),
            bytes
        );
    }

}
