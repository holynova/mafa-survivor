import { z } from "zod";
import draft from "../docs/design-data-V0.9.json";

export { SKILLS, skillSchema, getSkill } from "./spells";
export type { SkillId } from "./spells";
export type StatKey =
  | "dc_min"
  | "dc_max"
  | "mc_min"
  | "mc_max"
  | "sc_min"
  | "sc_max"
  | "def_min"
  | "def_max"
  | "mdef_min"
  | "mdef_max"
  | "accuracy"
  | "agility"
  | "luck"
  | "dc_bonus_pct"
  | "sc_bonus_pct"
  | "all_damage_pct"
  | "summon_hp"
  | "summon_damage"
  | "healing_received"
  | "hp_max"
  | "hp_regen"
  | "mc_flat"
  | "mc_bonus_pct"
  | "def_flat"
  | "mdef_flat"
  | "move_speed"
  | "pickup_radius"
  | "cooldown_reduction"
  | "skill_radius"
  | "duration"
  | "exp_gain"
  | "gold_gain"
  | "crit_chance"
  | "crit_mult"
  | "dodge"
  | "projectile_speed";
export type Bonuses = Partial<Record<StatKey, number>>;
export const STAT_NAMES: Record<StatKey, string> = {
  dc_min: "攻击下限",
  dc_max: "攻击上限",
  mc_min: "魔法下限",
  mc_max: "魔法上限",
  sc_min: "道术下限",
  sc_max: "道术上限",
  def_min: "防御下限",
  def_max: "防御上限",
  mdef_min: "魔御下限",
  mdef_max: "魔御上限",
  accuracy: "准确",
  agility: "敏捷",
  luck: "幸运",
  dc_bonus_pct: "物理伤害",
  sc_bonus_pct: "道术伤害",
  all_damage_pct: "全部伤害",
  summon_hp: "召唤生命",
  summon_damage: "召唤伤害",
  healing_received: "治疗加成",
  hp_max: "生命",
  hp_regen: "生命回复",
  mc_flat: "魔法",
  mc_bonus_pct: "魔法伤害",
  def_flat: "防御",
  mdef_flat: "魔御",
  move_speed: "移动速度",
  pickup_radius: "拾取范围",
  cooldown_reduction: "冷却缩减",
  skill_radius: "技能范围",
  duration: "持续时间",
  exp_gain: "经验获取",
  gold_gain: "金币获取",
  crit_chance: "暴击",
  crit_mult: "暴击倍率",
  dodge: "闪避",
  projectile_speed: "弹速",
};
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["equipment", "passive", "heal"]),
  price: z.number().int().positive(),
  tier: z.number().int().min(1).max(4),
  stats: z.record(z.string(), z.number()),
  classId: z.enum(["wizard", "warrior", "taoist"]).optional(),
  slot: z.string().optional(),
  maxCount: z.number().positive().nullable(),
  icon: z.string().optional(),
  description: z.string(),
});
export type Item = z.infer<typeof itemSchema> & { stats: Bonuses };
export const SLOT_KEYS = [
  "weapon",
  "armor",
  "helmet",
  "necklace",
  "braceletL",
  "braceletR",
  "ringL",
  "ringR",
] as const;
export type Slot = (typeof SLOT_KEYS)[number];
export const SLOT_NAMES: Record<Slot, string> = {
  weapon: "武器",
  armor: "衣服",
  helmet: "头盔",
  necklace: "项链",
  braceletL: "左手镯",
  braceletR: "右手镯",
  ringL: "左戒指",
  ringR: "右戒指",
};
const slotMap: Record<string, string> = {
  武器: "weapon",
  衣服: "armor",
  头盔: "helmet",
  项链: "necklace",
  手镯: "bracelet",
  戒指: "ring",
};
const equipmentNames = [
  "海魂",
  "偃月",
  "魔杖",
  "骨玉权杖",
  "乌木剑",
  "布衣",
  "魔法长袍",
  "恶魔长袍",
  "魔法头盔",
  "青铜头盔",
  "玻璃戒指",
  "六角戒指",
  "金项链",
  "白金项链",
  "铁手镯",
  "黑檀手镯",
  "骷髅头盔",
  "蛇眼戒指",
  "魅力戒指",
  "紫碧螺",
  "思贝儿手镯",
  "放大镜",
  "生命项链",
];
// Preserve previously shipped item identities; append new equipment by name.
const originalEquipment = draft.equipmentProposals.filter((x) =>
  equipmentNames.includes(x.name),
);
const extraNames = [
  "木剑",
  "匕首",
  "青铜剑",
  "短剑",
  "铁剑",
  "青铜斧",
  "罗刹",
  "八荒",
  "凌风",
  "破魂",
  "斩马刀",
  "修罗",
  "凝霜",
  "炼狱",
  "井中月",
  "裁决之杖",
  "屠龙",
  "怒斩",
  "重盔甲",
  "战神盔甲",
  "天魔神甲",
  "圣战宝甲",
  ...draft.equipmentProposals
    .filter((x) => x.class === "道士")
    .map((x) => x.name),
];
const equipment: Item[] = [
  ...originalEquipment,
  ...draft.equipmentProposals.filter((x) => extraNames.includes(x.name)),
].map((x, i) => {
  const stats: Bonuses = {};
  const prefixes = {
    DC: "dc",
    MC: "mc",
    SC: "sc",
    DEF: "def",
    MDEF: "mdef",
  } as const;
  for (const m of x.stats.matchAll(/\b(DC|MC|SC|DEF|MDEF) (\d+)–(\d+)/g)) {
    const prefix = prefixes[m[1] as keyof typeof prefixes];
    stats[`${prefix}_min`] = Number(m[2]);
    stats[`${prefix}_max`] = Number(m[3]);
  }
  for (const [label, key] of [
    ["幸运", "luck"],
    ["准确", "accuracy"],
    ["敏捷", "agility"],
  ] as const) {
    const match = x.stats.match(new RegExp(label + " *\\+?(\\d+)"));
    if (match) stats[key] = Number(match[1]);
  }
  const clothes = x.slot === "衣服";
  return itemSchema.parse({
    id: i < originalEquipment.length ? `equip-${i}` : `equip-extra-${x.name}`,
    name: x.name,
    kind: "equipment",
    price: x.price,
    tier: x.tier,
    classId: (
      { 法师: "wizard", 战士: "warrior", 道士: "taoist" } as Record<
        string,
        string
      >
    )[x.class],
    slot: slotMap[x.slot],
    stats,
    maxCount: null,
    icon: "item/" + x.name + (clothes ? "（男）" : ""),
    description: x.stats + " · 本项目设计值",
  }) as Item;
});
const passiveKeys: StatKey[] = [
  "pickup_radius",
  "move_speed",
  "hp_max",
  "hp_regen",
  "mc_bonus_pct",
  "cooldown_reduction",
  "skill_radius",
  "duration",
  "projectile_speed",
  "exp_gain",
  "gold_gain",
  "def_flat",
  "mdef_flat",
  "crit_chance",
  "crit_mult",
  "dodge",
];
const passiveDrafts = [
  ...draft.passiveItemProposals.filter((x) =>
    passiveKeys.includes(x[1] as StatKey),
  ),
  ...draft.passiveItemProposals.filter((x) =>
    ["dc_bonus_pct", "all_damage_pct"].includes(String(x[1])),
  ),
  ...draft.passiveItemProposals.filter((x) =>
    ["sc_bonus_pct", "summon_damage", "summon_hp", "healing_received"].includes(
      String(x[1]),
    ),
  ),
];
const passives: Item[] = passiveDrafts.map(
  (x, i) =>
    itemSchema.parse({
      id: `passive-${i}`,
      name: x[0],
      kind: "passive",
      price: x[3],
      tier: x[5] === "稀有" ? 2 : 1,
      stats: { [String(x[1])]: Number(x[2]) },
      maxCount: Number(x[4]) === 99 ? null : Number(x[4]),
      description: `${STAT_NAMES[x[1] as StatKey]} +${x[2]}${["hp_max", "def_flat", "mdef_flat"].includes(String(x[1])) ? "" : x[1] === "hp_regen" ? "/秒" : x[1] === "crit_mult" ? "倍" : "%"} · ${Number(x[4]) === 99 ? "可重复叠加" : `最多 ${x[4]} 件`}`,
    }) as Item,
);
export const ITEMS: Item[] = [
  ...equipment,
  ...passives,
  {
    id: "heal",
    name: "金创药",
    kind: "heal",
    price: 45,
    tier: 1,
    stats: {},
    maxCount: null,
    description: "立刻恢复 35 点生命。",
  },
];
export const WAVE_BUDGET = [
  35, 48, 69, 95, 125, 158, 194, 233, 273, 316, 361, 408,
];
export const MONSTERS = [
  { id: "scarecrow", name: "稻草人", hp: 18, damage: 1, speed: 32, exp: 2 },
  { id: "cat", name: "多钩猫", hp: 22, damage: 2, speed: 54, exp: 2 },
  { id: "rakecat", name: "钉耙猫", hp: 26, damage: 3, speed: 48, exp: 3 },
  { id: "orc", name: "半兽人", hp: 42, damage: 4, speed: 40, exp: 4 },
  { id: "zombie", name: "僵尸", hp: 110, damage: 10, speed: 26, exp: 5 },
  { id: "skeleton", name: "骷髅", hp: 50, damage: 6, speed: 44, exp: 3 },
  { id: "boss", name: "骷髅精灵", hp: 950, damage: 18, speed: 58, exp: 60 },
];
export const getItem = (id: string) => {
  const item = ITEMS.find((x) => x.id === id);
  if (!item) throw new Error("Unknown item: " + id);
  return item;
};
// Original map objects, placed as a small arena rather than the historical map layout.
export const SCENERY = [
  { id: "deadwood", x: 780, y: 580, r: 15 },
  { id: "deadwood", x: 1460, y: 920, r: 15 },
  { id: "deadwood", x: 1740, y: 420, r: 15 },
  { id: "deadwood", x: 360, y: 1100, r: 15 },
  { id: "sign", x: 1180, y: 470, r: 12 },
  { id: "sign", x: 680, y: 1140, r: 12 },
  { id: "shrub", x: 1350, y: 620, r: 10 },
  { id: "shrub", x: 930, y: 1040, r: 10 },
  { id: "shrub", x: 1840, y: 1050, r: 10 },
  { id: "shrub", x: 380, y: 650, r: 10 },
  { id: "shrub", x: 1520, y: 350, r: 10 },
  { id: "shrub", x: 780, y: 300, r: 10 },
];

// ---------------------------------------------------------------------------
// Chapter map data (GDD §11). Each chapter has its own scenery obstacle set
// and monster pool; chapters are unlocked out-of-run with Mafa Crystals.
// ---------------------------------------------------------------------------
export type MapId = "biche" | "mine" | "zuma";

export const MAP_IDS: MapId[] = ["biche", "mine", "zuma"];

export const MAP_SCENERY: Record<MapId, typeof SCENERY> = {
  biche: SCENERY,
  mine: [
    // 矿洞：更多岩石障碍，狭窄通道
    { id: "rock", x: 500, y: 500, r: 22 },
    { id: "rock", x: 1700, y: 500, r: 22 },
    { id: "rock", x: 500, y: 1100, r: 22 },
    { id: "rock", x: 1700, y: 1100, r: 22 },
    { id: "rock", x: 1104, y: 800, r: 28 },
    { id: "rock", x: 1104, y: 280, r: 28 },
    { id: "rock", x: 300, y: 768, r: 20 },
    { id: "rock", x: 1908, y: 768, r: 20 },
  ],
  zuma: [
    // 沃玛/祖玛：祭坛墙体与断桥，房间边缘
    { id: "altar", x: 500, y: 500, r: 20 },
    { id: "altar", x: 1700, y: 500, r: 20 },
    { id: "altar", x: 500, y: 1100, r: 20 },
    { id: "altar", x: 1700, y: 1100, r: 20 },
    { id: "altar", x: 1104, y: 300, r: 30 },
    { id: "altar", x: 1104, y: 1236, r: 30 },
    { id: "pillar", x: 300, y: 500, r: 18 },
    { id: "pillar", x: 1908, y: 500, r: 18 },
    { id: "pillar", x: 300, y: 1036, r: 18 },
    { id: "pillar", x: 1908, y: 1036, r: 18 },
  ],
};

export const MAPS: Record<MapId, { id: MapId; name: string; theme: string; monsterPool: string[]; boss: string; unlockCost: number }> = {
  biche: {
    id: "biche",
    name: "比奇郊外",
    theme: "草地、林地、村口；开阔通道，适合新手走位",
    monsterPool: ["scarecrow", "cat", "rakecat", "orc"],
    boss: "boss",
    unlockCost: 0,
  },
  mine: {
    id: "mine",
    name: "矿洞与骷髅洞",
    theme: "狭窄走廊、坍塌岩石、转角；远程压制与圣言克制",
    monsterPool: ["skeleton", "zombie", "orc"],
    boss: "boss",
    unlockCost: 50,
  },
  zuma: {
    id: "zuma",
    name: "沃玛/祖玛进阶",
    theme: "祭坛墙体、断桥、房间边缘；混合远近，高压Boss",
    monsterPool: ["zombie", "skeleton", "orc"],
    boss: "boss",
    unlockCost: 150,
  },
} as const;
