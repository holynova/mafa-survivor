import type { Bonuses, StatKey } from "./content";
export const PET_HIT_WINDOW = .3;
export class Rng {
  constructor(public seed: number) {}
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number) {
    return Math.floor(this.next() * n);
  }
  pick<T>(a: T[]) {
    if (!a.length) throw new Error("Empty pool");
    return a[this.int(a.length)];
  }
  shuffle<T>(a: T[]) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
}
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function softCap(raw: number, soft: number, hard: number) {
  return Math.min(hard, Math.min(raw, soft) + Math.max(0, raw - soft) * 0.5);
}
export function effective(key: StatKey, raw: number) {
  switch (key) {
    case "move_speed":
      return softCap(raw, 20, 35);
    case "pickup_radius":
      return softCap(raw, 80, 150);
    case "cooldown_reduction":
      return softCap(raw, 20, 40);
    case "skill_radius":
      return softCap(raw, 20, 35);
    case "hp_regen":
      return softCap(raw, 4, 8);
    case "healing_received":
      return Math.min(50, raw);
    case "duration":
      return Math.min(75, raw);
    case "gold_gain":
      return softCap(raw, 20, 40);
    case "exp_gain":
      return softCap(raw, 25, 50);
    case "crit_chance":
      return Math.min(50, raw);
    case "crit_mult":
      return Math.min(0.75, raw);
    case "dodge":
      return Math.min(30, raw);
    case "projectile_speed":
      return Math.min(100, raw);
    case "detection_range":
      return Math.min(50, Math.max(0,raw));
    default:
      return raw;
  }
}
// One seeded draw per range. Luck biases the same draw upward without touching
// item drop probability; negative luck biases it toward the lower endpoint.
export function rollRange(rng: Rng, min: number, max: number, luck = 0) {
  const u = rng.next();
  const biased = Math.pow(u, Math.pow(0.85, clamp(luck, -10, 10)));
  return min + (Math.max(min, max) - min) * biased;
}
export function sumBonuses(sources: Bonuses[]): Bonuses {
  const out: Bonuses = {};
  for (const s of sources)
    for (const [k, v] of Object.entries(s))
      out[k as StatKey] = (out[k as StatKey] ?? 0) + (v ?? 0);
  return out;
}
export function combine(sources: Bonuses[]): Bonuses {
  const out = sumBonuses(sources);
  for (const k of Object.keys(out) as StatKey[])
    out[k] = effective(k, out[k] ?? 0);
  return out;
}
export function incomingDamage(raw: number, defense: number, shield: number) {
  const reduction = Math.min(
    0.65,
    1 - (1 - defense / (defense + 22)) * (1 - shield),
  );
  return Math.max(1, Math.ceil(raw * (1 - reduction)));
}
export const rerollPrice = (n: number) => 20 + 15 * n + 5 * n * n;
export const sellPrice = (paid: number, base: number) =>
  Math.max(
    0,
    Math.floor(paid > 0 ? Math.min(paid * 0.5, base * 0.5) : base * 0.3),
  );
export const expNeeded = (level: number) => 12 + 8 * level;
export class SpatialHash<T extends { id: number; x: number; y: number }> {
  private cells = new Map<string, T[]>();
  constructor(private size = 80) {}
  rebuild(entities: T[]) {
    this.cells.clear();
    for (const e of entities) {
      const key = this.key(e.x, e.y);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push(e);
    }
  }
  private key(x: number, y: number) {
    return `${Math.floor(x / this.size)},${Math.floor(y / this.size)}`;
  }
  nearby(x: number, y: number, r: number) {
    const out: T[] = [];
    for (
      let ix = Math.floor((x - r) / this.size);
      ix <= Math.floor((x + r) / this.size);
      ix++
    )
      for (
        let iy = Math.floor((y - r) / this.size);
        iy <= Math.floor((y + r) / this.size);
        iy++
      )
        for (const e of this.cells.get(`${ix},${iy}`) ?? [])
          if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r * r) out.push(e);
    return out;
  }
}
