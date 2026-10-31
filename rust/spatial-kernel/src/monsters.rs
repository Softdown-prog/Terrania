//! Deterministic, allocation-free monster decisions for one room tick.
//! No network, global state, heap ownership crossing FFI, or unsafe code.
#![forbid(unsafe_code)]
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct MonsterInput {
    pub x: f64,
    pub y: f64,
    /// Go calculates the collision-aware destination of the previous knockback.
    pub after_x: f64,
    pub after_y: f64,
    pub pulse: f64,
    pub hurt_time: f64,
    pub cooldown: f64,
    pub knock_x: f64,
    pub knock_y: f64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct MonsterPlayer {
    pub x: f64,
    pub y: f64,
    /// Stored as u32 to avoid C/Rust bool layout ambiguity.
    pub in_village: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct MonsterPlan {
    pub pulse: f64,
    pub hurt_time: f64,
    pub cooldown: f64,
    pub knock_x: f64,
    pub knock_y: f64,
    pub move_x: f64,
    pub move_y: f64,
    /// -1 means no player within the original 260px targeting radius.
    pub target_index: i32,
    pub attack: u32,
}

fn valid_monster(m: &MonsterInput) -> bool {
    [
        m.x,
        m.y,
        m.after_x,
        m.after_y,
        m.pulse,
        m.hurt_time,
        m.cooldown,
        m.knock_x,
        m.knock_y,
    ]
    .iter()
    .all(|v| v.is_finite())
}
fn valid_player(p: &MonsterPlayer) -> bool {
    p.x.is_finite() && p.y.is_finite() && p.in_village <= 1
}

/// Plan all monsters in insertion order, without mutating the Go world.
/// A collision-aware Go pass applies move vectors and contact damage afterward.
/// Return an error without writing if the input or capacity is invalid.
///
/// # Errors
/// Returns an error for invalid time, nonfinite coordinates, excessive counts,
/// malformed village flags, or output buffers smaller than the monster batch.
pub fn plan_into(
    monsters: &[MonsterInput],
    players: &[MonsterPlayer],
    dt: f64,
    out: &mut [MonsterPlan],
) -> Result<usize, &'static str> {
    if !dt.is_finite()
        || !(0.0..=0.05).contains(&dt)
        || dt == 0.0
        || monsters.len() > 1_000_000
        || players.len() > 1_000_000
        || out.len() < monsters.len()
        || !monsters.iter().all(valid_monster)
        || !players.iter().all(valid_player)
    {
        return Err("invalid batch");
    }
    for (out, m) in out.iter_mut().zip(monsters.iter()) {
        let mut winner = None;
        let mut best = 260.0;
        for (i, p) in players.iter().enumerate() {
            let distance = (p.x - m.x).hypot(p.y - m.y);
            if distance < best {
                best = distance;
                winner = Some(i);
            }
        }
        let Some(target) = winner else {
            // Old Go motor does not advance idle monsters without targets.
            *out = MonsterPlan {
                target_index: -1,
                ..MonsterPlan::default()
            };
            continue;
        };
        let p = &players[target];
        let pulse = m.pulse + dt * 5.0;
        let hurt_time = (m.hurt_time - dt).max(0.0);
        let mut cooldown = (m.cooldown - dt).max(0.0);
        let mut move_x = 0.0;
        let mut move_y = 0.0;
        let mut attack = 0;
        if p.in_village == 0 {
            let dx = p.x - m.after_x;
            let dy = p.y - m.after_y;
            let distance = dx.hypot(dy);
            if distance < 230.0 && distance > 16.0 && hurt_time <= 0.0 {
                let speed = 38.0 * (0.65 + 0.35 * pulse.sin().max(0.0));
                move_x = (dx / distance) * speed * dt;
                move_y = (dy / distance) * speed * dt;
            }
            if distance < 24.0 && cooldown == 0.0 {
                attack = 1;
                cooldown = 1.2;
            }
        }
        *out = MonsterPlan {
            pulse,
            hurt_time,
            cooldown,
            knock_x: m.knock_x * (-10.0 * dt).exp(),
            knock_y: m.knock_y * (-10.0 * dt).exp(),
            move_x,
            move_y,
            target_index: i32::try_from(target).map_err(|_| "too many players")?,
            attack,
        };
    }
    Ok(monsters.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monster(x: f64, y: f64) -> MonsterInput {
        MonsterInput {
            x,
            y,
            after_x: x,
            after_y: y,
            pulse: 0.0,
            hurt_time: 0.0,
            cooldown: 0.0,
            knock_x: 0.0,
            knock_y: 0.0,
        }
    }
    #[test]
    fn targets_first_player_on_tie_and_chases() {
        let monsters = [monster(0.0, 0.0)];
        let players = [
            MonsterPlayer {
                x: 30.0,
                y: 0.0,
                in_village: 0,
            },
            MonsterPlayer {
                x: -30.0,
                y: 0.0,
                in_village: 0,
            },
        ];
        let mut out = [MonsterPlan::default()];
        assert_eq!(plan_into(&monsters, &players, 0.05, &mut out), Ok(1));
        assert_eq!(out[0].target_index, 0);
        assert!(out[0].move_x > 0.0);
        assert_eq!(out[0].attack, 0);
    }
    #[test]
    fn no_target_skips_timers_and_village_prevents_attack() {
        let monsters = [monster(0.0, 0.0), monster(1_000.0, 1_000.0)];
        let players = [MonsterPlayer {
            x: 20.0,
            y: 0.0,
            in_village: 1,
        }];
        let mut out = [MonsterPlan::default(); 2];
        plan_into(&monsters, &players, 0.05, &mut out).unwrap();
        assert_eq!(out[0].attack, 0);
        assert_eq!(out[0].move_x, 0.0);
        assert_eq!(out[1].target_index, -1);
    }
    #[test]
    fn contact_cooldown_and_hurt_guard() {
        let mut m = monster(0.0, 0.0);
        m.hurt_time = 0.2;
        let p = [MonsterPlayer {
            x: 20.0,
            y: 0.0,
            in_village: 0,
        }];
        let mut out = [MonsterPlan::default()];
        plan_into(&[m], &p, 0.05, &mut out).unwrap();
        assert_eq!(out[0].attack, 1);
        assert_eq!(out[0].cooldown, 1.2);
        assert_eq!(out[0].move_x, 0.0);
    }
    #[test]
    fn rejected_batch_does_not_mutate_output() {
        let mut m = monster(0.0, 0.0);
        m.pulse = f64::NAN;
        let mut out = [MonsterPlan {
            target_index: 42,
            ..MonsterPlan::default()
        }];
        assert!(plan_into(&[m], &[], 0.05, &mut out).is_err());
        assert_eq!(out[0].target_index, 42);
    }

    #[test]
    fn handles_1024_4096_and_16384_monsters_per_batch() {
        let players = [
            MonsterPlayer { x: 20.0, y: 0.0, in_village: 0 },
            MonsterPlayer { x: 120.0, y: 40.0, in_village: 0 },
            MonsterPlayer { x: -100.0, y: -40.0, in_village: 0 },
        ];
        for count in [1_024, 4_096, 16_384] {
            let monsters: Vec<_> = (0..count)
                .map(|i| monster(f64::from(u32::try_from(i % 200).unwrap()), 0.0))
                .collect();
            let mut output = vec![MonsterPlan::default(); count];
            assert_eq!(plan_into(&monsters, &players, 0.05, &mut output), Ok(count));
            assert!(output.iter().all(|p| p.target_index >= 0));
            assert_eq!(output[0].target_index, 0);
            assert_eq!(output[0].attack, 1);
            assert_eq!(output[count - 1].target_index >= 0, true);
            assert!(plan_into(&monsters, &players, 0.05, &mut output[..count - 1]).is_err());
        }
    }
}
