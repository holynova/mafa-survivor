import {
  ITEMS,
  MONSTERS,
  SKILLS,
  SCENERY,
  WAVE_BUDGET,
  SLOT_KEYS,
  getItem,
  getSkill,
  type Bonuses,
  type SkillId,
  type StatKey,
  type Slot,
  type Item,
} from "./content";
import type { SkillField } from "./spells";
import {
  createTaoState,
  castTaoist,
  updateTaoist,
  refreshSummons,
  enemyVictim,
  canDetect,
  invisible,
  revealActor,
  buffDefense,
  clearTaoSkill,
} from "./taoist";
import { CLASSES, type ClassId } from "./classes";
import {
  Rng,
  clamp,
  combine,
  incomingDamage,
  rerollPrice,
  sellPrice,
  expNeeded,
  SpatialHash,
  effective,
  sumBonuses,
  rollRange,
} from "./rules";
export const WORLD = { w: 2208, h: 1536 };
export type Phase =
  | "lobby"
  | "battle"
  | "upgrade"
  | "replace"
  | "shop"
  | "paused"
  | "won"
  | "dead";
export type Mode = "normal" | "trial";
export type Entity = { id: number; x: number; y: number };
export type Enemy = Entity & {
  kind: string;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  exp: number;
  dir: number;
  windup: number;
  attackCD: number;
  hitAt: number;
  burnAt: number;
  elite: boolean;
  born: number;
  level?: number;
  attackTarget?: number;
  agility?: number;
  defense?: number;
  magicDefense?: number;
  greenPoison?: { until: number; tickAt: number; damage: number };
  redPoison?: { until: number; reduction: number };
  trapUntil?: number;
  revealUntil?: number;
  revealTags?: boolean;
  lastSeen?: { id: number; x: number; y: number; until: number };
};
export type Pet = Entity & {
  source?: "charm" | "skeleton" | "beast";
  baseMaxHp?: number;
  moving?: boolean;
  kind: string;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  dir: number;
  cd: number;
  born: number;
  attackUntil: number;
};
export type Projectile = Entity & {
  vx: number;
  vy: number;
  damage: number;
  life: number;
  dir: number;
  skill?: SkillId;
  targetId?: number;
  hitChance?: number;
  homing?: boolean;
};
export type Drop = Entity & { exp: number; gold: number; born: number };
export type Fx = Entity & {
  kind: SkillId | "hit" | "cast" | "beastflame" | "talismanHit";
  dir?: number;
  life: number;
  total: number;
  radius: number;
  targetId?: number;
};
export type Floating = Entity & { text: string; color: string; life: number };
export type Skill = {
  id: SkillId;
  rank: number;
  cd: number;
  power: number;
  count: number;
  radius: number;
  duration: number;
  localCDR: number;
  shieldReduction: number;
  speed: number;
  range: number;
  knockback: number;
  chance: number;
  summonPower: number;
  accuracy: number;
  angle: number;
  hitFloor: number;
  summonHP: number;
};
export type Upgrade = {
  id: string;
  kind: "skill" | "stat";
  name: string;
  description: string;
  skill?: SkillId;
  field?: SkillField;
  value: number;
  stat?: StatKey;
};
export type Offer = {
  id: number;
  itemId: string;
  price: number;
  locked: boolean;
  sold: boolean;
};
export type Equipped = { itemId: string; paid: number };
export type RunResult = {
  classId?: ClassId;
  runId: string;
  mode: Mode;
  seed: number;
  won: boolean;
  wave: number;
  kills: number;
  seconds: number;
  level: number;
  gold: number;
  crystals: number;
  skillDamage: Record<string, number>;
  healing?: Record<string, number>;
  skills: string[];
};
export class Game {
  classId: ClassId = "wizard";
  tao = createTaoState();
  phase: Phase = "lobby";
  mode: Mode = "normal";
  seed = 176;
  runId = "";
  rng = new Rng(176);
  clock = 0;
  wave = 1;
  waveTime = 0;
  kills = 0;
  gold = 0;
  level = 1;
  exp = 0;
  totalGold = 0;
  bossSpawned = false;
  bossKilled = false;
  damageDealt: Record<string, number> = {};
  player = {
    x: WORLD.w / 2,
    y: WORLD.h / 2,
    hp: 100,
    dir: 4,
    moving: false,
    hitUntil: 0,
    castUntil: 0,
    shieldUntil: 0,
    attackUntil: 0,
  };
  skills: Skill[] = [];
  pets: Pet[] = [];
  pendingSkill: SkillId | null = null;
  automaticTeleport = false;
  automaticDash = true;
  charges: Partial<Record<"powerstrike" | "firesword", boolean>> = {};
  basicCD = 0;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  drops: Drop[] = [];
  effects: Fx[] = [];
  floating: Floating[] = [];
  equipment: Partial<Record<Slot, Equipped>> = {};
  passives: Record<string, number> = {};
  upgrades: Bonuses = {};
  offers: Offer[] = [];
  choices: Upgrade[] = [];
  rerolls = 0;
  waveGold = 0;
  lastWaveGold = 0;
  lastWaveKills = 0;
  notice = "";
  result: RunResult | null = null;
  stats: Bonuses = {};
  rawStats: Bonuses = {};
  input = { x: 0, y: 0 };
  private listeners = new Set<() => void>();
  private id = 0;
  private spawnTimer = 0;
  private spawned = 0;
  private nextUI = 0;
  private previous: Phase = "battle";
  private hash = new SpatialHash<Enemy>();
  private waveKills = 0;
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  emit() {
    for (const f of this.listeners) f();
  }
  get maxHP() {
    return this.classInfo.hp + (this.stats.hp_max ?? 0);
  }
  nextEntityId() {
    return ++this.id;
  }
  setPoisonMode(mode: "green" | "red") {
    this.tao.poisonMode = mode;
    this.emit();
  }
  setHealPriority(priority: "self" | "pet") {
    this.tao.healPriority = priority;
    this.emit();
  }
  enemyDefense(e: Enemy, kind: "physical" | "magic") {
    const base = kind === "physical" ? (e.defense ?? 0) : (e.magicDefense ?? 0);
    return (
      base *
      (1 -
        ((e.redPoison?.until ?? 0) > this.clock ? e.redPoison!.reduction : 0))
    );
  }
  get classInfo() {
    return CLASSES[this.classId];
  }
  selectClass(id: ClassId) {
    if (this.phase !== "lobby" || !(id in CLASSES)) return;
    this.classId = id;
    this.recompute();
    this.emit();
  }
  get duration() {
    return this.mode === "trial" ? 35 : 75;
  }
  get maxWaves() {
    return this.mode === "trial" ? 3 : 12;
  }
  get boss() {
    return this.enemies.find((e) => e.kind === "boss" && e.hp > 0);
  }
  get cooldownCost() {
    return rerollPrice(this.rerolls);
  }
  get moveSpeed() {
    return this.classInfo.speed * (1 + (this.stats.move_speed ?? 0) / 100);
  }
  get pickupRadius() {
    return 48 * (1 + (this.stats.pickup_radius ?? 0) / 100);
  }
  newSkill(id: SkillId): Skill {
    return {
      id,
      rank: 1,
      cd: 0.3,
      power: 0,
      count: 0,
      radius: 0,
      duration: 0,
      localCDR: 0,
      shieldReduction: 0,
      speed: 0,
      range: 0,
      knockback: 0,
      chance: 0,
      summonPower: 0,
      accuracy: 0,
      angle: 0,
      hitFloor: 0,
      summonHP: 0,
    };
  }
  start(mode: Mode, seed = 176, classId: ClassId = this.classId) {
    this.classId = classId;
    this.mode = mode;
    this.seed = seed;
    this.runId = crypto.randomUUID();
    this.rng = new Rng(seed);
    this.clock = 0;
    this.wave = 1;
    this.waveTime = 0;
    this.kills = 0;
    this.gold = 0;
    this.level = 1;
    this.exp = 0;
    this.id = 0;
    this.totalGold = 0;
    this.bossKilled = false;
    this.bossSpawned = false;
    this.player = {
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      hp: this.classInfo.hp,
      dir: 4,
      moving: false,
      hitUntil: 0,
      castUntil: 0,
      shieldUntil: 0,
      attackUntil: 0,
    };
    this.skills = [this.newSkill(this.classInfo.startingSkill)];
    this.basicCD = 0;
    this.charges = {};
    this.tao = createTaoState();
    this.pets = [];
    this.pendingSkill = null;
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.effects = [];
    this.floating = [];
    this.equipment = {};
    this.passives = {};
    this.upgrades = {};
    this.offers = [];
    this.choices = [];
    this.rerolls = 0;
    this.result = null;
    this.damageDealt = {};
    this.spawned = 0;
    this.spawnTimer = 0.25;
    this.waveKills = 0;
    this.waveGold = 0;
    this.notice = "";
    this.input = { x: 0, y: 0 };
    this.recompute();
    this.phase = "battle";
    this.emit();
  }
  lobby() {
    this.tao = createTaoState();
    this.floating = [];
    this.effects = [];
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.pets = [];
    this.phase = "lobby";
    this.input = { x: 0, y: 0 };
    this.emit();
  }
  recompute() {
    const sources = [
      this.classInfo.base,
      this.upgrades,
      ...Object.values(this.equipment).map((e) => getItem(e.itemId).stats),
      ...Object.entries(this.passives).map(([id, n]) =>
        Object.fromEntries(
          Object.entries(getItem(id).stats).map(([k, v]) => [k, (v ?? 0) * n]),
        ),
      ),
    ];
    this.rawStats = sumBonuses(sources);
    this.stats = combine(sources);
    this.player.hp = Math.min(this.player.hp, this.maxHP);
    refreshSummons(this);
  }
  pause() {
    if (this.phase === "battle") {
      this.previous = "battle";
      this.phase = "paused";
      this.input = { x: 0, y: 0 };
      this.emit();
    } else if (this.phase === "paused") {
      this.phase = this.previous;
      this.emit();
    }
  }
  step(dt: number) {
    if (this.phase !== "battle") return;
    this.clock += dt;
    this.waveTime += dt;
    this.player.hp = Math.min(
      this.maxHP,
      this.player.hp + (this.stats.hp_regen ?? 0) * dt,
    );
    const mag = Math.hypot(this.input.x, this.input.y);
    this.player.moving = mag > 0.01;
    if (mag > 0.01) {
      const dx = this.input.x / Math.max(1, mag),
        dy = this.input.y / Math.max(1, mag);
      const nx = clamp(
          this.player.x + dx * this.moveSpeed * dt,
          35,
          WORLD.w - 35,
        ),
        ny = clamp(this.player.y + dy * this.moveSpeed * dt, 55, WORLD.h - 35);
      if (
        SCENERY.every(
          (o) => Math.hypot(nx - o.x, this.player.y - o.y) > o.r + 12,
        )
      )
        this.player.x = nx;
      if (
        SCENERY.every(
          (o) => Math.hypot(this.player.x - o.x, ny - o.y) > o.r + 12,
        )
      )
        this.player.y = ny;
      this.player.dir = this.direction(dx, dy);
    }
    if (this.player.moving) revealActor(this, 0);
    updateTaoist(this);
    this.spawnTimer -= dt;
    const budget =
      this.mode === "trial"
        ? Math.floor(WAVE_BUDGET[this.wave - 1] * 0.7)
        : WAVE_BUDGET[this.wave - 1];
    if (
      this.spawnTimer <= 0 &&
      this.spawned < budget &&
      this.enemies.length < 300
    ) {
      this.spawnEnemy();
      this.spawned++;
      this.spawnTimer = this.duration / budget;
    }
    if (
      this.wave === this.maxWaves &&
      !this.bossSpawned &&
      this.waveTime > Math.min(25, this.duration * 0.45)
    ) {
      this.spawnEnemy("boss");
      this.bossSpawned = true;
    }
    this.hash.rebuild(this.enemies.filter((e) => e.hp > 0));
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.attackCD = Math.max(0, e.attackCD - dt);
      if ((e.trapUntil ?? 0) > this.clock) {
        e.windup = 0;
        continue;
      }
      const victim = enemyVictim(this, e);
      if (!victim) {
        e.windup = 0;
        continue;
      }
      if (!victim.visible) e.windup = 0;
      const dx = victim.x - e.x,
        dy = victim.y - e.y,
        d = Math.hypot(dx, dy);
      e.dir = this.direction(dx, dy);
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          const locked = e.attackTarget
            ? this.pets.find((p) => p.id === e.attackTarget && p.hp > 0)
            : this.player;
          if (
            locked &&
            canDetect(this, e, e.attackTarget ?? 0, locked) &&
            Math.hypot(locked.x - e.x, locked.y - e.y) <
              (e.kind === "boss" ? 105 : 46)
          ) {
            if (locked === this.player) this.hurt(e.damage);
            else {
              const pet = locked as Pet;
              const base =
                pet.source === "skeleton" ? 4 : pet.source === "beast" ? 8 : 0;
              pet.hp = Math.max(
                0,
                pet.hp -
                  incomingDamage(
                    e.damage,
                    base + buffDefense(this, pet.id, "physical"),
                    0,
                  ),
              );
            }
          }
          e.attackCD = e.kind === "boss" ? 1.5 : 1.1;
        }
        continue;
      }
      if (
        victim.visible &&
        d < (e.kind === "boss" ? 72 : 29) &&
        e.attackCD === 0
      ) {
        e.attackTarget = victim.id;
        e.windup = e.kind === "boss" ? 0.65 : 0.4;
        continue;
      }
      if (d > 22) {
        let sx = 0,
          sy = 0;
        for (const other of this.hash.nearby(e.x, e.y, 30)) {
          if (other.id === e.id) continue;
          const ox = e.x - other.x,
            oy = e.y - other.y,
            l = Math.hypot(ox, oy);
          if (l > 0.1) {
            sx += (ox / l) * (30 - l) * 2;
            sy += (oy / l) * (30 - l) * 2;
          }
        }
        const rush =
          e.kind === "rakecat" && Math.sin(this.clock * 1.3 + e.id) > 0.8
            ? 1.8
            : 1;
        const sp = e.speed * rush;
        e.x = clamp(e.x + ((dx / d) * sp + sx) * dt, 20, WORLD.w - 20);
        e.y = clamp(e.y + ((dy / d) * sp + sy) * dt, 30, WORLD.h - 20);
        for (const o of SCENERY) {
          const ox = e.x - o.x,
            oy = e.y - o.y,
            l = Math.hypot(ox, oy);
          if (l < o.r + 12 && l > 0.01) {
            e.x = o.x + (ox / l) * (o.r + 12);
            e.y = o.y + (oy / l) * (o.r + 12);
          }
        }
      }
    }
    if (this.phase !== "battle") return;
    for (const s of this.skills) {
      if (getSkill(s.id).passive) continue;
      s.cd = Math.max(0, s.cd - dt);
      if (
        s.cd === 0 &&
        (s.id !== "teleport" ||
          (this.automaticTeleport &&
            this.player.hp / this.maxHP < 0.3 &&
            this.enemies.some(
              (e) =>
                e.hp > 0 &&
                Math.hypot(e.x - this.player.x, e.y - this.player.y) < 90,
            )))
      )
        this.cast(s);
    }
    this.basicCD = Math.max(0, this.basicCD - dt);
    this.basicAttack();
    this.updatePets(dt);
    this.hash.rebuild(this.enemies.filter((e) => e.hp > 0));
    for (const p of this.projectiles) {
      if (p.homing) {
        const target = this.enemies.find(
          (e) => e.id === p.targetId && e.hp > 0,
        );
        if (!target) {
          p.life = 0;
          continue;
        }
        const dx = target.x - p.x,
          dy = target.y - p.y,
          d = Math.max(1, Math.hypot(dx, dy)),
          speed = Math.hypot(p.vx, p.vy);
        p.vx = (dx / d) * speed;
        p.vy = (dy / d) * speed;
        p.dir =
          (((Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) + 4) % 16) + 16) %
          16;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const e = this.hash
        .nearby(p.x, p.y, 24)
        .find((e) => e.hp > 0 && (!p.targetId || p.targetId === e.id));
      if (e && p.life > 0) {
        if (
          p.hitChance === undefined ||
          this.rng.next() * 100 < clamp(p.hitChance - (e.agility ?? 0), 55, 100)
        ) {
          this.hit(e, p.damage, p.skill ?? "fireball", "magic");
          if (p.skill === "talisman")
            this.effect("talismanHit", e.x, e.y, 0, 0.5);
        }
        p.life = 0;
      }
    }
    for (const e of this.enemies) {
      if (
        e.hp > 0 &&
        this.clock >= e.burnAt &&
        this.effects.some(
          (f) =>
            f.kind === "firewall" &&
            f.life > 0 &&
            Math.hypot(e.x - f.x, e.y - f.y) < f.radius,
        )
      ) {
        const s = this.skills.find((s) => s.id === "firewall");
        if (s) this.hit(e, this.magicDamage(5, s), "firewall");
        e.burnAt = this.clock + 0.5;
      }
    }
    for (const f of this.effects) f.life -= dt;
    for (const f of this.floating) {
      f.life -= dt;
      f.y -= dt * 22;
    }
    this.effects = this.effects.filter((x) => x.life > 0);
    this.floating = this.floating.filter((x) => x.life > 0);
    this.projectiles = this.projectiles.filter((x) => x.life > 0);
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i],
        dx = this.player.x - d.x,
        dy = this.player.y - d.y,
        l = Math.hypot(dx, dy);
      if (l < this.pickupRadius + 12) {
        const speed = 480 * dt;
        d.x += (dx / Math.max(1, l)) * speed;
        d.y += (dy / Math.max(1, l)) * speed;
        if (l < speed + 12) {
          this.gold += d.gold;
          this.waveGold += d.gold;
          this.totalGold += d.gold;
          this.exp += d.exp;
          this.drops.splice(i, 1);
        }
      }
    }
    this.enemies = this.enemies.filter((x) => x.hp > 0);
    if (this.exp >= expNeeded(this.level)) {
      this.beginUpgrade();
      return;
    }
    if (this.waveTime >= this.duration) {
      this.endWave();
      return;
    }
    this.nextUI += dt;
    if (this.nextUI > 0.1) {
      this.nextUI = 0;
      this.emit();
    }
  }
  direction(dx: number, dy: number) {
    return (((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 2) % 8) + 8) % 8;
  }
  spawnEnemy(kind?: string) {
    let m;
    if (kind) m = MONSTERS.find((x) => x.id === kind)!;
    else {
      const pool = MONSTERS.slice(0, Math.min(4, 1 + Math.ceil(this.wave / 2)));
      m = this.rng.pick(pool);
    }
    const a = this.rng.next() * Math.PI * 2,
      r = 440 + this.rng.next() * 140;
    const elite =
      m.id !== "boss" &&
      this.wave >= 4 &&
      this.spawned === Math.floor(WAVE_BUDGET[this.wave - 1] / 2);
    const mult = 1 + (this.wave - 1) * 0.13;
    const hp = m.hp * (elite ? 4 : 1) * mult;
    this.enemies.push({
      id: ++this.id,
      kind: m.id,
      x: clamp(this.player.x + Math.cos(a) * r, 25, WORLD.w - 25),
      y: clamp(this.player.y + Math.sin(a) * r, 50, WORLD.h - 25),
      hp,
      maxHp: hp,
      speed: m.speed * (1 + this.wave * 0.025),
      damage: m.damage * (1 + (this.wave - 1) * 0.13),
      exp: m.exp * (elite ? 5 : 1),
      dir: 4,
      windup: 0,
      attackCD: 0,
      hitAt: -1,
      burnAt: 0,
      elite,
      born: this.clock,
      level: this.wave,
      defense: m.id === "boss" ? 12 : m.id === "orc" ? 4 : 2,
      magicDefense: m.id === "boss" ? 8 : m.id === "orc" ? 2 : 1,
    });
  }
  private magicDamage(base: number, s: Skill) {
    const mc = this.rollStat("mc") + (this.stats.mc_flat ?? 0);
    let damage =
      (base + mc) *
      (1 + s.power / 100) *
      (1 + (this.stats.mc_bonus_pct ?? 0) / 100) *
      (1 + (this.stats.all_damage_pct ?? 0) / 100);
    if (this.rng.next() < (this.stats.crit_chance ?? 0) / 100)
      damage *= 1.5 + (this.stats.crit_mult ?? 0);
    return Math.round(damage);
  }
  rollStat(prefix: "dc" | "mc" | "sc" | "def" | "mdef", lucky = true) {
    return rollRange(
      this.rng,
      this.stats[`${prefix}_min`] ?? 0,
      this.stats[`${prefix}_max`] ?? 0,
      lucky ? (this.stats.luck ?? 0) : 0,
    );
  }
  private facing() {
    const angle = ((this.player.dir - 2) * Math.PI) / 4;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
  private meleeAim(targets: Enemy[]) {
    if (this.player.moving || !targets.length) return this.facing();
    const target = targets[0],
      dx = target.x - this.player.x,
      dy = target.y - this.player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.player.dir = this.direction(dx, dy);
    return { x: dx / length, y: dy / length };
  }
  private physicalHit(e: Enemy, accuracy = 0, floor = 55) {
    const passive = this.skills.find((s) =>
      ["swordsmanship", "spirit"].includes(s.id),
    );
    const chance = clamp(
      (this.stats.accuracy ?? 90) +
        accuracy +
        (passive ? 5 + passive.accuracy : 0) -
        (e.agility ?? 0),
      Math.min(90, floor + (passive?.hitFloor ?? 0)),
      100,
    );
    return this.rng.next() * 100 < chance;
  }
  private physicalDamage(base: number, power = 0) {
    let damage =
      (base + this.rollStat("dc")) *
      (1 + power / 100) *
      (1 + (this.stats.dc_bonus_pct ?? 0) / 100) *
      (1 + (this.stats.all_damage_pct ?? 0) / 100);
    if (this.rng.next() < (this.stats.crit_chance ?? 0) / 100)
      damage *= 1.5 + (this.stats.crit_mult ?? 0);
    return damage;
  }
  basicAttack() {
    if (
      this.phase !== "battle" ||
      this.basicCD > 0 ||
      this.clock < this.player.attackUntil
    )
      return false;
    const fire = this.charges.firesword
      ? this.skills.find((s) => s.id === "firesword")
      : undefined;
    const power = this.charges.powerstrike
      ? this.skills.find((s) => s.id === "powerstrike")
      : undefined;
    const range = (this.classId === "warrior" ? 48 : 36) + (fire?.range ?? 0);
    const front = this.facing();
    const targets = this.enemies.filter(
      (e) =>
        e.hp > 0 &&
        Math.hypot(e.x - this.player.x, e.y - this.player.y) <= range &&
        (!this.player.moving ||
          (e.x - this.player.x) * front.x + (e.y - this.player.y) * front.y >=
            0),
    );
    targets.sort(
      (a, b) =>
        (fire && a.kind === "boss" ? -1000 : 0) -
        (fire && b.kind === "boss" ? -1000 : 0) +
        Math.hypot(a.x - this.player.x, a.y - this.player.y) -
        Math.hypot(b.x - this.player.x, b.y - this.player.y),
    );
    const target = targets[0];
    if (!target) return false;
    this.meleeAim(targets);
    this.basicCD = this.classInfo.interval;
    this.player.attackUntil = this.clock + 0.35;
    const landed = this.physicalHit(target, power?.accuracy ?? 0);
    // Each charge modifies this one swing, including a missed swing. Never create
    // another attack or projectile; split the actual damage only for attribution.
    this.charges = {};
    revealActor(this, 0);
    if (!landed) return true;
    const passive = this.skills.find((s) =>
      ["swordsmanship", "spirit"].includes(s.id),
    );
    const dc = this.rollStat("dc");
    const parts = [
      { id: "basic", value: dc * (1 + (passive?.power ?? 0) / 100) },
      ...(power
        ? [
            {
              id: "powerstrike",
              value: (8 + dc * 0.5) * (1 + power.power / 100),
            },
          ]
        : []),
      ...(fire
        ? [{ id: "firesword", value: (24 + dc) * (1 + fire.power / 100) }]
        : []),
    ];
    const total = parts.reduce((n, p) => n + p.value, 0);
    const crit =
      this.rng.next() < (this.stats.crit_chance ?? 0) / 100
        ? 1.5 + (this.stats.crit_mult ?? 0)
        : 1;
    const raw =
      total *
      crit *
      (1 + (this.stats.dc_bonus_pct ?? 0) / 100) *
      (1 + (this.stats.all_damage_pct ?? 0) / 100);
    const damage = incomingDamage(
      raw,
      this.enemyDefense(target, "physical"),
      0,
    );
    const actual = Math.min(damage, target.hp);
    this.hit(target, damage, "basic");
    for (const part of parts.slice(1)) {
      const dealt = (actual * part.value) / total;
      this.damageDealt.basic -= dealt;
      this.damageDealt[part.id] = (this.damageDealt[part.id] ?? 0) + dealt;
    }
    for (const id of [power?.id, fire?.id])
      if (id)
        this.effect(
          id,
          this.player.x,
          this.player.y,
          range,
          0.35,
          this.player.dir,
        );
    return true;
  }
  private castWarrior(s: Skill, targets: Enemy[], manual: boolean) {
    if (s.id === "dash") {
      let aim = this.facing();
      const distance = 180 + s.range;
      if (!manual) {
        const nearby = targets.filter(
          (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) < 100,
        );
        if (
          !this.automaticDash ||
          nearby.length < 3 ||
          this.player.hp / this.maxHP >= 0.5
        )
          return false;
        let best = -1;
        for (let i = 0; i < 16; i++) {
          const candidate = {
            x: Math.cos((i * Math.PI) / 8),
            y: Math.sin((i * Math.PI) / 8),
          };
          const x = this.player.x + candidate.x * distance,
            y = this.player.y + candidate.y * distance;
          if (!this.freePoint(x, y, 90)) continue;
          // Never plan a path through or immediately beside a boss.
          if (
            targets.some(
              (e) =>
                e.kind === "boss" &&
                (Math.hypot(e.x - x, e.y - y) < 120 ||
                  this.distanceToSegment(e, this.player, { x, y }) <
                    Math.min(
                      120,
                      Math.hypot(e.x - this.player.x, e.y - this.player.y) - 1,
                    )),
            )
          )
            continue;
          let clear = true;
          for (let d = 8; d <= distance; d += 8)
            if (
              !this.freePoint(
                this.player.x + candidate.x * d,
                this.player.y + candidate.y * d,
                0,
              )
            ) {
              clear = false;
              break;
            }
          if (!clear) continue;
          const score = Math.min(
            ...targets.map((e) => Math.hypot(e.x - x, e.y - y)),
            1000,
          );
          if (score > best) {
            best = score;
            aim = candidate;
          }
        }
        if (best < 90) return false;
      }
      const from = { x: this.player.x, y: this.player.y };
      let wall = false;
      for (let d = 8; d <= distance + 7; d += 8) {
        const travel = Math.min(d, distance),
          x = from.x + aim.x * travel,
          y = from.y + aim.y * travel;
        if (!this.freePoint(x, y, 0)) {
          wall = true;
          break;
        }
        this.player.x = x;
        this.player.y = y;
        if (travel === distance) break;
      }
      for (const e of targets) {
        if (
          e.kind === "boss" ||
          e.elite ||
          (e.level ?? 1) > this.level + 2 ||
          this.distanceToSegment(e, from, this.player) >
            30 * (1 + s.radius / 100)
        )
          continue;
        const x = e.x + aim.x * 100,
          y = e.y + aim.y * 100;
        if (this.freePoint(x, y, 0)) {
          e.x = x;
          e.y = y;
        }
        e.windup = 0;
      }
      this.player.dir = this.direction(aim.x, aim.y);
      this.player.attackUntil = this.clock + 0.25;
      if (wall) this.hurt(8, "physical", true);
      return true;
    }
    if (s.id === "powerstrike" || s.id === "firesword") {
      if (
        this.charges[s.id] ||
        !targets.some(
          (e) =>
            Math.hypot(e.x - this.player.x, e.y - this.player.y) <=
            48 + (s.id === "firesword" ? s.range : 0),
        )
      )
        return false;
      this.charges[s.id] = true;
      return true;
    }
    if (this.clock < this.player.attackUntil) return false;
    const radius =
      (s.id === "thrust" ? 96 + s.range : 70) *
      (1 + (this.stats.skill_radius ?? 0) / 100);
    const near = targets.filter(
      (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) <= radius,
    );
    if (near.length < 2) return false;
    const aim = this.meleeAim(near);
    const hits = near.filter((e) => {
      const dx = e.x - this.player.x,
        dy = e.y - this.player.y;
      const along = dx * aim.x + dy * aim.y,
        across = Math.abs(dx * aim.y - dy * aim.x);
      if (s.id === "thrust")
        return (
          along > 0 &&
          across <= 12 + along * Math.tan((s.angle * Math.PI) / 180)
        );
      const angle = Math.acos(
        clamp(along / Math.max(1, Math.hypot(dx, dy)), -1, 1),
      );
      return angle <= (Math.min(230, 180 + s.angle) * Math.PI) / 360;
    });
    if (hits.length < 2) return false;
    for (const e of hits)
      if (this.physicalHit(e, s.accuracy))
        this.hit(
          e,
          incomingDamage(
            this.physicalDamage(s.id === "thrust" ? 12 : 8, s.power),
            this.enemyDefense(e, "physical"),
            0,
          ),
          s.id,
        );
    this.player.attackUntil = this.clock + 0.35;
    this.effect(
      s.id,
      this.player.x,
      this.player.y,
      radius,
      0.35,
      this.player.dir,
    );
    return true;
  }
  private distanceToSegment(
    point: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const u = clamp(
      ((point.x - a.x) * dx + (point.y - a.y) * dy) /
        Math.max(1, dx * dx + dy * dy),
      0,
      1,
    );
    return Math.hypot(point.x - a.x - dx * u, point.y - a.y - dy * u);
  }
  private targetList(s: Skill) {
    const weighted = [
      "lightning",
      "bigfireball",
      "holy",
      "talisman",
      "poison",
      "reveal",
    ].includes(s.id);
    return this.enemies
      .filter(
        (e) =>
          e.hp > 0 &&
          Math.hypot(e.x - this.player.x, e.y - this.player.y) < 620,
      )
      .sort((a, b) => {
        const priority = (e: Enemy) =>
          (weighted
            ? e.kind === "boss"
              ? -1000
              : e.elite
                ? -500
                : s.id === "poison"
                  ? -e.hp * 0.01
                  : 0
            : 0) + Math.hypot(e.x - this.player.x, e.y - this.player.y);
        return priority(a) - priority(b);
      });
  }
  effect(
    kind: Fx["kind"],
    x: number,
    y: number,
    radius = 0,
    life = 0.7,
    dir?: number,
  ) {
    this.effects.push({
      id: ++this.id,
      kind,
      x,
      y,
      radius,
      life,
      total: life,
      dir,
    });
    return this.effects.at(-1)!;
  }
  private isUndead(e: Enemy) {
    return ["scarecrow", "boss"].includes(e.kind);
  }
  private canTame(e: Enemy) {
    return (
      !e.elite &&
      e.kind !== "boss" &&
      ["cat", "rakecat", "orc"].includes(e.kind)
    );
  }
  freePoint(x: number, y: number, enemyClearance = 50) {
    return (
      x >= 35 &&
      x <= WORLD.w - 35 &&
      y >= 55 &&
      y <= WORLD.h - 35 &&
      SCENERY.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + 16) &&
      this.enemies.every(
        (e) => e.hp <= 0 || Math.hypot(x - e.x, y - e.y) > enemyClearance,
      )
    );
  }
  useTeleport() {
    const s = this.skills.find((s) => s.id === "teleport");
    if (s) this.cast(s);
  }
  useManualSkill() {
    const s = this.skills.find((s) => s.id === "teleport" || s.id === "dash");
    if (s) this.cast(s, true);
  }
  private teleport(s: Skill) {
    const candidates: Entity[] = [];
    for (let i = 0; i < 96; i++) {
      const x = 35 + this.rng.next() * (WORLD.w - 70),
        y = 55 + this.rng.next() * (WORLD.h - 90);
      if (
        this.freePoint(x, y, 60) &&
        Math.hypot(x - this.player.x, y - this.player.y) >= 200 + s.range
      )
        candidates.push({ id: 0, x, y });
    }
    if (!candidates.length) return false;
    const clearance = (point: Entity) =>
      Math.min(
        ...this.enemies
          .filter((e) => e.hp > 0)
          .map((e) => Math.hypot(point.x - e.x, point.y - e.y)),
        1000,
      );
    const pool =
      this.rng.next() < Math.min(0.9, 0.5 + s.chance / 100)
        ? candidates
            .sort((a, b) => clearance(b) - clearance(a))
            .slice(0, Math.max(1, Math.ceil(candidates.length / 4)))
        : candidates;
    const next = this.rng.pick(pool);
    this.effect("teleport", this.player.x, this.player.y);
    this.player.x = next.x;
    this.player.y = next.y;
    this.effect("teleport", next.x, next.y);
    return true;
  }
  private updatePets(dt: number) {
    for (const p of this.pets) {
      if (p.hp <= 0) continue;
      const source = p.source ?? "charm",
        skill = this.skills.find((s) => s.id === source);
      p.cd = Math.max(0, p.cd - dt);
      p.moving = false;
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) > 600) {
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8,
            x = this.player.x + Math.cos(a) * 65,
            y = this.player.y + Math.sin(a) * 65;
          if (this.freePoint(x, y, 0)) {
            p.x = x;
            p.y = y;
            break;
          }
        }
        revealActor(this, p.id);
      }
      const target = invisible(this, p.id)
        ? undefined
        : this.enemies
            .filter(
              (e) =>
                e.hp > 0 &&
                Math.hypot(e.x - this.player.x, e.y - this.player.y) < 600,
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - p.x, a.y - p.y) -
                Math.hypot(b.x - p.x, b.y - p.y),
            )[0];
      const destination = target ?? this.player,
        dx = destination.x - p.x,
        dy = destination.y - p.y,
        d = Math.hypot(dx, dy);
      if (d > 1) p.dir = this.direction(dx, dy);
      const range =
        source === "beast" ? 140 * (1 + (skill?.radius ?? 0) / 100) : 42;
      if (target && d < range && p.cd === 0) {
        revealActor(this, p.id);
        const sc = source === "charm" ? 0 : this.rollStat("sc") * 0.8;
        const damage = Math.round(
          (p.damage + sc) *
            (1 + (skill?.summonPower ?? 0) / 100) *
            (1 + (this.stats.summon_damage ?? 0) / 100) *
            (1 + (this.stats.all_damage_pct ?? 0) / 100) *
            (1 +
              (source === "charm" ? 0 : (this.stats.sc_bonus_pct ?? 0) / 100)),
        );
        if (source === "beast") {
          for (const e of this.enemies) {
            const ex = e.x - p.x,
              ey = e.y - p.y,
              length = Math.hypot(ex, ey);
            if (
              e.hp > 0 &&
              length <= range &&
              (ex * dx + ey * dy) / Math.max(1, length * d) >=
                Math.cos(Math.PI / 5)
            )
              this.hit(e, damage, source, "magic");
          }
          this.effect("beastflame", p.x, p.y, range, 0.6, p.dir);
        } else this.hit(target, damage, source, "physical");
        p.cd = source === "beast" ? 1.6 : 1.1;
        p.attackUntil = this.clock + 0.4;
      } else if (d > (target ? range * 0.75 : 80)) {
        const nx = clamp(
            p.x + (dx / Math.max(1, d)) * p.speed * dt,
            35,
            WORLD.w - 35,
          ),
          ny = clamp(
            p.y + (dy / Math.max(1, d)) * p.speed * dt,
            55,
            WORLD.h - 35,
          );
        if (this.freePoint(nx, p.y, 0)) p.x = nx;
        if (this.freePoint(p.x, ny, 0)) p.y = ny;
        p.moving = true;
        revealActor(this, p.id);
      }
    }
    this.pets = this.pets.filter((p) => p.hp > 0);
  }
  cast(s: Skill, manual = false) {
    if (this.phase !== "battle" || s.cd > 0 || getSkill(s.id).passive) return;
    const targets = this.targetList(s),
      rad = (n: number) =>
        n * (1 + s.radius / 100) * (1 + (this.stats.skill_radius ?? 0) / 100);
    if (
      getSkill(s.id).classId !== "taoist" &&
      !["teleport", "dash"].includes(s.id) &&
      !targets.length
    )
      return;
    let didCast = true;
    if (getSkill(s.id).classId === "taoist") {
      didCast = castTaoist(this, s, targets);
    } else if (getSkill(s.id).classId === "warrior") {
      didCast = this.castWarrior(s, targets, manual);
    } else if (s.id === "teleport") {
      didCast = this.teleport(s);
    } else if (s.id === "shield") {
      this.player.shieldUntil =
        this.clock + Math.min(7, 6 * (1 + s.duration / 100));
    } else if (s.id === "fireball" || s.id === "bigfireball") {
      for (const e of targets.slice(0, Math.min(3, 1 + s.count))) {
        const dx = e.x - this.player.x,
          dy = e.y - this.player.y,
          l = Math.max(1, Math.hypot(dx, dy)),
          speed =
            360 *
            (1 + (this.stats.projectile_speed ?? 0) / 100) *
            (1 + s.speed / 100);
        this.projectiles.push({
          id: ++this.id,
          x: this.player.x,
          y: this.player.y - 22,
          vx: (dx / l) * speed,
          vy: (dy / l) * speed,
          damage: this.magicDamage(s.id === "fireball" ? 7 : 22, s),
          life: 2,
          dir:
            (((Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) + 4) % 16) + 16) %
            16,
          skill: s.id,
          targetId: e.id,
        });
      }
    } else if (s.id === "lightning") {
      for (const e of targets.slice(0, Math.min(3, 1 + s.count))) {
        this.hit(e, this.magicDamage(15, s), s.id);
        this.effect("lightning", e.x, e.y, 0, 0.5);
      }
    } else if (s.id === "firewall") {
      const e = this.densest(targets, 100);
      const existing = this.effects.filter(
        (f) => f.kind === "firewall" && f.life > 0,
      );
      const cap = Math.min(4, 2 + s.count);
      if (existing.length >= cap) existing[0].life = 0;
      this.effect(
        "firewall",
        e.x + (this.player.x - e.x) * 0.2,
        e.y + (this.player.y - e.y) * 0.2,
        rad(64),
        6 * (1 + s.duration / 100) * (1 + (this.stats.duration ?? 0) / 100),
      );
    } else if (s.id === "repulse") {
      const nearby = targets.filter(
        (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) < rad(120),
      );
      if (!nearby.length) return;
      for (const e of nearby) {
        if (e.kind === "boss" || e.elite || (e.level ?? 1) > this.level + 2)
          continue;
        const dx = e.x - this.player.x,
          dy = e.y - this.player.y,
          d = Math.max(1, Math.hypot(dx, dy)),
          push = 110 * (1 + s.knockback / 100);
        e.x = clamp(e.x + (dx / d) * push, 25, WORLD.w - 25);
        e.y = clamp(e.y + (dy / d) * push, 50, WORLD.h - 25);
        e.windup = 0;
      }
      this.effect("repulse", this.player.x, this.player.y, rad(120));
    } else if (s.id === "charm") {
      if (this.pets.length >= Math.min(5, 2 + s.count)) return;
      const e = targets.find((e) => this.canTame(e));
      if (!e) return;
      this.effect("charm", e.x, e.y, 0, 1.1);
      if (
        this.rng.next() <
        clamp(
          0.35 + s.chance / 100 + (this.level - (e.level ?? 1)) * 0.02,
          0.1,
          0.85,
        )
      ) {
        this.enemies = this.enemies.filter((n) => n.id !== e.id);
        this.pets.push({
          id: ++this.id,
          kind: e.kind,
          source: "charm",
          baseMaxHp: e.maxHp * 4,
          x: e.x,
          y: e.y,
          hp: e.maxHp * 4,
          maxHp: e.maxHp * 4,
          damage: e.damage * 3 + 5,
          speed: Math.max(150, e.speed * 2),
          dir: e.dir,
          cd: 0.3,
          born: this.clock,
          attackUntil: 0,
        });
      }
    } else if (s.id === "holy") {
      const undead = targets.filter((e) => this.isUndead(e));
      if (!undead.length) return;
      for (const e of undead.slice(0, Math.min(3, 1 + s.count))) {
        if (e.elite || e.kind === "boss")
          this.hit(e, Math.min(e.maxHp * 0.15, this.magicDamage(30, s)), s.id);
        else if (
          this.rng.next() <
          clamp(
            0.35 + s.chance / 100 + (this.level - (e.level ?? 1)) * 0.025,
            0.1,
            0.9,
          )
        )
          this.hit(e, e.hp, s.id);
        this.effect("holy", e.x, e.y, 0, 1.1);
      }
    } else if (s.id === "hellfire" || s.id === "beam") {
      const length = (s.id === "hellfire" ? 240 : 520) + s.range,
        width = rad(s.id === "hellfire" ? 26 : 18),
        p = this.player;
      const count = (aim: Enemy) => {
        const dx = aim.x - p.x,
          dy = aim.y - p.y,
          l = Math.max(1, Math.hypot(dx, dy));
        return targets.filter((e) => {
          const along = ((e.x - p.x) * dx + (e.y - p.y) * dy) / l,
            across = Math.abs((e.x - p.x) * dy - (e.y - p.y) * dx) / l;
          return along >= 0 && along <= length && across < width;
        });
      };
      let aim = targets[0],
        hits = count(aim);
      for (const candidate of targets.slice(1, 40)) {
        const next = count(candidate);
        if (next.length > hits.length) {
          aim = candidate;
          hits = next;
        }
      }
      if (!hits.length) return;
      for (const e of hits)
        this.hit(e, this.magicDamage(s.id === "hellfire" ? 18 : 24, s), s.id);
      this.effect(
        s.id,
        p.x,
        p.y,
        length,
        0.55,
        this.direction(aim.x - p.x, aim.y - p.y),
      );
    } else if (s.id === "nova") {
      const nearby = targets.filter(
        (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) < rad(140),
      );
      if (nearby.length <= 3) return;
      for (const e of nearby) this.hit(e, this.magicDamage(20, s), s.id);
      this.effect("nova", this.player.x, this.player.y, rad(140));
    } else if (s.id === "explosion" || s.id === "ice") {
      const radius = rad(s.id === "ice" ? 110 : 80),
        center = this.densest(targets, radius);
      for (const e of targets)
        if (Math.hypot(e.x - center.x, e.y - center.y) < radius)
          this.hit(e, this.magicDamage(s.id === "ice" ? 25 : 20, s), s.id);
      this.effect(s.id, center.x, center.y, radius);
    }
    if (!didCast) return;
    s.cd = Math.max(
      s.id === "shield"
        ? 8
        : ["ghost", "armor"].includes(s.id)
          ? 14
          : s.id === "invisible"
            ? 12
            : s.id === "groupInvisible"
              ? 15
              : 0.4,
      getSkill(s.id).cooldown *
        (1 - (this.stats.cooldown_reduction ?? 0) / 100) *
        (1 - Math.min(60, s.localCDR) / 100),
    );
    if (this.classId !== "warrior") this.player.castUntil = this.clock + 0.25;
    if (targets[0] && !this.player.moving && s.id !== "dash")
      this.player.dir = this.direction(
        targets[0].x - this.player.x,
        targets[0].y - this.player.y,
      );
  }
  private densest(targets: Enemy[], radius: number) {
    let best = targets[0],
      max = -1;
    for (const e of targets.slice(0, 60)) {
      const count = targets.filter(
        (n) => (n.x - e.x) ** 2 + (n.y - e.y) ** 2 < radius * radius,
      ).length;
      if (count > max) {
        best = e;
        max = count;
      }
    }
    return best;
  }
  hit(
    e: Enemy,
    damage: number,
    skill: string,
    kind: "direct" | "physical" | "magic" = "direct",
  ) {
    if (e.hp <= 0 || this.phase !== "battle") return;
    if (kind !== "direct")
      damage = incomingDamage(damage, this.enemyDefense(e, kind), 0);
    if (damage <= 0) return;
    e.trapUntil = 0;
    for (const f of this.effects)
      if (f.kind === "trap" && f.targetId === e.id) f.life = 0;
    const dealt = Math.min(e.hp, damage);
    e.hp -= damage;
    e.hitAt = this.clock;
    this.damageDealt[skill] = (this.damageDealt[skill] ?? 0) + dealt;
    if (this.floating.length < 45)
      this.floating.push({
        id: ++this.id,
        x: e.x,
        y: e.y - 45,
        text: String(damage),
        color: skill === "lightning" ? "#e6dfb4" : "#edc384",
        life: 0.7,
      });
    if (e.hp <= 0) {
      this.kills++;
      this.waveKills++;
      if (e.kind === "boss") this.bossKilled = true;
      const gold =
        Math.round(
          (this.rng.next() < 0.65 ? 4 : 0) *
            (1 + (this.stats.gold_gain ?? 0) / 100),
        ) * (e.elite ? 4 : 1);
      const exp = Math.round(e.exp * (1 + (this.stats.exp_gain ?? 0) / 100));
      if (this.drops.length >= 300) {
        this.drops[0].exp += exp;
        this.drops[0].gold += gold;
      } else
        this.drops.push({
          id: ++this.id,
          x: e.x,
          y: e.y,
          exp,
          gold,
          born: this.clock,
        });
    }
  }
  hurt(raw: number, kind: "physical" | "magic" = "physical", force = false) {
    if (
      this.phase !== "battle" ||
      (!force && this.clock < this.player.hitUntil)
    )
      return;
    if (
      !force &&
      this.rng.next() <
        Math.min(
          35,
          this.classInfo.dodge +
            (this.stats.dodge ?? 0) +
            (this.stats.agility ?? 0) * 0.2,
        ) /
          100
    )
      return;
    const shield =
      this.clock < this.player.shieldUntil
        ? Math.min(
            0.35,
            0.2 +
              (this.skills.find((s) => s.id === "shield")?.shieldReduction ??
                0) /
                100,
          )
        : 0;
    const prefix = kind === "magic" ? "mdef" : "def";
    const damage = incomingDamage(
      raw,
      this.rollStat(prefix, false) +
        (this.stats[`${prefix}_flat`] ?? 0) +
        buffDefense(this, 0, kind),
      shield,
    );
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.hitUntil = this.clock + 0.45;
    this.floating.push({
      id: ++this.id,
      x: this.player.x,
      y: this.player.y - 60,
      text: "−" + damage,
      color: "#f18779",
      life: 0.9,
    });
    if (this.player.hp === 0) this.finish(false);
  }
  beginUpgrade() {
    this.exp -= expNeeded(this.level);
    this.level++;
    this.choices = this.makeChoices();
    this.phase = "upgrade";
    this.input = { x: 0, y: 0 };
    this.emit();
  }
  makeChoices(): Upgrade[] {
    const unlearned = SKILLS.filter(
      (s) =>
        s.classId === this.classId && !this.skills.some((a) => a.id === s.id),
    );
    const guaranteed = unlearned.find((s) =>
      ["lightning", "firewall", "shield"].includes(s.id),
    );
    const newSkill =
      guaranteed ?? (unlearned.length ? this.rng.pick(unlearned) : undefined);
    const candidates: Upgrade[] = [];
    if (newSkill)
      candidates.push({
        id: "learn-" + newSkill.id,
        kind: "skill",
        skill: newSkill.id as SkillId,
        name: newSkill.name,
        description: newSkill.description,
        value: 0,
      });
    for (const s of this.skills.filter((s) => s.rank < 3)) {
      const name = getSkill(s.id).name;
      for (const option of getSkill(s.id).branches)
        candidates.push({
          id: s.id + "-" + option.field,
          kind: "skill",
          skill: s.id,
          name: name + " · " + option.label,
          description: `升至 Lv.${s.rank + 1}，保留已有强化。`,
          field: option.field,
          value: option.value,
        });
    }
    const list: Upgrade[] = [];
    if (newSkill) list.push(candidates.shift()!);
    else if (candidates.length) list.push(this.rng.pick(candidates));
    const more = this.rng.shuffle(
      candidates.filter((c) => c.id !== list[0]?.id),
    );
    if (more.length) list.push(more[0]);
    const statOptions: Upgrade[] = (
      [
        {
          id: "stat-damage",
          kind: "stat",
          name:
            this.classId === "warrior"
              ? "武艺精进"
              : this.classId === "taoist"
                ? "道术精进"
                : "魔法精进",
          description:
            this.classId === "warrior"
              ? "物理伤害 +8%。"
              : this.classId === "taoist"
                ? "道术伤害与治疗 +8%。"
                : "全部法术伤害 +8%。",
          stat:
            this.classId === "warrior"
              ? "dc_bonus_pct"
              : this.classId === "taoist"
                ? "sc_bonus_pct"
                : "mc_bonus_pct",
          value: 8,
        },
        {
          id: "stat-hp",
          kind: "stat",
          name: "强健体魄",
          description: "最大生命 +12，并恢复 12 点生命。",
          stat: "hp_max",
          value: 12,
        },
        {
          id: "stat-pickup",
          kind: "stat",
          name: "拾取强化",
          description: "拾取范围 +20%，受软硬上限约束。",
          stat: "pickup_radius",
          value: 20,
        },
        {
          id: "stat-speed",
          kind: "stat",
          name: "轻装强化",
          description: "移动速度 +5%，最高有效加成 35%。",
          stat: "move_speed",
          value: 5,
        },
        {
          id: "stat-def",
          kind: "stat",
          name: "防御强化",
          description: "防御 +2，所有减伤叠加后最高 65%。",
          stat: "def_flat",
          value: 2,
        },
        {
          id: "stat-cd",
          kind: "stat",
          name: "施法加速",
          description: "冷却缩减 +3%，最高有效加成 40%。",
          stat: "cooldown_reduction",
          value: 3,
        },
      ] satisfies Upgrade[]
    ).filter(
      (c) =>
        effective(c.stat!, (this.rawStats[c.stat!] ?? 0) + c.value) >
        (this.stats[c.stat!] ?? 0),
    );
    for (const c of this.rng.shuffle(statOptions))
      if (list.length < 3) list.push(c);
    return list;
  }
  choose(id: string) {
    if (this.phase !== "upgrade") return;
    const c = this.choices.find((c) => c.id === id);
    if (!c) return;
    if (c.kind === "skill") {
      let s = this.skills.find((s) => s.id === c.skill);
      if (!s) {
        if (this.skills.length >= 6) {
          this.pendingSkill = c.skill!;
          this.phase = "replace";
          this.emit();
          return;
        }
        this.skills.push(this.newSkill(c.skill!));
      } else {
        if (s.rank >= 3 || !c.field) return;
        s.rank++;
        s[c.field] += c.value;
      }
    } else {
      this.upgrades[c.stat!] = (this.upgrades[c.stat!] ?? 0) + c.value;
      this.recompute();
      if (c.stat === "hp_max")
        this.player.hp = Math.min(this.maxHP, this.player.hp + c.value);
    }
    this.recompute();
    this.choices = [];
    this.phase = "battle";
    if (this.exp >= expNeeded(this.level)) this.beginUpgrade();
    else this.emit();
  }
  replaceSkill(index: number | null) {
    if (this.phase !== "replace" || !this.pendingSkill) return false;
    if (index !== null) {
      if (!Number.isInteger(index) || index < 0 || index >= this.skills.length)
        return false;
      const old = this.skills[index];
      if (old.id === "powerstrike" || old.id === "firesword")
        delete this.charges[old.id];
      clearTaoSkill(this, old.id);
      if (old.id === "charm")
        this.pets = this.pets.filter((p) => p.source && p.source !== "charm");
      if (old.id === "shield") this.player.shieldUntil = 0;
      this.effects = this.effects.filter((f) => f.kind !== old.id);
      this.skills[index] = this.newSkill(this.pendingSkill);
    }
    this.pendingSkill = null;
    this.choices = [];
    this.phase = "battle";
    if (this.exp >= expNeeded(this.level)) this.beginUpgrade();
    else this.emit();
    return true;
  }
  endWave() {
    if (this.phase !== "battle") return;
    let exp = 0,
      gold = 0;
    for (const d of this.drops) {
      exp += d.exp;
      gold += d.gold;
    }
    this.exp += exp;
    const reclaim = Math.floor(gold * 0.5);
    this.gold += reclaim;
    this.totalGold += reclaim;
    this.waveGold += reclaim;
    this.drops = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    if (this.exp >= expNeeded(this.level)) {
      this.beginUpgrade();
      return;
    }
    if (this.wave === this.maxWaves) {
      this.finish(this.bossKilled);
      return;
    }
    this.lastWaveGold = this.waveGold;
    this.lastWaveKills = this.waveKills;
    this.phase = "shop";
    this.rerolls = 0;
    this.generateOffers(true);
    this.input = { x: 0, y: 0 };
    this.emit();
  }
  validItem(item: Item) {
    if (item.classId && item.classId !== this.classId) return false;
    if (
      this.classId === "warrior" &&
      Object.keys(item.stats).some((key) =>
        ["mc_bonus_pct", "projectile_speed"].includes(key),
      )
    )
      return false;
    if (item.kind === "passive") {
      if (this.classId !== "wizard" && "mc_bonus_pct" in item.stats)
        return false;
      if (
        this.classId !== "taoist" &&
        ("sc_bonus_pct" in item.stats || "healing_received" in item.stats)
      )
        return false;
      if (
        this.classId === "warrior" &&
        ("summon_damage" in item.stats || "summon_hp" in item.stats)
      )
        return false;
      if (
        item.maxCount !== null &&
        (this.passives[item.id] ?? 0) >= item.maxCount
      )
        return false;
      if (
        Object.entries(item.stats).every(
          ([k, v]) =>
            effective(k as StatKey, (this.rawStats[k as StatKey] ?? 0) + v) <=
            (this.stats[k as StatKey] ?? 0),
        )
      )
        return false;
    }
    return item.kind !== "heal" || this.player.hp < this.maxHP;
  }
  generateOffers(keep: boolean) {
    const retained = keep ? this.offers.filter((o) => o.locked && !o.sold) : [];
    const tier = this.wave >= 7 ? 4 : this.wave >= 3 ? 3 : 1;
    const pool = ITEMS.filter((x) => x.tier <= tier && this.validItem(x));
    this.offers = retained;
    for (let i = retained.length; i < 4; i++) {
      const choices = pool.filter(
        (x) =>
          !this.offers.some((o) => o.itemId === x.id) &&
          (i !== 0 || x.kind === "passive"),
      );
      const item = this.rng.pick(choices.length ? choices : pool);
      this.offers.push({
        id: ++this.id,
        itemId: item.id,
        price: Math.round(item.price * (1 + 0.045 * (this.wave - 1))),
        locked: false,
        sold: false,
      });
    }
  }
  equipmentSlot(item: Item): Slot {
    const slots = SLOT_KEYS.filter(
      (s) =>
        s === item.slot ||
        s.startsWith(
          item.slot === "bracelet"
            ? "bracelet"
            : item.slot === "ring"
              ? "ring"
              : "~",
        ),
    );
    return slots.find((s) => !this.equipment[s]) ?? slots[0];
  }
  buy(id: number) {
    if (this.phase !== "shop") return false;
    const offer = this.offers.find((o) => o.id === id);
    if (!offer || offer.sold || this.gold < offer.price) return false;
    const item = getItem(offer.itemId);
    if (!this.validItem(item)) return false;
    this.gold -= offer.price;
    offer.sold = true;
    offer.locked = false;
    if (item.kind === "equipment") {
      const slot = this.equipmentSlot(item);
      const old = this.equipment[slot];
      if (old) this.gold += sellPrice(old.paid, getItem(old.itemId).price);
      this.equipment[slot] = { itemId: item.id, paid: offer.price };
    } else if (item.kind === "passive")
      this.passives[item.id] = (this.passives[item.id] ?? 0) + 1;
    else this.player.hp = Math.min(this.maxHP, this.player.hp + 35);
    this.recompute();
    this.emit();
    return true;
  }
  sell(slot: Slot) {
    if (this.phase !== "shop") return false;
    const e = this.equipment[slot];
    if (!e) return false;
    this.gold += sellPrice(e.paid, getItem(e.itemId).price);
    delete this.equipment[slot];
    this.recompute();
    this.emit();
    return true;
  }
  lock(id: number) {
    if (this.phase !== "shop") return;
    const o = this.offers.find((o) => o.id === id);
    if (o && !o.sold) {
      o.locked = !o.locked;
      this.emit();
    }
  }
  reroll() {
    if (this.phase !== "shop" || this.gold < this.cooldownCost) return false;
    this.gold -= this.cooldownCost;
    this.rerolls++;
    this.generateOffers(true);
    this.emit();
    return true;
  }
  nextWave() {
    if (this.phase !== "shop") return;
    this.wave++;
    this.waveTime = 0;
    this.waveGold = 0;
    this.waveKills = 0;
    this.spawned = 0;
    this.spawnTimer = 0.25;
    this.phase = "battle";
    this.emit();
  }
  finish(won: boolean) {
    if (this.result) return;
    this.phase = won ? "won" : "dead";
    this.result = {
      classId: this.classId,
      runId: this.runId,
      mode: this.mode,
      seed: this.seed,
      won,
      wave: this.wave,
      kills: this.kills,
      seconds: this.clock,
      level: this.level,
      gold: this.totalGold,
      crystals: this.mode === "normal" && won ? 3 : 0,
      skillDamage: { ...this.damageDealt },
      healing: { ...this.tao.healing },
      skills: this.skills.map((s) => `${getSkill(s.id).name} Lv.${s.rank}`),
    };
    this.input = { x: 0, y: 0 };
    this.emit();
  }
}
export const game = new Game();
