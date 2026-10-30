import {
  ITEMS,
  MONSTERS,
  SKILLS,
  SCENERY,
  CHAPTER_PRESSURE, NATIVE_ELITES, waveSpawnBudget,
  EXPANSION_RANGED,
  SLOT_KEYS,
  getItem,
  getSkill,
  MAPS,
  MAP_SCENERY,
  type Bonuses,
  type SkillId,
  type StatKey,
  type Slot,
  type Item,
  type MapId,
  isBossKind,
  PLAYABLE_MAP_IDS,
} from "./content";
import {updateRangedEnemy} from "./enemy-ai";
import {updateExpansionEnemy} from "./expansion-enemies";
import {appendLoot,collectLoot,healthDrop} from "./loot";
import {newPotionState,useBloodPotion,canCollectPotion} from "./potions";
import {ATTACK_CADENCE,outputScale} from "./cadence";
import {monsterSoundKey,type MonsterSoundEvent} from "./monster-audio";
import {newCombatRecovery,recoverHit,type DamageOrigin,type CombatHealing} from "./combat-recovery";
import {newDamageTaken,recordDamageTaken,type DamageTaken} from "./damage-taken";
import { TEMPLE_RANGED, updateTempleEnemy } from "./temple";
import type { SkillField } from "./spells";
import {MAX_SKILL_RANK,FINAL_RANK_WAVE,canonicalBonuses,skillExtras,canAdvanceSkill,nextSkillLabel,bookAvailable,bookPrice,bookName} from "./skill-growth";
import {newTraining,trainingReward} from "./training";
import {skillCooldown} from "./skill-metrics";
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
import { canStand, getWorldLayout, WorldNavigation } from "./world";
import { hasWorldAppearance } from "./appearance";
import {isPrimaryWeaponUpgrade} from "./equipment";
import { newTestSettings } from "./test-mode";
import { CLASSES, type ClassId } from "./classes";
import { talentBonuses, sanitizeTalents, type TalentId } from "./talents";
import {
  RUN_CHECKPOINT_VERSION,
  sanitizeCheckpoint,
  type RunCheckpoint,
} from "./checkpoint";
import {
  Rng,
  PET_HIT_WINDOW,
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
export type Mode = "normal" | "trial" | "test";
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
  revealDetails?: boolean;
  lastSeen?: { id: number; x: number; y: number; until: number };
  /** Boss 当前阶段（1=普通，2=狂暴） */
  bossPhase?: number;
  /** Boss 跳跃：目标位置与下次可跳时间（>clock 为空中中） */
  bossJumpTarget?: { x: number; y: number };
  bossJumpUntil?: number;
  /** Boss 召唤冷却 */
  bossSummonCD?: number;
  /** Boss 跳跃冷却 */
  bossJumpCD?: number;
  bossJumpWindupUntil?: number;
  bossJumpOrigin?: {x:number;y:number};
  /** 精英远程攻击 */
  ranged?: boolean;
  rangedCD?: number;
  /** 精英冲锋 */
  chargeUntil?: number;
  chargeTarget?: { x: number; y: number };
  chargeWindupUntil?: number;
  chargeCD?: number;
  stompAt?: number;
  stompOrigin?: { x: number; y: number };
  stompCD?: number;
  staggerUntil?: number;
  dormant?: boolean;
  awakenAt?: number;
  rangedTarget?: { x: number; y: number };
  rangedFireAt?: number;
  shockCD?: number;
  shock?: { origin: {x:number;y:number}; target: {x:number;y:number}; at:number; remaining:number };
  summoned?: boolean;
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
  hitUntil?: number;
  hitDamage?: number;
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
  enemyKind?: string;
  homing?: boolean;
  faction?: "enemy";
  visual?: "poison" | "arrow" | "womaFlame";
  damageKind?: "physical" | "magic";
  height?: number;
};
export type Drop = Entity & {
  exp: number;
  gold: number;
  born: number;
  itemId?: string;
  heal?:number;
  level?:number;
  count?:number;
};
export type Fx = Entity & {
  kind: SkillId | "hit" | "cast" | "beastflame" | "talismanHit" | "womaShock" | "overlordBlade" | "overlordDeath";
  dir?: number;
  life: number;
  total: number;
  radius: number;
  targetId?: number;
  width?: number;
  spread?: number;
  aimAngle?: number;
};
export type Floating = Entity & { text: string; color: string; life: number };
export type Skill = {
  id: SkillId;
  focusTarget?: number;
  rank: number;
  cd: number;
  retryAt?: number;
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
export type BookOffer = {id:number;skill:SkillId;price:number;wave:number;sold:boolean};
export type Equipped = { itemId: string; paid: number };
export type RunResult = {
  classId?: ClassId;
  mapId?: MapId;
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
  purchases?: Record<string, number>;
  rerolls?: number;
  healing?: Record<string, number>;
  combatHealing?: CombatHealing;
  damageTaken?: DamageTaken;
  skills: string[];
  skillBooks?: string[];
  trainingExp?: number;
};
export class Game {
  private nav: WorldNavigation | null = null;
  get layout() { return getWorldLayout(this.mapId); }
  get navigation() {
    if (this.layout !== this.nav?.layout) this.nav = this.layout ? new WorldNavigation(this.layout) : null;
    return this.nav;
  }
  canStand(x: number, y: number, radius = 12) { return canStand(x, y, radius, this.layout); }
  classId: ClassId = "wizard";
  mapId: MapId = "biche";
  unlockedMaps: Set<MapId> = new Set(["biche"]);
  crystals = 0;
  tao = createTaoState();
  potions=newPotionState();
  test = newTestSettings();
  audioEvents: string[] = [];
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
  /** Shop purchases this run, keyed by item id. */
  purchases: Record<string, number> = {};
  combatRecovery=newCombatRecovery();
  damageTaken=newDamageTaken();
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
    attackDir: 4,
  };
  skills: Skill[] = [];
  pets: Pet[] = [];
  pendingSkill: SkillId | null = null;
  pendingBook: number | null = null;
  bookOffer: BookOffer | null = null;
  booksBought: SkillId[] = [];
  bookWish: SkillId | null = null;
  skillFocus: SkillId | null = null;
  focusMisses = 0;
  training=newTraining();
  legacyGrowth: RunCheckpoint["legacyGrowth"] = null;
  automaticTeleport = false;
  automaticDash = true;
  warriorFourSlot = false;
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
  /** Permanent cross-run talent levels and the stat bonuses they derive. */
  talents: Record<TalentId, number> = sanitizeTalents(undefined);
  talentBonuses: Bonuses = {};
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
  get maxSkills() {
    return this.classId === "warrior" && this.warriorFourSlot ? 4 : 6;
  }
  get scenery() {
    return MAP_SCENERY[this.mapId];
  }
  sound(key: string) {
    if(key==="hurt" && this.audioEvents.includes("death"))return;
    if(key==="death")this.audioEvents=this.audioEvents.filter(event=>event!=="hurt");
    if(key==="hurt" || key==="death") {
      this.audioEvents.unshift(key);this.audioEvents.length=Math.min(24,this.audioEvents.length);
    }else if (this.audioEvents.length < 24) this.audioEvents.push(key);
  }
  monsterSound(e:Enemy,event:MonsterSoundEvent) {
    if(Math.hypot(e.x-this.player.x,e.y-this.player.y)>this.detectionRange)return;
    const key=monsterSoundKey(e.kind,event);
    if(event==="death")this.audioEvents=this.audioEvents.filter(k=>k!==monsterSoundKey(e.kind,"hurt"));
    if(this.audioEvents.includes(key))return;
    const monsterEvents=this.audioEvents.filter(k=>k.startsWith("monster:"));
    if(monsterEvents.length>=6) {
      const replace=event==="death" ? monsterEvents.find(k=>!k.endsWith(":death")) : undefined;
      if(!replace)return;
      this.audioEvents.splice(this.audioEvents.indexOf(replace),1);
    }
    this.sound(key);
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
  get obstacles(): typeof SCENERY {
    return this.layout ? [] : this.scenery;
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
  selectMap(mapId: MapId) {
    if (this.phase !== "lobby" || !PLAYABLE_MAP_IDS.includes(mapId)) return;
    this.mapId = mapId;
    this.emit();
  }
  applyProgress(progress: { crystals: number; unlockedMaps: MapId[]; talents?: Partial<Record<TalentId, number>> }) {
    this.crystals = progress.crystals;
    this.unlockedMaps = new Set(["biche", ...progress.unlockedMaps]);
    this.talents = sanitizeTalents(progress.talents);
    this.talentBonuses = talentBonuses(this.talents);
    this.recompute();
    this.emit();
  }
  get spawnBudget() { return waveSpawnBudget(this.mapId,this.wave,this.mode==="trial"); }
  get duration() {
    return this.mode === "trial" ? 35 : 75;
  }
  get maxWaves() {
    return this.mode === "trial" ? 3 : 12;
  }
  get boss() {
    return this.enemies.find((e) => isBossKind(e.kind) && e.hp > 0);
  }
  get cooldownCost() {
    return rerollPrice(this.rerolls);
  }
  get shopLocksRemaining() {
    return Math.max(0,2-this.offers.filter(o=>o.locked && !o.sold).length);
  }
  get moveSpeed() {
    return this.classInfo.speed * (1 + (this.stats.move_speed ?? 0) / 100);
  }
  get pickupRadius() {
    return 70 * (1 + (this.stats.pickup_radius ?? 0) / 100);
  }
  get detectionRange() { return 300*(1+(this.stats.detection_range??0)/100); }
  newSkill(id: SkillId, rank = 1): Skill {
    return {
      id,
      rank: clamp(Math.floor(rank),1,MAX_SKILL_RANK),
      cd: 0.3,
      ...canonicalBonuses(id,rank),
    };
  }
  start(mode: Mode, seed = 176, classId: ClassId = this.classId, warriorFourSlot = false, mapId: MapId = this.mapId) {
    if (!PLAYABLE_MAP_IDS.includes(mapId)) return;
    if (mode === "normal" && !this.unlockedMaps.has(mapId)) return;
    this.classId = classId;
    this.mapId = mapId;
    this.mode = mode;
    this.warriorFourSlot = warriorFourSlot;
    this.test = newTestSettings();
    this.audioEvents = [];
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
    let spawn = this.layout?.spawn ?? { x: WORLD.w / 2, y: WORLD.h / 2 };
    const safe = (p: { x: number; y: number }) => this.canStand(p.x, p.y) && this.obstacles.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > o.r + 12);
    if (!safe(spawn)) spawn = Array.from({length:32}, (_, i) => ({
      x: WORLD.w / 2 + Math.cos(i * Math.PI / 8) * (80 + Math.floor(i / 16) * 80),
      y: WORLD.h / 2 + Math.sin(i * Math.PI / 8) * (80 + Math.floor(i / 16) * 80),
    })).find(safe) ?? spawn;
    this.player = {
      x: spawn.x,
      y: spawn.y,
      hp: this.classInfo.hp,
      dir: 4,
      moving: false,
      hitUntil: 0,
      castUntil: 0,
      shieldUntil: 0,
      attackUntil: 0,
      attackDir: 4,
    };
    this.skills = [this.newSkill(this.classInfo.startingSkill)];
    this.basicCD = 0;
    this.charges = {};
    this.tao = createTaoState();
    this.potions=newPotionState();
    this.pets = [];
    this.pendingSkill = null;
    this.pendingBook=null;this.bookOffer=null;this.booksBought=[];this.bookWish=null;
    this.skillFocus=null;this.focusMisses=0;this.legacyGrowth=null;this.training=newTraining();
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.effects = [];
    this.floating = [];
    this.equipment = { weapon: { itemId: ITEMS.find((i) => i.name === "木剑")!.id, paid: 0 } };
    this.passives = {};
    this.upgrades = {};
    this.offers = [];
    this.choices = [];
    this.rerolls = 0;
    this.result = null;
    this.damageDealt = {};
    this.purchases = {};
    this.combatRecovery=newCombatRecovery();
    this.damageTaken=newDamageTaken();
    this.spawned = 0;
    this.spawnTimer = 0.25;
    this.waveKills = 0;
    this.waveGold = 0;
    this.notice = "";
    this.input = { x: 0, y: 0 };
    this.recompute();
    this.player.hp = this.maxHP;
    this.phase = "battle";
    this.emit();
  }
  lobby() {
    this.tao = createTaoState();
    this.audioEvents = [];
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
  private statSources(equipment:Partial<Record<Slot,Equipped>>=this.equipment) {
    return [
      this.classInfo.base,
      this.talentBonuses,
      this.upgrades,
      ...Object.values(equipment).map((e) => getItem(e.itemId).stats),
      ...Object.entries(this.passives).map(([id, n]) =>
        Object.fromEntries(
          Object.entries(getItem(id).stats).map(([k, v]) => [k, (v ?? 0) * n]),
        ),
      ),
    ];
  }
  previewEquipment(item:Item) {
    if(item.kind!=="equipment" || !this.validItem(item))return null;
    const equipment={...this.equipment,[this.equipmentSlot(item)]:{itemId:item.id,paid:0}};
    return combine(this.statSources(equipment));
  }
  recompute() {
    const sources=this.statSources();
    this.rawStats = sumBonuses(sources);
    this.stats = combine(sources);
    this.player.hp = Math.min(this.player.hp, this.maxHP);
    refreshSummons(this);
  }
  /** Stable wave-boundary state for refresh recovery; live combat is never saved. */
  snapshotCheckpoint(): RunCheckpoint | null {
    if (this.mode === "test") return null;
    if (!["battle", "shop", "upgrade", "replace"].includes(this.phase)) return null;
    if (this.phase === "battle" && (this.waveTime > 0.05 || this.spawned > 0)) return null;
    return {
      version: RUN_CHECKPOINT_VERSION,
      savedAt: Date.now(),
      mode: this.mode,
      classId: this.classId,
      mapId: this.mapId,
      warriorFourSlot: this.warriorFourSlot,
      seed: this.seed,
      rngState: this.rng.seed,
      runId: this.runId,
      phase: this.phase as RunCheckpoint["phase"],
      wave: this.wave,
      clock: this.clock,
      kills: this.kills,
      gold: this.gold,
      totalGold: this.totalGold,
      level: this.level,
      exp: this.exp,
      rerolls: this.rerolls,
      bossKilled: this.bossKilled,
      bossSpawned: this.bossSpawned,
      lastWaveGold: this.lastWaveGold,
      lastWaveKills: this.lastWaveKills,
      damageDealt: { ...this.damageDealt },
      purchases: { ...this.purchases },
      potions:{reserve:[...this.potions.reserve],cd:this.potions.cd},
      combatRecovery: {
        healing: { ...this.combatRecovery.healing },
        killReadyAt: this.combatRecovery.killReadyAt,
        killEvents: this.combatRecovery.killEvents.map((e) => ({ ...e })),
      },
      damageTaken: {
        physical: this.damageTaken.physical,
        magic: this.damageTaken.magic,
        sources: { ...this.damageTaken.sources },
      },
      player: { ...this.player },
      skills: this.skills.map((s) => ({ ...s })),
      pets: this.pets.map((p) => ({ ...p })),
      equipment: Object.fromEntries(
        Object.entries(this.equipment).map(([slot, e]) => [slot, { ...e! }]),
      ),
      passives: { ...this.passives },
      upgrades: { ...this.upgrades },
      offers: this.offers.map((o) => ({ ...o })),
      choices: this.choices.map((c) => ({ ...c })),
      pendingSkill: this.pendingSkill,
      pendingBook:this.pendingBook,bookOffer:this.bookOffer ? {...this.bookOffer} : null,
      booksBought:[...this.booksBought],bookWish:this.bookWish,skillFocus:this.skillFocus,
      focusMisses:this.focusMisses,legacyGrowth:this.legacyGrowth,training:{...this.training},
      nextEntityId: this.id + 1,
      tao: {
        poisonMode: this.tao.poisonMode,
        healPriority: this.tao.healPriority,
        healing: { ...this.tao.healing },
      },
      charges: { ...this.charges },
    };
  }
  /** Restore a validated checkpoint, replaying the current wave from its start. */
  resumeCheckpoint(value: unknown): boolean {
    const cp = sanitizeCheckpoint(value);
    if (!cp) return false;
    this.start(cp.mode, cp.seed, cp.classId, cp.warriorFourSlot, cp.mapId);
    if (this.mapId !== cp.mapId || this.phase !== "battle") return false;
    this.runId = cp.runId;
    this.rng = new Rng(cp.rngState);
    this.clock = cp.clock;
    this.wave = cp.wave;
    this.waveTime = 0;
    this.kills = cp.kills;
    this.gold = cp.gold;
    this.totalGold = cp.totalGold;
    this.level = cp.level;
    this.exp = cp.exp;
    this.rerolls = cp.rerolls;
    this.bossKilled = cp.bossKilled;
    this.bossSpawned = cp.bossSpawned;
    this.lastWaveGold = cp.lastWaveGold;
    this.lastWaveKills = cp.lastWaveKills;
    this.damageDealt = { ...cp.damageDealt };
    this.purchases = { ...cp.purchases };
    this.combatRecovery = {
      healing: { ...cp.combatRecovery.healing },
      killReadyAt: cp.combatRecovery.killReadyAt,
      killEvents: cp.combatRecovery.killEvents.map((e) => ({ ...e })),
    };
    this.damageTaken = {
      physical: cp.damageTaken.physical,
      magic: cp.damageTaken.magic,
      sources: { ...cp.damageTaken.sources },
    };
    this.id = cp.nextEntityId - 1;
    this.player = { ...cp.player };
    this.skills = cp.skills as Skill[];
    this.pets = cp.pets as Pet[];
    this.equipment = cp.equipment as Partial<Record<Slot, Equipped>>;
    this.passives = { ...cp.passives };
    this.upgrades = cp.upgrades;
    this.offers = cp.offers as Offer[];
    this.choices = cp.choices as Upgrade[];
    this.pendingSkill = cp.pendingSkill as SkillId | null;
    this.pendingBook=cp.pendingBook;this.bookOffer=cp.bookOffer as BookOffer|null;
    this.booksBought=cp.booksBought as SkillId[];this.bookWish=cp.bookWish as SkillId|null;
    this.skillFocus=cp.skillFocus as SkillId|null;this.focusMisses=cp.focusMisses;
    this.legacyGrowth=cp.legacyGrowth;this.training={...cp.training};
    if(cp.phase==="upgrade" && (!this.choices.length || this.choices.some(c=>c.field)))this.choices=this.makeChoices();
    if(cp.legacyGrowth)this.notice="旧技能已按等级迁移为六级成长；原强化已备份。";
    this.charges = cp.charges as Partial<Record<"powerstrike" | "firesword", boolean>>;
    this.tao.poisonMode = cp.tao.poisonMode;
    this.tao.healPriority = cp.tao.healPriority;
    this.tao.healing = { ...cp.tao.healing };
    this.potions={reserve:[...cp.potions.reserve],cd:cp.potions.cd};
    this.tao.buffs = {};
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.effects = [];
    this.floating = [];
    this.spawned = 0;
    this.spawnTimer = 0.25;
    this.waveKills = 0;
    this.waveGold = 0;
    this.result = null;
    this.recompute();
    this.player.hp = Math.min(cp.player.hp, this.maxHP);
    this.phase = cp.phase;
    this.input = { x: 0, y: 0 };
    this.emit();
    return true;
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
  useBloodPotion() {const used=useBloodPotion(this);if(used)this.emit();return used;}
  step(dt: number) {
    if (this.phase !== "battle") return;
    this.clock += dt;
    this.waveTime += dt;
    this.potions.cd=Math.max(0,this.potions.cd-dt);
    if(this.player.hp/this.maxHP<=.5)useBloodPotion(this);
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
        this.canStand(nx, this.player.y) &&
        this.obstacles.every(
          (o) => Math.hypot(nx - o.x, this.player.y - o.y) > o.r + 12,
        )
      )
        this.player.x = nx;
      if (
        this.canStand(this.player.x, ny) &&
        this.obstacles.every(
          (o) => Math.hypot(this.player.x - o.x, ny - o.y) > o.r + 12,
        )
      )
        this.player.y = ny;
      this.player.dir = this.direction(dx, dy);
    }
    if (this.player.moving) revealActor(this, 0);
    updateTaoist(this);
    const spawning = this.mode !== "test" || this.test.spawning;
    if (spawning) this.spawnTimer -= dt;
    const budget=this.spawnBudget;
    if (
      this.spawnTimer <= 0 &&
      this.spawned < budget &&
      spawning &&
      this.enemies.length < 300
    ) {
      this.spawnEnemy();
      this.spawned++;
      this.spawnTimer = this.duration / budget;
    }
    if (
      this.wave === this.maxWaves &&
      spawning &&
      !this.bossSpawned &&
      this.waveTime > Math.min(25, this.duration * 0.45)
    ) {
      this.spawnEnemy(MAPS[this.mapId].boss);
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
      if (isBossKind(e.kind) && e.hp <= e.maxHp * 0.5 && (e.bossPhase ?? 1) === 1) {
        e.bossPhase = 2; e.speed *= 1.25; e.damage *= 1.25;
      }
      if (updateExpansionEnemy(this,e,dt,victim) || updateRangedEnemy(this,e,dt,victim) || updateTempleEnemy(this,e,dt,victim)) continue;
      if (e.kind === "corpseKing" && this.updateCorpseKing(e, dt)) continue;
      if (e.kind === "boss") {
        e.bossSummonCD=Math.max(0,(e.bossSummonCD ?? 6)-dt);
        if(e.bossSummonCD===0){this.summonBossMinion(e);e.bossSummonCD=20;}
        if(e.bossJumpTarget) {
          if(this.clock<(e.bossJumpWindupUntil ?? 0)) {
            e.windup=(e.bossJumpWindupUntil ?? 0)-this.clock;continue;
          }
          const origin=e.bossJumpOrigin!,target=e.bossJumpTarget;
          if(this.clock<(e.bossJumpUntil ?? 0)) {
            const t=clamp((this.clock-(e.bossJumpWindupUntil ?? 0))/0.6,0,1);
            e.x=origin.x+(target.x-origin.x)*t;e.y=origin.y+(target.y-origin.y)*t;
            e.windup=0;continue;
          }
          e.x=target.x;e.y=target.y;
          if(Math.hypot(this.player.x-e.x,this.player.y-e.y)<110 && this.attackLineClear(e,this.player))this.hurt(e.damage*1.5,"magic",false,`${e.kind}:jump`);
          for(const pet of this.pets)if(pet.hp>0 && Math.hypot(pet.x-e.x,pet.y-e.y)<110 && this.attackLineClear(e,pet))this.hurtPet(pet,e.damage*1.5,"magic");
          e.bossJumpTarget=undefined;e.bossJumpOrigin=undefined;e.windup=0;e.attackCD=1;e.staggerUntil=this.clock+0.6;
          continue;
        }
        e.bossJumpCD=Math.max(0,(e.bossJumpCD ?? 4)-dt);
        if(e.bossJumpCD===0 && victim.visible && Math.hypot(victim.x-e.x,victim.y-e.y)<320 && this.startBossJump(e,victim)) {
          e.bossJumpCD=20;continue;
        }
      }
      const dx = victim.x - e.x,
        dy = victim.y - e.y,
        d = Math.hypot(dx, dy);
      e.dir = this.direction(dx, dy);
      // --- Elite special behaviors (GDD §11 / P4) ---
      e.chargeCD = Math.max(0, (e.chargeCD ?? 0) - dt);
      if (e.chargeTarget) {
        e.dir = this.direction(e.chargeTarget.x - e.x, e.chargeTarget.y - e.y);
        // The warning locks a position. It never tracks a sidestepping target.
        if (this.clock < (e.chargeWindupUntil ?? 0)) continue;
        if (this.clock < (e.chargeUntil ?? 0)) {
          const cx = e.chargeTarget.x - e.x, cy = e.chargeTarget.y - e.y;
          const length = Math.hypot(cx, cy), step = Math.min(length, e.speed * 4 * dt);
          const nx = e.x + cx / Math.max(1, length) * step;
          const ny = e.y + cy / Math.max(1, length) * step;
          if (this.canStand(nx, ny) && this.obstacles.every((o) => Math.hypot(nx - o.x, ny - o.y) > o.r + 12)) {
            e.x = nx; e.y = ny;
          } else e.chargeUntil = 0;
          const hit = [this.player, ...this.pets.filter((p) => p.hp > 0)]
            .find((a) => Math.hypot(a.x - e.x, a.y - e.y) < 32 && this.attackLineClear(e,a));
          if (hit) {
            if (hit === this.player) this.hurt(e.damage * 1.3,"physical",false,`${e.kind}:charge`);
            else this.hurtPet(hit as Pet, e.damage * 1.3, "physical");
            e.chargeUntil = 0;
          }
          if (length <= step) e.chargeUntil = 0;
          if ((e.chargeUntil ?? 0) > this.clock) continue;
        }
        e.chargeTarget = undefined;
        e.attackCD = e.kind === "womaBrave" ? 1.8 : 0.8;
        if(e.kind === "womaBrave")e.staggerUntil=this.clock+1.8;
        continue;
      }
      if ((e.elite || e.kind === "whiteBoar" || e.kind === "skeletonWarrior") && !e.ranged && victim.visible && d > 90 && d < (e.kind === "skeletonWarrior" ? 180 : 300) && e.chargeCD === 0 && e.windup === 0 && (!this.navigation || this.navigation.lineClear(e, victim))) {
        e.chargeTarget = { x: victim.x, y: victim.y };
        this.monsterSound(e,"attack");
        e.chargeWindupUntil = this.clock + (e.kind === "skeletonWarrior" ? 0.5 : 0.7);
        e.chargeUntil = this.clock + (e.kind === "skeletonWarrior" ? 1.1 : 1.6);
        e.chargeCD = 6;
        continue;
      }
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          const locked = e.attackTarget
            ? this.pets.find((p) => p.id === e.attackTarget && p.hp > 0)
            : this.player;
          if (
            locked &&
            canDetect(this, e, e.attackTarget ?? 0, locked) &&
            this.attackLineClear(e,locked) &&
            Math.hypot(locked.x - e.x, locked.y - e.y) <
              (isBossKind(e.kind) ? 105 : 46)
          ) {
            if (locked === this.player) this.hurt(e.damage,"physical",false,`${e.kind}:melee`);
            else {
              this.hurtPet(locked as Pet, e.damage, "physical");
            }
          }
          e.attackCD = isBossKind(e.kind) ? 1.5 : 1.1;
        }
        continue;
      }
      if (
        victim.visible &&
        d < (isBossKind(e.kind) ? 72 : 29) &&
        e.attackCD === 0 &&
        this.attackLineClear(e,victim)
      ) {
        e.attackTarget = victim.id;
        e.windup = isBossKind(e.kind) ? 0.65 : 0.4;
        this.monsterSound(e,"attack");
        continue;
      }
      if (d > (e.ranged ? 230 : 22) || (e.ranged && this.navigation && !this.navigation.lineClear(e, victim, 0))) {
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
        const waypoint = this.navigation?.waypoint(e,victim) ?? victim;
        const mx = waypoint.x - e.x, my = waypoint.y - e.y, length = Math.max(1, Math.hypot(mx, my));
        e.dir = this.direction(mx, my);
        const rush =
          ["rakecat", "caveMaggot"].includes(e.kind) && Math.sin(this.clock * 1.3 + e.id) > 0.8
            ? 1.8
            : 1;
        const sp = e.speed * rush;
        const nx = clamp(e.x + ((mx / length) * sp + sx) * dt, 35, WORLD.w - 35),
          ny = clamp(e.y + ((my / length) * sp + sy) * dt, 55, WORLD.h - 35);
        if (this.canStand(nx, e.y)) e.x = nx;
        if (this.canStand(e.x, ny)) e.y = ny;
        for (const o of this.obstacles) {
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
    this.basicCD = Math.max(0, this.basicCD - dt);
    // A prepared charge gets the brief reachable Boss window before a cone or
    // line attack can occupy the shared swing animation. All normal attack
    // gates, damage and one-time charge consumption remain in basicAttack.
    this.basicAttack(true);
    for (const s of this.skills) {
      if (getSkill(s.id).passive) continue;
      s.cd = Math.max(0, s.cd - dt);
      if (
        s.cd === 0 &&
        this.clock >= (s.retryAt ?? 0) &&
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
      const previous = { x: p.x, y: p.y };
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (this.navigation && !this.navigation.lineClear(previous, p, 0)) { p.life = 0; continue; }
      if (p.faction === "enemy") {
        const dx = p.x - previous.x, dy = p.y - previous.y;
        const lengthSquared = dx * dx + dy * dy;
        const target = [this.player, ...this.pets.filter((pet) => pet.hp > 0)]
          .map((actor) => {
            const fraction = clamp(((actor.x - previous.x) * dx + (actor.y - previous.y) * dy) / Math.max(1, lengthSquared), 0, 1);
            return { actor, fraction, distance: Math.hypot(actor.x - previous.x - dx * fraction, actor.y - previous.y - dy * fraction) };
          }).filter((a) => a.distance < 18).sort((a, b) => a.fraction - b.fraction)[0];
        if (target && p.life > 0) {
          if (target.actor === this.player) this.hurt(p.damage, p.damageKind ?? "magic",false,`${p.enemyKind ?? "enemy"}:projectile`);
          else this.hurtPet(target.actor as Pet, p.damage, p.damageKind ?? "magic");
          if (p.visual === "poison") this.effect("poison", target.actor.x, target.actor.y, 0, 0.5);
          p.life = 0;
        }
        continue;
      }
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
      if(d.heal && !canCollectPotion(this,d) && !d.exp && !d.gold)continue;
      if (l < this.pickupRadius + 12) {
        const speed = 480 * dt;
        d.x += (dx / Math.max(1, l)) * speed;
        d.y += (dy / Math.max(1, l)) * speed;
        if (l < speed + 12) {
          if(collectLoot(this,d))this.drops.splice(i, 1);
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
  spawnEnemy(kind?: string, summoned = false) {
    const eliteWave=this.mode==="trial" ? this.wave===2 : [4,7,10,12].includes(this.wave);
    const scheduledElite = eliteWave && this.spawned === Math.floor(this.spawnBudget/2);
    if (!kind && scheduledElite) {
      const native=MAPS[this.mapId].monsterPool.filter(id=>NATIVE_ELITES.includes(id));
      if(native.length)kind=native.length===1 ? native[0] : this.rng.pick(native);
    }
    let m;
    if (kind) m = MONSTERS.find((x) => x.id === kind)!;
    else {
      const map = MAPS[this.mapId];
      const nonBoss = map.monsterPool.filter((id) => !isBossKind(id) && !NATIVE_ELITES.includes(id))
        .map((id) => MONSTERS.find((m) => m.id === id)!);
      const pool = nonBoss.slice(
        0,
        // By wave five, the forest roster includes its armoured and ranged enemies.
        Math.min(nonBoss.length, this.wave + 1),
      );
      m = this.rng.pick(pool);
    }
    const a = this.rng.next() * Math.PI * 2,
      r = 440 + this.rng.next() * 140;
    const nativeElite = NATIVE_ELITES.includes(m.id);
    const elite = nativeElite || (!summoned && !isBossKind(m.id) && scheduledElite);
    const mult = 1 + (this.wave - 1) * 0.12;
    const hp = m.hp * (elite && !nativeElite ? 4 : 1) * mult;
    const candidates = this.navigation?.reachablePoints(this.player, 300, 620) ?? [];
    const point = candidates.length ? this.rng.pick(candidates) : {
      x: clamp(this.player.x + Math.cos(a) * r, 25, WORLD.w - 25),
      y: clamp(this.player.y + Math.sin(a) * r, 50, WORLD.h - 25),
    };
    if (this.navigation && !this.canStand(point.x, point.y)) Object.assign(point,
      this.rng.pick(this.navigation.reachablePoints(this.player, 80)) ?? this.layout!.spawn ?? this.player);
    this.enemies.push({
      id: ++this.id,
      kind: m.id,
      x: point.x,
      y: point.y,
      hp,
      maxHp: hp,
      speed: m.speed * (1 + this.wave * 0.025),
      damage: m.damage * (1 + (this.wave - 1) * 0.07),
      exp: m.exp * (elite && !nativeElite ? 5 : 1),
      dir: 4,
      windup: 0,
      attackCD: 0,
      hitAt: -1,
      burnAt: 0,
      elite,
      born: this.clock,
      summoned,
      ...(m.id === "zumaStatue" ? {dormant:true} : {}),
      ...(m.id === "chulong" ? {awakenAt:this.clock+1} : {}),
      level: this.wave,
      defense: m.id === "giantBug" ? 22 : m.id === "zumaGuard" ? 18 : isBossKind(m.id) ? 12 : ["orc", "orcWarrior", "orcBrave"].includes(m.id) ? 4 : 2,
      magicDefense: isBossKind(m.id) ? 8 : m.id === "orc" ? 2 : 1,
      ...(isBossKind(m.id)
        ? { bossPhase: 1, bossJumpUntil: 0 }
        : ["spider", "skeletonArcher", ...TEMPLE_RANGED,...EXPANSION_RANGED].includes(m.id) ? { ranged: true, rangedCD: 0 }
        : elite
          ? {
              ranged: !nativeElite && this.rng.next() < 0.3,
              rangedCD: 0,
              chargeUntil: 0,
            }
          : {}),
    });
    return this.enemies.at(-1)!;
  }
  private summonBossMinion(boss: Enemy) {
    for(let i=0;i<2 && this.enemies.length<300;i++) {
      const candidates=this.navigation?.reachablePoints(boss,70,140)
        .filter(p=>this.enemies.every(e=>e.hp<=0 || Math.hypot(e.x-p.x,e.y-p.y)>30));
      const angle=this.rng.next()*Math.PI*2+i*Math.PI;
      const point=candidates?.length ? this.rng.pick(candidates) : this.navigation ? null :
        {x:boss.x+Math.cos(angle)*100,y:boss.y+Math.sin(angle)*100};
      if(!point || !this.canStand(point.x,point.y) || this.obstacles.some(o=>Math.hypot(point.x-o.x,point.y-o.y)<o.r+12))continue;
      const add=this.spawnEnemy("scarecrow",true);add.x=point.x;add.y=point.y;
    }
  }
  private startBossJump(e: Enemy, victim: {x:number;y:number}) {
    const dx=victim.x-e.x,dy=victim.y-e.y,d=Math.max(1,Math.hypot(dx,dy));
    const intended={x:e.x+dx/d*Math.min(300,d),y:e.y+dy/d*Math.min(300,d)};
    const safe=(p:{x:number;y:number})=>this.canStand(p.x,p.y) && this.obstacles.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>o.r+12);
    const candidates=this.navigation?.reachablePoints(e,0,320).filter(safe);
    const target=safe(intended) && (!this.navigation || this.navigation.connected(e,intended)) ? intended :
      candidates?.sort((a,b)=>Math.hypot(a.x-intended.x,a.y-intended.y)-Math.hypot(b.x-intended.x,b.y-intended.y))[0];
    if(!target)return false;
    e.bossJumpOrigin={x:e.x,y:e.y};e.bossJumpTarget={...target};
    e.bossJumpWindupUntil=this.clock+0.8;e.bossJumpUntil=this.clock+1.4;
    e.dir=this.direction(target.x-e.x,target.y-e.y);e.windup=0.8;
    this.monsterSound(e,"attack");
    return true;
  }
  private updateCorpseKing(e: Enemy, dt: number) {
    e.bossSummonCD = Math.max(0, (e.bossSummonCD ?? 4) - dt);
    e.stompCD = Math.max(0, (e.stompCD ?? 5) - dt);
    if (e.bossSummonCD === 0) {
      for (let i = 0; i < 2 && this.enemies.length < 300; i++) {
        const points = this.navigation?.reachablePoints(e, 70, 160)
          .filter((p) => Math.hypot(p.x - this.player.x, p.y - this.player.y) > 70);
        if (this.navigation && !points?.length) continue;
        const point = points?.length ? this.rng.pick(points) : { x: e.x + (i ? -60 : 60), y: e.y + 50 };
        if (!this.canStand(point.x, point.y)) continue;
        const minion = this.spawnEnemy("zombie", true);
        minion.x = point.x; minion.y = point.y;
      }
      e.bossSummonCD = 20;
    }
    if (e.stompAt !== undefined) {
      if (this.clock >= e.stompAt) {
        const origin = e.stompOrigin!;
        if (Math.hypot(this.player.x - origin.x, this.player.y - origin.y) < 130 && this.attackLineClear(origin,this.player))
          this.hurt(e.damage * 1.4, "physical",false,`${e.kind}:stomp`);
        for (const pet of this.pets) if (pet.hp > 0 && Math.hypot(pet.x - origin.x, pet.y - origin.y) < 130 && this.attackLineClear(origin,pet))
          this.hurtPet(pet, e.damage * 1.4, "physical");
        e.stompAt = undefined; e.stompOrigin = undefined; e.attackCD = 1;
      }
      return true;
    }
    if (e.stompCD === 0 && [this.player, ...this.pets].some((p) => p.hp > 0 && Math.hypot(p.x - e.x, p.y - e.y) < 190)) {
      e.stompAt = this.clock + 1;
      this.monsterSound(e,"attack");
      e.stompOrigin = { x: e.x, y: e.y };
      e.stompCD = e.bossPhase === 2 ? 6 : 9;
      e.windup = 0;
      return true;
    }
    return false;
  }
  fireEliteProjectile(e: Enemy, target: { x: number; y: number } = this.player) {
    const angle = Math.atan2(target.y-e.y,target.x-e.x);
    const arrow=["skeletonArcher","zumaArcher"].includes(e.kind);
    const poison=["spider",...EXPANSION_RANGED].includes(e.kind);
    const speed=poison ? 160 : 180;
    for (const offset of ["zumaArcher","evilSnake"].includes(e.kind) ? [-0.22,0,0.22] : [0]) {
      const a=angle+offset;
      this.projectiles.push({
        id:++this.id,x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        damage:["spider",...TEMPLE_RANGED].includes(e.kind) ? e.damage : Math.round(e.damage*0.8),
        life:3,dir:(((Math.round(a/(Math.PI/8))+4)%16)+16)%16,
        faction:"enemy",visual:poison ? "poison" : arrow ? "arrow" : e.kind==="flameWoma" ? "womaFlame" : undefined,
        damageKind:arrow ? "physical" : "magic",homing:false,hitChance:75,enemyKind:e.kind,
      });
    }
    this.effect("cast", e.x, e.y, 0, 0.5);
    e.windup = 0.35;
  }
  hurtPet(pet: Pet, raw: number, kind: "physical" | "magic") {
    if(this.phase!=="battle" || pet.hp<=0)return;
    const base = pet.source === "skeleton" ? 4 : pet.source === "beast" ? 8 : 0;
    const damage=incomingDamage(raw, base + buffDefense(this, pet.id, kind), 0);
    const within=this.clock<(pet.hitUntil ?? 0),previous=within ? pet.hitDamage ?? 0 : 0;
    // Coalesce the burst, while a stronger Boss hit still applies its remainder.
    // Smaller repeated hits never prolong the window or conceal a heavy attack.
    if(!within)pet.hitUntil=this.clock+PET_HIT_WINDOW;
    pet.hitDamage=Math.max(previous,damage);
    pet.hp = Math.max(0, pet.hp - Math.max(0,damage-previous));
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
    return Math.round(damage*outputScale(s.id));
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
  private meleeReachable(e: Enemy) {
    return this.attackLineClear(this.player,e);
  }
  attackLineClear(from: {x:number;y:number}, to: {x:number;y:number}) {
    return !this.navigation || this.navigation.lineClear(from,to,0);
  }
  private meleeAim(targets: Enemy[], turnWhileMoving = false) {
    if ((this.player.moving && !turnWhileMoving) || !targets.length) return this.facing();
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
    return damage*ATTACK_CADENCE;
  }
  basicAttack(chargedBossOnly = false) {
    if (
      this.phase !== "battle" ||
      this.basicCD > 0 ||
      this.clock < this.player.attackUntil ||
      chargedBossOnly && (this.classId !== "warrior" || !this.charges.powerstrike && !this.charges.firesword)
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
        (!chargedBossOnly || isBossKind(e.kind)) &&
        Math.hypot(e.x - this.player.x, e.y - this.player.y) <= range &&
        this.meleeReachable(e) &&
        (this.classId === "warrior" || !this.player.moving ||
          (e.x - this.player.x) * front.x + (e.y - this.player.y) * front.y >=
            0),
    );
    if(chargedBossOnly && !targets.length)return false;
    targets.sort(
      (a, b) =>
        ((fire || chargedBossOnly) && isBossKind(a.kind) ? -1000 : 0) -
        ((fire || chargedBossOnly) && isBossKind(b.kind) ? -1000 : 0) +
        Math.hypot(a.x - this.player.x, a.y - this.player.y) -
        Math.hypot(b.x - this.player.x, b.y - this.player.y),
    );
    const target = targets[0];
    if (!target) return false;
    // A warrior's automatic swing may face a close pursuer while input keeps
    // moving away. Cone/line skills retain their directional aiming rules.
    this.meleeAim(targets, this.classId === "warrior");
    const passiveHaste=this.skills.find(s=>s.id==="swordsmanship" || s.id==="spirit");
    this.basicCD = this.classInfo.interval*ATTACK_CADENCE*(1-(passiveHaste ? skillExtras(passiveHaste).basicHaste??0 : 0)/100);
    this.sound(this.equipment.weapon ? "attack" : "unarmed");
    this.player.attackUntil = this.clock + 0.35;
    this.player.attackDir = this.player.dir;
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
      ATTACK_CADENCE *
      crit *
      (1 + (this.stats.dc_bonus_pct ?? 0) / 100) *
      (1 + (this.stats.all_damage_pct ?? 0) / 100);
    const damage = incomingDamage(
      raw,
      this.enemyDefense(target, "physical"),
      0,
    );
    const actual = Math.min(damage, target.hp);
    this.hit(target, damage, "basic", "direct", "weapon");
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
                isBossKind(e.kind) &&
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
          isBossKind(e.kind) ||
          e.elite ||
          (e.level ?? 1) > this.level + 2 ||
          this.distanceToSegment(e, from, this.player) >
            30 * (1 + s.radius / 100)
        )
          continue;
        this.pushEnemy(e, aim.x, aim.y, 100);
        e.windup = 0;
      }
      this.player.dir = this.direction(aim.x, aim.y);
      this.player.attackUntil = this.clock + 0.25;
      this.player.attackDir = this.player.dir;
      if (wall) this.hurt(8, "physical", true,"recoil");
      return true;
    }
    if (s.id === "powerstrike" || s.id === "firesword") {
      if (
        this.charges[s.id] ||
        !targets.some(
          (e) =>
            Math.hypot(e.x - this.player.x, e.y - this.player.y) <=
            48 + (s.id === "firesword" ? s.range : 0) && this.meleeReachable(e),
        )
      )
        return false;
      this.charges[s.id] = true;
      return true;
    }
    if (this.clock < this.player.attackUntil) return false;
    const radius =
      (s.id === "thrust" ? 96 + s.range : 70*(1+s.radius/100)) *
      (1 + (this.stats.skill_radius ?? 0) / 100);
    const near = targets.filter(
      (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) <= radius && this.meleeReachable(e),
    );
    const solo=s.id==="thrust" && !!skillExtras(s).solo;
    const minimum=solo ? 1 : 2;
    if (near.length < minimum) return false;
    const autoAim=solo && !manual;
    if(autoAim) {
      const threat=(e:Enemy)=>isBossKind(e.kind) ? 2 : e.elite ? 1 : 0;
      near.sort((a,b)=>threat(b)-threat(a) ||
        Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y));
    }
    const hitsFor = (aim:{x:number;y:number}) => near.filter((e) => {
      const dx = e.x - this.player.x,
        dy = e.y - this.player.y;
      const along = dx * aim.x + dy * aim.y,
        across = Math.abs(dx * aim.y - dy * aim.x);
      if (s.id === "thrust")
        return (
          along > 0 &&
          across <= (12 + along * Math.tan((s.angle * Math.PI) / 180))*(1+(skillExtras(s).lineWidth??0)/100)
        );
      const angle = Math.acos(
        clamp(along / Math.max(1, Math.hypot(dx, dy)), -1, 1),
      );
      return angle <= (Math.min(230, 180 + s.angle) * Math.PI) / 360;
    });
    let aim = this.meleeAim(near,autoAim),cleaveDir:number|undefined;
    if(s.id==="cleave" && !manual) {
      // Compare the eight real attack directions by coverage, then threats.
      // Movement breaks ties but never overrides a clearly better group.
      const facing=this.player.dir;let bestScore=[-1,-1,-1,-Infinity];
      for(let dir=0;dir<8;dir++) {
        const angle=(dir-2)*Math.PI/4,candidate={x:Math.cos(angle),y:Math.sin(angle)},group=hitsFor(candidate);
        const score=[group.length,Number(group.some(e=>isBossKind(e.kind))),group.filter(e=>e.elite).length,Math.cos((dir-facing)*Math.PI/4)];
        const difference=score.findIndex((value,index)=>value!==bestScore[index]);
        if(difference>=0 && score[difference]>bestScore[difference]) {
          bestScore=score;aim=candidate;cleaveDir=dir;
        }
      }
    }
    const hits=hitsFor(aim);
    if (hits.length < minimum) return false;
    if(cleaveDir!==undefined)this.player.dir=cleaveDir;
    for (const e of hits)
      if (this.physicalHit(e, s.accuracy))
        this.hit(
          e,
          incomingDamage(
            this.physicalDamage(s.id === "thrust" ? 10 : 6, s.power),
            this.enemyDefense(e, "physical"),
            0,
          ),
          s.id,"direct","weapon",
        );
    this.player.attackUntil = this.clock + 0.35;
    this.player.attackDir = this.player.dir;
    const effect=this.effect(
      s.id,
      this.player.x,
      this.player.y,
      radius,
      0.35,
      this.player.dir,
    );
    if(s.id==="thrust")effect.aimAngle=Math.atan2(aim.y,aim.x);
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
    const targets=this.enemies
      .filter(
        (e) =>
          e.hp > 0 &&
          Math.hypot(e.x - this.player.x, e.y - this.player.y) <= this.detectionRange &&
          (s.id !== "poison" || (this.tao.poisonMode === "green"
            ? e.greenPoison?.until ?? 0 : e.redPoison?.until ?? 0) <= this.clock + 1) &&
          (!this.navigation || this.navigation.lineClear(this.player, e, 0)),
      )
      .sort((a, b) => {
        const priority = (e: Enemy) =>
          (weighted
            ? isBossKind(e.kind)
              ? -1000
              : e.elite
                ? -500
                : s.id === "poison"
                  ? -e.hp * 0.01
                  : 0
            : 0) + Math.hypot(e.x - this.player.x, e.y - this.player.y);
        return priority(a) - priority(b);
      });
    if(["fireball","bigfireball","talisman"].includes(s.id)) {
      const focus=targets.find(e=>e.id===s.focusTarget),first=targets[0];
      const threat=(e:Enemy)=>isBossKind(e.kind) ? 2 : e.elite ? 1 : 0;
      if(focus && first && threat(focus)>=threat(first) &&
        Math.hypot(focus.x-this.player.x,focus.y-this.player.y)<=Math.hypot(first.x-this.player.x,first.y-this.player.y)+150) {
        targets.splice(targets.indexOf(focus),1);targets.unshift(focus);
      }
      s.focusTarget=targets[0]?.id;
    }
    return targets;
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
  private pushEnemy(e: Enemy, dx: number, dy: number, distance: number) {
    const origin = { x: e.x, y: e.y };
    for (let travel = 8; travel <= distance + 7; travel += 8) {
      const step = Math.min(travel, distance);
      const x = clamp(origin.x + dx * step, 35, WORLD.w - 35), y = clamp(origin.y + dy * step, 55, WORLD.h - 35);
      if (!this.canStand(x, y) || this.obstacles.some((o) => Math.hypot(x-o.x,y-o.y) <= o.r+12)) break;
      e.x=x; e.y=y;
      if (step === distance) break;
    }
  }
  private isUndead(e: Enemy) {
    return ["scarecrow", "zombie", "skeleton", "skeletonWarrior", "skeletonArcher", "boss", "corpseKing", "womaWarrior", "womaBrave", "flameWoma", "womaLord", "zumaGuard", "zumaStatue", "zumaLord"].includes(e.kind);
  }
  private canTame(e: Enemy) {
    return (
      !e.elite &&
      !isBossKind(e.kind) &&
      ["cat", "rakecat", "orc", "orcWarrior", "spider", "caveMaggot"].includes(e.kind)
    );
  }
  freePoint(x: number, y: number, enemyClearance = 50, radius = 16) {
    return (
      this.canStand(x, y, radius) &&
      (!this.navigation || this.navigation.connected(this.player, { x, y })) &&
      x >= 35 &&
      x <= WORLD.w - 35 &&
      y >= 55 &&
      y <= WORLD.h - 35 &&
      this.obstacles.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + radius) &&
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
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) > 600 ||
          this.navigation && !this.navigation.connected(p,this.player)) {
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8,
            x = this.player.x + Math.cos(a) * 65,
            y = this.player.y + Math.sin(a) * 65;
          if (this.freePoint(x, y, 0) && (!this.navigation || this.navigation.connected(this.player,{x,y}))) {
            p.x = x;
            p.y = y;
            break;
          }
        }
        revealActor(this, p.id);
      }
      const range = source === "beast" ? 140 * (1 + (skill?.radius ?? 0) / 100) : 42;
      const candidates = invisible(this, p.id)
        ? []
        : this.enemies
            .filter(
              (e) =>
                e.hp > 0 &&
                Math.hypot(e.x - this.player.x, e.y - this.player.y) < 600 &&
                (!this.navigation || this.navigation.connected(p,e)),
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - p.x, a.y - p.y) -
                Math.hypot(b.x - p.x, b.y - p.y),
            );
      // Prioritize threats only among targets this pet can hit now. A distant
      // or wall-side Boss must not steal attacks from a visible nearby enemy.
      const attackable=candidates.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<range && this.attackLineClear(p,e));
      const target=attackable.find(e=>isBossKind(e.kind)) ?? attackable.find(e=>e.elite) ?? attackable[0] ?? candidates[0];
      const destination = target ?? this.player,
        dx = destination.x - p.x,
        dy = destination.y - p.y,
        d = Math.hypot(dx, dy);
      if (d > 1) p.dir = this.direction(dx, dy);
      const clear=!target || this.attackLineClear(p,target);
      if (target && d < range && clear && p.cd === 0) {
        revealActor(this, p.id);
        const sc = source === "charm" ? 0 : this.rollStat("sc") * 0.8;
        const damage = Math.round(
          (p.damage + sc) *
            outputScale(source) *
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
              length <= range && this.attackLineClear(p,e) &&
              (ex * dx + ey * dy) / Math.max(1, length * d) >=
                Math.cos(Math.PI / 5*(1+(skill ? skillExtras(skill).flameAngle??0 : 0)/100))
            )
              this.hit(e, damage, source, "magic", "summon");
          }
          this.sound("beastflame");
          const flame=this.effect("beastflame", p.x, p.y, range, 0.6, p.dir);
          flame.aimAngle=Math.atan2(dy,dx);
          flame.spread=1+(skill ? skillExtras(skill).flameAngle??0 : 0)/100;
        } else this.hit(target, damage, source, "physical", "summon");
        p.cd = (source === "beast" ? 1.6 : 1.1)*ATTACK_CADENCE*(1-(skill ? skillExtras(skill).petHaste??0 : 0)/100);
        p.attackUntil = this.clock + 0.4;
      } else if (!clear || d > (target ? range * 0.75 : 80)) {
        const waypoint = this.navigation?.waypoint(p,destination) ?? destination;
        const mx = waypoint.x - p.x, my = waypoint.y - p.y, length = Math.max(1, Math.hypot(mx, my));
        p.dir = this.direction(mx, my);
        const nx = clamp(
            p.x + (mx / length) * p.speed * dt,
            35,
            WORLD.w - 35,
          ),
          ny = clamp(
            p.y + (my / length) * p.speed * dt,
            55,
            WORLD.h - 35,
          );
        if (this.freePoint(nx, p.y, 0, 12)) p.x = nx;
        if (this.freePoint(p.x, ny, 0, 12)) p.y = ny;
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
    if (["fireball", "bigfireball", "talisman", "poison"].includes(s.id) && !targets.length) {
      s.retryAt = this.clock + 0.15;
      return;
    }
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
          y: this.player.y,
          height: 22,
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
      const candidates=[...targets],placed:{x:number;y:number}[]=[];
      for(let i=0;i<Math.min(3,1+s.count) && candidates.length;i++) {
        const e=this.densest(candidates,100);
        const point={x:e.x+(this.player.x-e.x)*0.2,y:e.y+(this.player.y-e.y)*0.2};
        if(this.canStand(point.x,point.y,0) && this.attackLineClear(this.player,point) &&
            placed.every(p=>Math.hypot(p.x-point.x,p.y-point.y)>=48)) {
          const existing=this.effects.filter(f=>f.kind==="firewall" && f.life>0);
          if(existing.length>=Math.min(4,2+s.count))existing[0].life=0;
          this.effect("firewall",point.x,point.y,rad(64),6*(1+s.duration/100)*(1+(this.stats.duration??0)/100));
          placed.push(point);
        }
        candidates.splice(0,candidates.length,...candidates.filter(n=>Math.hypot(n.x-e.x,n.y-e.y)>=60));
      }
      if(!placed.length)return;
    } else if (s.id === "repulse") {
      const nearby = targets.filter(
        (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) < rad(120),
      );
      if (!nearby.length) return;
      for (const e of nearby) {
        if (isBossKind(e.kind) || e.elite || (e.level ?? 1) > this.level + 2)
          continue;
        const dx = e.x - this.player.x,
          dy = e.y - this.player.y,
          d = Math.max(1, Math.hypot(dx, dy)),
          push = 110 * (1 + s.knockback / 100);
        this.pushEnemy(e, dx / d, dy / d, push);
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
        if (e.elite || isBossKind(e.kind))
          this.hit(e, Math.min(e.maxHp * 0.15, this.magicDamage(30, s)), s.id);
        else if (
          this.rng.next() <
          clamp(
            0.35 + s.chance / 100 + (this.level - (e.level ?? 1)) * 0.025,
            0.1,
            0.9,
          )
        )
          this.hit(e, e.hp, s.id, "direct", "execution");
        this.effect("holy", e.x, e.y, 0, 1.1);
      }
    } else if (s.id === "hellfire" || s.id === "beam") {
      const length = Math.min(this.detectionRange,(s.id === "hellfire" ? 240 : 520) + s.range),
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
      const lineFx=this.effect(
        s.id,
        p.x,
        p.y,
        length,
        s.id==="hellfire" ? 1 : 0.55,
        this.direction(aim.x - p.x, aim.y - p.y),
      );
      lineFx.width=width*2;lineFx.aimAngle=Math.atan2(aim.y-p.y,aim.x-p.x);
    } else if (s.id === "nova") {
      const nearby = targets.filter(
        (e) => Math.hypot(e.x - this.player.x, e.y - this.player.y) < rad(140),
      );
      if (nearby.length < 4-(skillExtras(s).triggerReduction??0)) return;
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
    if(s.id==="charm")refreshSummons(this);
    this.sound(s.id);
    s.cd = skillCooldown(s,this.stats.cooldown_reduction??0);
    if (this.classId !== "warrior") this.player.castUntil = this.clock + 0.25;
    if (targets[0] && !this.player.moving && getSkill(s.id).classId !== "warrior")
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
    origin: DamageOrigin = "spell",
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
    this.monsterSound(e,e.hp<=0 ? "death" : "hurt");
    e.hitAt = this.clock;
    this.damageDealt[skill] = (this.damageDealt[skill] ?? 0) + dealt;
    recoverHit(this,e,dealt,origin);
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
      if (e.kind===MAPS[this.mapId].boss) this.bossKilled = true;
      if(e.kind==="overlord")this.effect("overlordDeath",e.x,e.y,0,1.8);
      // Summoned reinforcements cannot become an infinite reward source.
      if (e.summoned) return;
      const gold =
        Math.round(
          (this.rng.next() < 0.65 ? Math.round(4*CHAPTER_PRESSURE[this.mapId]) : 0) *
            (1 + (this.stats.gold_gain ?? 0) / 100),
        ) * (e.elite ? 4 : 1);
      const exp = Math.round(e.exp * (1 + (this.stats.exp_gain ?? 0) / 100));
      // Elite drops a class-appropriate equipment item (GDD §10.4).
      let itemId: string | undefined;
      if (e.elite) {
        const candidates = ITEMS.filter(
          (it) =>
            it.kind === "equipment" &&
            hasWorldAppearance(it) &&
            (!it.classId || it.classId === this.classId) &&
            it.tier <= (this.wave >= 7 ? 4 : this.wave >= 3 ? 3 : 2),
        );
        if (candidates.length) itemId = this.rng.pick(candidates).id;
      } else if (isBossKind(e.kind)) {
        // Boss: one high-quality equipment draw (GDD §10.4).
        const candidates = ITEMS.filter(
          (it) =>
            it.kind === "equipment" &&
            hasWorldAppearance(it) &&
            (!it.classId || it.classId === this.classId) &&
            it.tier >= 3,
        );
        if (candidates.length) itemId = this.rng.pick(candidates).id;
      } else if (this.rng.next() < 0.005) {
        // Ordinary monster: ~0.5% low-tier equipment drop (within GDD 0.2-0.8%).
        const candidates = ITEMS.filter(
          (it) =>
            it.kind === "equipment" &&
            hasWorldAppearance(it) &&
            (!it.classId || it.classId === this.classId) &&
            it.tier <= 1,
        );
        if (candidates.length) itemId = this.rng.pick(candidates).id;
      }
      appendLoot(this.drops,{
          id: ++this.id,
          x: e.x,
          y: e.y,
          exp,
          gold,
          born: this.clock,
          itemId,
          level:e.level??this.wave,
        });
      const heal=healthDrop(e,()=>this.rng.next());
      if(heal){const point=this.canStand(e.x+18,e.y+8) ? {x:e.x+18,y:e.y+8} : {x:e.x,y:e.y};appendLoot(this.drops,{id:++this.id,...point,exp:0,gold:0,born:this.clock,heal,level:e.level??this.wave});}
    }
  }
  hurt(raw: number, kind: "physical" | "magic" = "physical", force = false, source = "unknown") {
    if (this.mode === "test" && this.test.god) return;
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
    const before = this.player.hp;
    this.player.hp = Math.max(0, this.player.hp - damage);
    const actual=before-this.player.hp;
    recordDamageTaken(this.damageTaken,kind,source,actual);
    this.player.hitUntil = this.clock + 0.45;
    this.sound(this.player.hp===0 ? "death" : "hurt");
    this.floating.push({
      id: ++this.id,
      x: this.player.x,
      y: this.player.y - 60,
      text: "−" + Math.ceil(actual),
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
    const early = this.classId === "wizard" ? ["lightning","firewall","shield"] :
      this.classId === "warrior" ? ["cleave","thrust"] : ["skeleton","poison"];
    const guaranteed = this.level<=4 ? early.map(id=>unlearned.find(s=>s.id===id)).find(Boolean) : undefined;
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
    const advances:Upgrade[]=this.skills.filter(s=>canAdvanceSkill(s,this.wave,this.mode==="test")).map(s=>({
      id:`advance-${s.id}-${s.rank+1}`,kind:"skill",skill:s.id,
      name:getSkill(s.id).name+` · Lv.${s.rank} → ${s.rank+1}`,
      description:nextSkillLabel(s),value:0,
    }));
    const list:Upgrade[]=[];
    const focused=advances.find(c=>c.skill===this.skillFocus);
    const first=focused && this.focusMisses>=2 ? focused : advances.length ? this.rng.pick(advances) : undefined;
    if(first)list.push(first);
    const second=newSkill ? candidates[0] : advances.find(c=>c.id!==first?.id);
    if(second)list.push(second);
    if(focused)this.focusMisses=list.some(c=>c.skill===this.skillFocus) ? 0 : this.focusMisses+1;
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
          description: "拾取范围 +25%，受软硬上限约束。",
          stat: "pickup_radius",
          value: 25,
        },
        {
          id: "stat-speed",
          kind: "stat",
          name: "轻装强化",
          description: "移动速度 +8%，最高有效加成 35%。",
          stat: "move_speed",
          value: 8,
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
        {
          id:"stat-detection",kind:"stat",name:"洞察强化",
          description:"法术侦测距离 +20%，基础300px，最高450px；不扩大技能伤害范围。",
          stat:"detection_range",value:20,
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
        if (this.skills.length >= this.maxSkills) {
          this.pendingSkill = c.skill!;
          this.phase = "replace";
          this.emit();
          return;
        }
        this.skills.push(this.newSkill(c.skill!));
      } else {
        if (!canAdvanceSkill(s,this.wave,this.mode==="test")) return;
        s.rank++;
        Object.assign(s,canonicalBonuses(s.id,s.rank));
        if(s.rank===MAX_SKILL_RANK && this.skillFocus===s.id){this.skillFocus=null;this.focusMisses=0;}
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
    const fromBook=this.pendingBook!==null;
    if(fromBook && index!==null && !this.validBookOffer(this.pendingBook!))return false;
    if (index !== null) {
      if (!Number.isInteger(index) || index < 0 || index >= this.skills.length)
        return false;
      const old = this.skills[index];
      if(this.skillFocus===old.id){this.skillFocus=null;this.focusMisses=0;}
      if (old.id === "powerstrike" || old.id === "firesword")
        delete this.charges[old.id];
      clearTaoSkill(this, old.id);
      if (old.id === "charm")
        this.pets = this.pets.filter((p) => p.source && p.source !== "charm");
      if (old.id === "shield") this.player.shieldUntil = 0;
      this.effects = this.effects.filter((f) => f.kind !== old.id);
      this.skills[index] = this.newSkill(this.pendingSkill);
      if(fromBook)this.payBook();
    }
    this.pendingSkill = null;
    this.pendingBook=null;
    this.choices = [];
    this.recompute();
    this.phase = fromBook ? "shop" : "battle";
    if(fromBook){this.emit();return true;}
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
      if(d.itemId || d.heal)collectLoot(this,{...d,exp:0,gold:0});
    }
    this.exp += exp;
    const reward=trainingReward({mode:this.mode,wave:this.wave,waveTime:this.waveTime,duration:this.duration,
      waveKills:this.waveKills,spawnBudget:this.spawnBudget,level:this.level,exp:this.exp},this.training.lastWave);
    if(this.mode==="normal" && this.waveTime>=this.duration && this.wave>this.training.lastWave) {
      this.training.lastWave=this.wave;this.training.waveExp=reward;this.training.total+=reward;
      this.exp+=reward;
      if(reward)this.notice=`本波修炼 +${reward}经验（完成波次且击败至少10%计划怪物）`;
    }
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
    this.generateBookOffer();
    this.input = { x: 0, y: 0 };
    this.emit();
  }
  setSkillFocus(id:SkillId|null) {
    if(id && !this.skills.some(s=>s.id===id && s.rank<MAX_SKILL_RANK))return false;
    if(this.skillFocus!==id){this.skillFocus=id;this.focusMisses=0;}
    this.emit();return true;
  }
  setBookWish(id:SkillId|null) {
    if(id && (getSkill(id).classId!==this.classId || this.skills.some(s=>s.id===id)))return false;
    this.bookWish=id;this.emit();return true;
  }
  generateBookOffer() {
    this.bookOffer=null;
    if(this.booksBought.length>=2 || this.skills.length>=this.maxSkills && !this.bookWish)return;
    const pool=SKILLS.filter(s=>s.classId===this.classId && !this.skills.some(a=>a.id===s.id) && bookAvailable(s.id,this.wave));
    if(!pool.length)return;
    const wish=[3,6,9].includes(this.wave) ? pool.find(s=>s.id===this.bookWish) : undefined;
    const skill=wish??this.rng.pick(pool);
    this.bookOffer={id:++this.id,skill:skill.id,price:bookPrice(skill.id,this.wave),wave:this.wave,sold:false};
  }
  private validBookOffer(id:number) {
    const o=this.bookOffer;
    return !!o && o.id===id && !o.sold && o.wave===this.wave && this.booksBought.length<2 &&
      getSkill(o.skill).classId===this.classId && bookAvailable(o.skill,this.wave) &&
      !this.skills.some(s=>s.id===o.skill) && this.gold>=o.price;
  }
  private payBook() {
    const o=this.bookOffer!;
    this.gold-=o.price;o.sold=true;this.booksBought.push(o.skill);
    if(this.bookWish===o.skill)this.bookWish=null;
  }
  buyBook(id:number) {
    if(this.phase!=="shop" || !this.validBookOffer(id))return false;
    const o=this.bookOffer!;
    if(this.skills.length>=this.maxSkills) {
      this.pendingSkill=o.skill;this.pendingBook=id;this.phase="replace";
    }else {this.payBook();this.skills.push(this.newSkill(o.skill));}
    this.emit();return true;
  }
  validItem(item: Item) {
    if (!hasWorldAppearance(item)) return false;
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
    const weaponRestock=this.mode==="trial" ? this.wave===2 : [3,6,9].includes(this.wave);
    const currentWeapon=this.equipment.weapon ? getItem(this.equipment.weapon.itemId) : undefined;
    const upgrade=(item:Item)=>this.validItem(item) && isPrimaryWeaponUpgrade(this.classId,currentWeapon,item);
    this.offers = retained;
    for (let i = retained.length; i < 4; i++) {
      const available = pool.filter(
        (x) =>
          !this.offers.some((o) => o.itemId === x.id),
      );
      const needsPassive=!this.offers.some(o=>!o.sold && getItem(o.itemId).kind==="passive" && this.validItem(getItem(o.itemId)));
      const passives=available.filter(x=>x.kind==="passive");
      const upgrades=available.filter(upgrade);
      const needsWeapon=weaponRestock && !this.offers.some(o=>!o.sold && upgrade(getItem(o.itemId)));
      const entryTier=Math.min(...upgrades.map(x=>x.tier));
      const choices=needsPassive && passives.length ? passives :
        needsWeapon && upgrades.length ? upgrades.filter(x=>x.tier===entryTier) : available;
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
    this.purchases[item.id] = (this.purchases[item.id] ?? 0) + 1;
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
      if (!o.locked && this.shopLocksRemaining===0) return;
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
    this.training.waveExp=0;
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
    const runCrystals = this.mode === "normal" && won ? 3 : 0;
    this.crystals += runCrystals;
    this.result = {
      classId: this.classId,
      mapId: this.mapId,
      runId: this.runId,
      mode: this.mode,
      seed: this.seed,
      won,
      wave: this.wave,
      kills: this.kills,
      seconds: this.clock,
      level: this.level,
      gold: this.totalGold,
      crystals: runCrystals,
      skillDamage: { ...this.damageDealt },
      purchases: { ...this.purchases },
      rerolls: this.rerolls,
      healing: { ...this.tao.healing },
      combatHealing:{...this.combatRecovery.healing},
      damageTaken:{...this.damageTaken,sources:{...this.damageTaken.sources}},
      trainingExp:this.training.total,
      skillBooks:this.booksBought.map(bookName),
      skills: this.skills.map((s) => `${getSkill(s.id).name} Lv.${s.rank}`),
    };
    this.input = { x: 0, y: 0 };
    this.emit();
  }
}
export const game = new Game();
