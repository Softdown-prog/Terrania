use std::time::Instant;
use terrania_spatial::{nearest, visible_into, Point};

fn rand_next(state: &mut u32) -> u32 {
    *state ^= *state << 13;
    *state ^= *state >> 17;
    *state ^= *state << 5;
    *state
}
fn add_u32(hash: &mut u64, value: u32) {
    for byte in value.to_le_bytes() {
        *hash ^= u64::from(byte);
        *hash = hash.wrapping_mul(1_099_511_628_211);
    }
}
fn run_fixture(points: &[Point], out: &mut [u32]) -> (usize, usize, u64) {
    let mut hits = 0;
    let mut found = 0;
    let mut hash: u64 = 14_695_981_039_346_656_037;
    for q in 0..200 {
        let x = f64::from((q * 37) % 401 - 200);
        let y = f64::from((q * 53) % 401 - 200);
        let half = 64.0 + f64::from(q % 5 * 24);
        let count = visible_into(points, x, y, half, out).expect("valid fixture");
        hits += count;
        for &index in &out[..count] {
            add_u32(&mut hash, index);
        }
        let nearest_index = nearest(points, x, y, 160.0).expect("valid fixture");
        if nearest_index.is_some() {
            found += 1;
        }
        add_u32(
            &mut hash,
            nearest_index.map_or(u32::MAX, |n| {
                u32::try_from(n).expect("fixture bounded to 4096")
            }),
        );
    }
    (hits, found, hash)
}
fn main() {
    let mut seed: u32 = 0x1234_5678;
    let mut points = Vec::with_capacity(4096);
    for _ in 0..4096 {
        let x =
            f64::from(i32::try_from(rand_next(&mut seed) % 4096).expect("bounded modulo") - 2048)
                * 0.5;
        let y =
            f64::from(i32::try_from(rand_next(&mut seed) % 4096).expect("bounded modulo") - 2048)
                * 0.5;
        points.push(Point { x, y });
    }
    let mut out = vec![0u32; points.len()];
    let (hits, found, hash) = run_fixture(&points, &mut out);
    println!("requests=200 points=4096 hits={hits} nearest={found} digest={hash:016x}");

    if std::env::args().any(|a| a == "--bench") {
        let start = Instant::now();
        let mut check: u64 = 0;
        for _ in 0..25 {
            check ^= run_fixture(&points, &mut out).2;
        }
        eprintln!(
            "rust_spatial_5000_queries_ns={} check={check}",
            start.elapsed().as_nanos()
        );
    }
}
