import { z } from "zod";
import { CLASS_IDS, type ClassId } from "./classes";
import {POTION_CAPACITY,POTION_COOLDOWN} from "./potions";
import {
  ITEMS,
  MAP_IDS,
  MONSTERS,
  SKILLS,
  SLOT_KEYS,
  STAT_NAMES,
  type Item,
  type MapId,
  type SkillId,
} from "./content";

/**
 * A wave-boundary resume point. Only stable states are stored: the start of a
 * wave (before spawns), the inter-wave shop, or a pending level-up. Live
 * enemies, projectiles and drops are never persisted, so a resumed run always
 * replays the current wave from its beginning.
 */
export const RUN_CHECKPOINT_VERSION = 1;

const finite = z.number().finite();
const bounded = (max: number) => finite.min(-max).max(max);
const int = (max: number) => z.number().int().min(0).max(max);
const skillIds = new Set(SKILLS.map((s) => s.id));
const itemIds = new Set(ITEMS.map((i) => i.id));
const petKinds = new Set(MONSTERS.map((m) => m.id));

const skillSchema = z.object({
  id: z.string().max(40).refine((id) => skillIds.has(id as SkillId), "unknown skill"),
  focusTarget: z.number().int().optional(),
  rank: z.number().int().min(1).max(3),
  cd: bounded(120),
  retryAt: finite.optional(),
  power: bounded(10000),
  count: bounded(100),
  radius: bounded(1000),
  duration: bounded(120),
  localCDR: bounded(100),
  shieldReduction: bounded(100),
  speed: bounded(2000),
  range: bounded(2000),
  knockback: bounded(1000),
  chance: bounded(100),
  summonPower: bounded(10000),
  accuracy: bounded(100),
  angle: bounded(360),
  hitFloor: bounded(100),
  summonHP: bounded(100000),
}).strict();

const upgradeSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["skill", "stat"]),
  name: z.string().max(100),
  description: z.string().max(200),
  skill: z.string().max(40).optional(),
  field: z.string().max(40).optional(),
  value: bounded(10000),
  stat: z.string().max(40).optional(),
}).strict();

const offerSchema = z.object({
  id: z.number().int().min(1),
  itemId: z.string().max(100),
  price: int(1_000_000),
  locked: z.boolean(),
  sold: z.boolean(),
}).strict();

const petSchema = z.object({
  id: z.number().int().min(1),
  x: bounded(100000),
  y: bounded(100000),
  kind: z.string().max(100),
  source: z.enum(["charm", "skeleton", "beast"]).optional(),
  baseMaxHp: bounded(100000).optional(),
  moving: z.boolean().optional(),
  hp: bounded(100000),
  maxHp: bounded(100000),
  damage: bounded(10000),
  speed: bounded(2000),
  dir: z.number().int().min(0).max(7),
  cd: bounded(120),
  born: finite,
  attackUntil: finite,
}).strict();

const equippedSchema = z.object({
  itemId: z.string().max(100),
  paid: int(1_000_000),
}).strict();

const playerSchema = z.object({
  x: bounded(100000),
  y: bounded(100000),
  hp: bounded(100000),
  dir: z.number().int().min(0).max(7),
  moving: z.boolean(),
  hitUntil: finite,
  castUntil: finite,
  shieldUntil: finite,
  attackUntil: finite,
  attackDir: z.number().int().min(0).max(7),
}).strict();

export const checkpointSchema = z.object({
  version: z.literal(RUN_CHECKPOINT_VERSION),
  savedAt: int(Number.MAX_SAFE_INTEGER),
  mode: z.enum(["normal", "trial"]),
  classId: z.enum(CLASS_IDS),
  mapId: z.enum(MAP_IDS as [MapId, ...MapId[]]),
  warriorFourSlot: z.boolean(),
  seed: int(0xffffffff),
  rngState: z.number().int(),
  runId: z.string().min(1).max(200),
  phase: z.enum(["battle", "shop", "upgrade", "replace"]),
  wave: z.number().int().min(1).max(12),
  clock: bounded(100000),
  kills: int(Number.MAX_SAFE_INTEGER),
  gold: int(100_000_000),
  totalGold: int(1_000_000_000),
  level: z.number().int().min(1).max(10000),
  exp: int(1_000_000),
  rerolls: int(100),
  bossKilled: z.boolean(),
  bossSpawned: z.boolean(),
  lastWaveGold: int(100_000_000),
  lastWaveKills: int(Number.MAX_SAFE_INTEGER),
  damageDealt: z.record(z.string().max(100), finite),
  purchases: z.record(z.string().max(100), int(99)).default({}),
  potions:z.object({reserve:z.array(z.union([z.literal(20),z.literal(35)])).max(POTION_CAPACITY),cd:finite.min(0).max(POTION_COOLDOWN)}).strict().default(()=>({reserve:[],cd:0})),
  combatRecovery: z.object({
    healing: z.object({ onKill: finite, lifeSteal: finite }).strict(),
    killReadyAt: finite,
    killEvents: z.array(z.object({ at: finite, amount: finite }).strict()).max(16),
  }).strict(),
  damageTaken: z.object({
    physical: finite,
    magic: finite,
    sources: z.record(z.string().max(100), finite),
  }).strict(),
  player: playerSchema,
  skills: z.array(skillSchema).min(1).max(6),
  pets: z.array(petSchema).max(5),
  equipment: z.record(z.string().max(40), equippedSchema),
  passives: z.record(z.string().max(100), int(99)),
  upgrades: z.record(z.string().max(40), bounded(10000)),
  offers: z.array(offerSchema).max(4),
  choices: z.array(upgradeSchema).max(3),
  pendingSkill: z.string().max(40).nullable(),
  nextEntityId: z.number().int().min(1),
  tao: z.object({
    poisonMode: z.enum(["green", "red"]),
    healPriority: z.enum(["self", "pet"]),
    healing: z.record(z.string().max(100), finite),
  }).strict(),
  charges: z.record(z.string().max(40), z.boolean()),
}).strict();

export type RunCheckpoint = z.infer<typeof checkpointSchema>;
export type CheckpointPhase = RunCheckpoint["phase"];

const classSkills = new Set(SKILLS.map((s) => `${s.classId}:${s.id}`));
const passiveItems = new Map(ITEMS.filter((i) => i.kind === "passive").map((i) => [i.id, i]));

/** Validate and drop anything a corrupted or edited checkpoint could smuggle in. */
export function sanitizeCheckpoint(value: unknown): RunCheckpoint | null {
  const parsed = checkpointSchema.safeParse(value);
  if (!parsed.success) return null;
  const cp = parsed.data;
  const skills = cp.skills.filter((s) => classSkills.has(`${cp.classId}:${s.id}`));
  if (!skills.length) return null;
  cp.skills = skills;
  cp.pets = cp.pets.filter((p) => petKinds.has(p.kind) && p.hp <= p.maxHp);
  cp.equipment = Object.fromEntries(
    Object.entries(cp.equipment).filter(
      ([slot, e]) => (SLOT_KEYS as readonly string[]).includes(slot) && itemIds.has(e.itemId),
    ),
  ) as RunCheckpoint["equipment"];
  cp.passives = Object.fromEntries(
    Object.entries(cp.passives).filter(([id, n]) => {
      const item = passiveItems.get(id);
      return item !== undefined && n > 0 && n <= (item.maxCount ?? 99);
    }),
  );
  cp.upgrades = Object.fromEntries(
    Object.entries(cp.upgrades).filter(([key]) => Object.hasOwn(STAT_NAMES, key)),
  ) as RunCheckpoint["upgrades"];
  cp.purchases = Object.fromEntries(
    Object.entries(cp.purchases).filter(([id, n]) => itemIds.has(id) && n > 0),
  );
  cp.offers = cp.offers.filter((o) => itemIds.has(o.itemId));
  if (cp.phase !== "shop") cp.offers = [];
  cp.choices = cp.phase === "upgrade"
    ? cp.choices.filter((c) => c.kind === "stat"
        ? Boolean(c.stat && Object.hasOwn(STAT_NAMES, c.stat))
        : Boolean(c.skill && skillIdsFor(cp.classId).has(c.skill)))
    : [];
  if (cp.phase === "upgrade" && cp.choices.length === 0) return null;
  if (cp.phase === "replace") {
    if (!cp.pendingSkill || !skillIdsFor(cp.classId).has(cp.pendingSkill)) return null;
  } else {
    cp.pendingSkill = null;
  }
  return cp;
}

const skillIdsFor = (classId: ClassId) =>
  new Set<string>(SKILLS.filter((s) => s.classId === classId).map((s) => s.id));

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);
