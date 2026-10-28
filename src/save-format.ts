import { z } from "zod";
import { TALENT_IDS } from "./talents";
import {MAP_IDS,type MapId} from "./content";
const mapId=z.enum(MAP_IDS as [MapId,...MapId[]]);

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER);
const talents = z.record(
  z.string().max(40),
  z.number().int().min(0).max(5),
).default({}).refine(
  value => Object.keys(value).every(key => (TALENT_IDS as readonly string[]).includes(key)),
  "unknown talent id",
);
export const progressSchema = z.object({
  schemaVersion: z.literal(1), crystals: integer,
  unlockedMaps: z.array(mapId).min(1).max(MAP_IDS.length),
  talents,
}).strict().refine(p => p.unlockedMaps.includes("biche") && new Set(p.unlockedMaps).size === p.unlockedMaps.length);
export type Progress = z.infer<typeof progressSchema>;
const totals = z.record(z.string().max(100), amount).refine(value => Object.keys(value).length <= 100);
const counts = z.record(z.string().max(100), z.number().int().min(0).max(99)).refine(value => Object.keys(value).length <= 100);
const runSchema = z.object({
  runId: z.string().min(1).max(200), mode: z.enum(["normal", "trial"]), seed: integer.max(0xffffffff),
  classId: z.enum(["wizard", "warrior", "taoist"]).optional(),
  mapId: mapId.optional(),
  won: z.boolean(), wave: integer.min(1).max(12), kills: integer, seconds: amount,
  level: integer.min(1), gold: amount, crystals: integer,
  skillDamage: totals, purchases: counts.optional(), rerolls: integer.max(100).optional(),
  healing: totals.optional(),
  combatHealing: z.object({ onKill: amount, lifeSteal: amount }).strict().optional(),
  damageTaken: z.object({ physical: amount, magic: amount, sources: totals }).strict().optional(),
  skills: z.array(z.string().max(100)).max(6), savedAt: integer,
}).strict().refine(r => r.crystals === 0 || (r.mode === "normal" && r.won));
export const backupSchema = z.object({
  format: z.literal("mafa-survivor-save"), version: z.literal(1), exportedAt: integer,
  progress: progressSchema, runs: z.array(runSchema).max(10000),
}).strict().refine(b => new Set(b.runs.map(r => r.runId)).size === b.runs.length);
export type SaveBackup = z.infer<typeof backupSchema>;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export function parseBackup(text: string): SaveBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("备份超过5MB，未修改本机存档。");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("不是有效的JSON备份，未修改本机存档。"); }
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) throw new Error("备份格式或版本不受支持，未修改本机存档。请使用游戏导出的备份。");
  return parsed.data;
}
