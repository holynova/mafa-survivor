import { z } from "zod";
import {cooldownScale} from "./cadence";
import { CLASS_IDS } from "./classes";
export const SKILL_IDS = [
  "fireball",
  "lightning",
  "firewall",
  "shield",
  "repulse",
  "hellfire",
  "bigfireball",
  "teleport",
  "explosion",
  "beam",
  "nova",
  "holy",
  "ice",
  "charm",
  "swordsmanship",
  "powerstrike",
  "thrust",
  "cleave",
  "dash",
  "firesword",
  "heal",
  "spirit",
  "poison",
  "talisman",
  "skeleton",
  "invisible",
  "groupInvisible",
  "ghost",
  "armor",
  "reveal",
  "trap",
  "groupHeal",
  "beast",
] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type SkillField =
  | "power"
  | "count"
  | "radius"
  | "duration"
  | "localCDR"
  | "shieldReduction"
  | "speed"
  | "range"
  | "knockback"
  | "chance"
  | "summonPower"
  | "accuracy"
  | "angle"
  | "hitFloor"
  | "summonHP";
export type Branch = { field: SkillField; value: number; label: string };
export const skillSchema = z
  .object({
    id: z.enum(SKILL_IDS),
    name: z.string().min(1),
    classId: z.enum(CLASS_IDS).default("wizard"),
    passive: z.boolean().default(false),
    cooldown: z.number().nonnegative(),
    description: z.string(),
    asset: z.string(),
  })
  .refine(
    (s) => (s.passive ? s.cooldown === 0 : s.cooldown > 0),
    "Only passive skills may have zero cooldown",
  );
const branch = (field: SkillField, value: number, label: string): Branch => ({
  field,
  value,
  label,
});
const damage = branch("power", 22, "伤害 +22%"),
  area = branch("radius", 20, "范围半径 +20%"),
  cooldown = branch("localCDR", 12, "技能冷却 -12%"),
  target = branch("count", 1, "独立目标 +1");
const definitions = [
  {
    id: "fireball",
    name: "火球术",
    cooldown: 1.1,
    description: "自动发射单体火球；额外火球分别瞄准不同敌人。",
    asset: "fireball/8/0",
    branches: [damage, target, branch("speed", 30, "弹速 +30%")],
  },
  {
    id: "lightning",
    name: "雷电术",
    cooldown: 1.35,
    description: "优先对 Boss、精英降下单体雷击；强化后命中不同目标。",
    asset: "lightning/2",
    branches: [branch("power", 25, "伤害 +25%"), target, cooldown],
  },
  {
    id: "firewall",
    name: "火墙",
    cooldown: 6.5,
    description: "敌群路径上持续燃烧；同目标重叠火墙不会重复叠伤。",
    asset: "firewall/2",
    branches: [
      branch("duration", 30, "持续时间 +30%"),
      branch("radius", (Math.sqrt(1.25) - 1) * 100, "有效面积 +25%"),
      branch("count", 1, "同时火墙 +1"),
    ],
  },
  {
    id: "shield",
    name: "魔法盾",
    cooldown: 15,
    description: "持续 6 秒，减伤 20%；最多 7 秒和 35% 减伤，不能永久覆盖。",
    asset: "shield/1",
    branches: [
      branch("shieldReduction", 8, "减伤 +8%"),
      branch("duration", 100 / 6, "持续时间 6→7 秒"),
    ],
  },
  {
    id: "repulse",
    name: "抗拒火环",
    cooldown: 11,
    description:
      "近身威胁触发，击退符合等级的普通怪物；不造成伤害，Boss 免疫。",
    asset: "repulse/3",
    branches: [
      area,
      branch("localCDR", 15, "技能冷却 -15%"),
      branch("knockback", 20, "击退强度 +20%"),
    ],
  },
  {
    id: "hellfire",
    name: "地狱火",
    cooldown: 2.2,
    description: "向敌群最密方向释放五格直线火焰，不留下持续火墙。",
    asset: "hellfire/5",
    branches: [
      branch("radius", 15, "火焰宽度 +15%"),
      damage,
      branch("range", 96, "射程 +2 格"),
    ],
  },
  {
    id: "bigfireball",
    name: "大火球",
    cooldown: 1.65,
    description: "优先攻击精英的高伤害单体火球，不附带爆炸。",
    asset: "bigfireball/8/0",
    branches: [target, branch("power", 25, "伤害 +25%"), cooldown],
  },
  {
    id: "teleport",
    name: "瞬息移动",
    cooldown: 24,
    description: "按空格或点击技能，在场内随机传送至安全点；默认手动。",
    asset: "teleport/2",
    branches: [
      branch("localCDR", 20, "技能冷却 -20%"),
      branch("chance", 20, "安全落点优选概率 +20%"),
      branch("range", 40, "最小传送距离 +20%"),
    ],
  },
  {
    id: "explosion",
    name: "爆裂火焰",
    cooldown: 2.6,
    description: "在最密集的敌群中心引发一次范围火焰爆发。",
    asset: "explosion/4",
    branches: [area, branch("power", 20, "伤害 +20%"), cooldown],
  },
  {
    id: "beam",
    name: "疾光电影",
    cooldown: 3.2,
    description: "对同一直线上的敌人造成贯通伤害，每个目标每次只命中一次。",
    asset: "beam/4/2",
    branches: [area, branch("power", 25, "伤害 +25%"), cooldown],
  },
  {
    id: "nova",
    name: "地狱雷光",
    cooldown: 4.5,
    description: "附近超过三只敌人时触发近身环形雷击。",
    asset: "nova/3",
    branches: [
      area,
      branch("power", 20, "伤害 +20%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "holy",
    name: "圣言术",
    cooldown: 7.5,
    description: "概率消灭不死系普通怪；对不死系精英和 Boss 只造成有限伤害。",
    asset: "holy/5",
    branches: [
      branch("chance", 12, "成功率 +12%"),
      target,
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "ice",
    name: "冰咆哮",
    cooldown: 4,
    description: "在敌群密集处造成一次范围冰暴伤害，不附带减速。",
    asset: "ice/4",
    branches: [area, branch("power", 20, "伤害 +20%"), cooldown],
  },
  {
    id: "charm",
    name: "诱惑之光",
    cooldown: 7,
    description:
      "尝试招募可诱惑的普通怪，基础上限两只，最高五只；失败同样进入冷却。",
    asset: "charm/8",
    branches: [
      branch("chance", 15, "诱惑成功率 +15%"),
      branch("count", 1, "宝宝上限 +1"),
      branch("summonPower", 20, "宝宝伤害 +20%"),
    ],
  },
  {
    id: "swordsmanship",
    classId: "warrior",
    passive: true,
    name: "基本剑术",
    cooldown: 0,
    description: "常驻提升准确 5 点，占用一个技能槽；普通攻击本身不占槽。",
    asset: "item/基本剑术",
    branches: [
      branch("accuracy", 3, "准确 +3"),
      branch("power", 10, "普攻伤害 +10%"),
      branch("hitFloor", 5, "命中下限 +5%"),
    ],
  },
  {
    id: "powerstrike",
    classId: "warrior",
    name: "攻杀剑术",
    cooldown: 2,
    description: "积蓄攻杀力量，强化下一次近身挥砍；与烈火共用一次攻击。",
    asset: "item/攻杀剑术",
    branches: [
      branch("power", 20, "附加伤害 +20%"),
      branch("localCDR", 15, "触发间隔 -15%"),
      branch("accuracy", 3, "准确 +3"),
    ],
  },
  {
    id: "thrust",
    classId: "warrior",
    name: "刺杀剑术",
    cooldown: 2.7,
    description:
      "前方两格直线内至少两个目标时发动穿透刺击，每个目标仅命中一次。",
    asset: "item/刺杀剑术",
    branches: [
      branch("range", 48, "距离 +1 格"),
      branch("power", 20, "伤害 +20%"),
      branch("angle", 10, "宽容角度 +10°"),
    ],
  },
  {
    id: "cleave",
    classId: "warrior",
    name: "半月弯刀",
    cooldown: 3,
    description: "近身前方至少两名敌人时挥出半月，只命中前方扇形。",
    asset: "item/半月弯刀",
    branches: [
      branch("angle", 25, "扇形角度 +25°"),
      branch("power", 20, "伤害 +20%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "dash",
    classId: "warrior",
    name: "野蛮冲撞",
    cooldown: 12,
    description:
      "空格或点击向朝向冲撞；危险时可自动突围。撞墙反伤，Boss 不会被推开。",
    asset: "item/野蛮冲撞",
    branches: [
      branch("range", 36, "冲撞距离 +20%"),
      branch("localCDR", 20, "技能冷却 -20%"),
      branch("radius", 15, "击退宽度 +15%"),
    ],
  },
  {
    id: "firesword",
    classId: "warrior",
    name: "烈火剑法",
    cooldown: 6.5,
    description:
      "高威胁敌人进入近身范围时蓄力，强化下一次武器挥砍，不发射火焰波。",
    asset: "item/烈火剑法",
    branches: [
      branch("power", 25, "烈火伤害 +25%"),
      branch("localCDR", 15, "技能冷却 -15%"),
      branch("range", 4.8, "攻击范围 +10%"),
    ],
  },
  {
    id: "heal",
    classId: "taoist",
    name: "治愈术",
    cooldown: 8,
    description:
      "自身生命低于 70% 或附近宝宝低于 50% 时治疗；优先级可调，超额治疗不转盾。",
    asset: "item/治愈术",
    branches: [
      branch("power", 25, "治疗量 +25%"),
      branch("localCDR", 15, "技能冷却 -15%"),
      branch("count", 1, "附近治疗目标 +1"),
    ],
  },
  {
    id: "spirit",
    classId: "taoist",
    passive: true,
    name: "精神力战法",
    cooldown: 0,
    description: "常驻准确 +5，占用技能槽；强化可提升普攻或火符命中。",
    asset: "item/精神力战法",
    branches: [
      branch("accuracy", 3, "准确 +3"),
      branch("chance", 8, "火符命中 +8%"),
      branch("power", 10, "普攻伤害 +10%"),
    ],
  },
  {
    id: "poison",
    classId: "taoist",
    name: "施毒术",
    cooldown: 5,
    description:
      "点击技能切换绿毒持续伤害或红毒减防；优先高血量精英，同种毒刷新而不叠层。",
    asset: "item/施毒术",
    branches: [
      branch("duration", 25, "持续时间 +25%"),
      branch("count", 1, "同时目标 +1"),
      branch("power", 8, "红毒减防 +8%（上限 35%）"),
    ],
  },
  {
    id: "talisman",
    classId: "taoist",
    name: "灵魂火符",
    cooldown: 1.4,
    description: "向高威胁目标发射单体护身符；追加火符分别瞄准不同目标。",
    asset: "item/灵魂火符",
    branches: [target, damage, cooldown],
  },
  {
    id: "skeleton",
    classId: "taoist",
    name: "召唤骷髅",
    cooldown: 15,
    description: "空缺时补召骷髅，基础一只；数量强化为幸存者改编，上限两只。",
    asset: "item/召唤骷髅",
    branches: [
      branch("summonPower", 25, "骷髅伤害 +25%"),
      branch("count", 1, "骷髅上限 1→2（改编）"),
      branch("summonHP", 25, "骷髅生命 +25%"),
    ],
  },
  {
    id: "invisible",
    classId: "taoist",
    name: "隐身术",
    cooldown: 20,
    description:
      "静止且近身威胁密集时隐身；移动或攻击会显形。普通怪记忆位置 1.5 秒，Boss 可侦测。",
    asset: "item/隐身术",
    branches: [
      branch("duration", 25, "持续时间 +25%"),
      branch("localCDR", 15, "技能冷却 -15%"),
      branch("chance", 8, "近身发现距离 -8 px"),
    ],
  },
  {
    id: "groupInvisible",
    classId: "taoist",
    name: "集体隐身术",
    cooldown: 25,
    description:
      "附近至少一只宝宝时，覆盖自身与三格区域内友方；行动显形，结束后有强制可见间隔。",
    asset: "item/集体隐身术",
    branches: [
      branch("range", 48, "区域半径 +1 格"),
      branch("duration", 20, "持续时间 +20%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "ghost",
    classId: "taoist",
    name: "幽灵盾",
    cooldown: 18,
    description: "为附近自身与宝宝增加魔御，初始持续 8 秒；不增加物理防御。",
    asset: "item/幽灵盾",
    branches: [
      branch("power", 20, "魔御效果 +20%"),
      branch("duration", 30, "持续时间 +30%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "armor",
    classId: "taoist",
    name: "神圣战甲术",
    cooldown: 18,
    description: "为附近自身与宝宝增加物理防御，初始持续 8 秒；不增加魔御。",
    asset: "item/神圣战甲术",
    branches: [
      branch("power", 20, "防御效果 +20%"),
      branch("duration", 30, "持续时间 +30%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "reveal",
    classId: "taoist",
    name: "心灵启示",
    cooldown: 8,
    description:
      "揭示精英或 Boss 的当前生命；强化显示弱点标签与附近精英信息，不增加伤害或掉率。",
    asset: "item/心灵启示",
    branches: [
      branch("duration", 25, "血量显示时间 +25%"),
      branch("power", 1, "显示弱点标签"),
      branch("count", 1, "附近精英信息 +1"),
    ],
  },
  {
    id: "trap",
    classId: "taoist",
    name: "困魔咒",
    cooldown: 14,
    description: "困住危险路径上的普通怪，受到伤害即解除；Boss 与精英免疫。",
    asset: "item/困魔咒",
    branches: [
      branch("radius", 15, "困住半径 +15%"),
      branch("duration", 20, "持续时间 +20%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "groupHeal",
    classId: "taoist",
    name: "群体治疗术",
    cooldown: 12,
    description: "附近多人损血或自身濒危时群体治疗；不会递归触发治愈术。",
    asset: "item/群体治愈术",
    branches: [
      branch("radius", 20, "治疗半径 +20%"),
      branch("power", 20, "治疗量 +20%"),
      branch("localCDR", 15, "技能冷却 -15%"),
    ],
  },
  {
    id: "beast",
    classId: "taoist",
    name: "召唤神兽",
    cooldown: 28,
    description: "无神兽时补召一只喷火神兽；最多一只，与骷髅共享三只召唤负载。",
    asset: "item/召唤神兽",
    branches: [
      branch("summonPower", 20, "神兽伤害 +20%"),
      branch("radius", 20, "喷火范围 +20%"),
      branch("summonHP", 25, "神兽生命 +25%"),
    ],
  },
] as const;
export const SKILLS = definitions.map((x) => ({
  ...skillSchema.parse(x),
  cooldown:Math.round(x.cooldown*cooldownScale(x.id)*1000)/1000,
  branches: [...x.branches] as Branch[],
}));
export const getSkill = (id: SkillId) => {
  const skill = SKILLS.find((x) => x.id === id);
  if (!skill) throw new Error("Unknown skill: " + id);
  return skill;
};
