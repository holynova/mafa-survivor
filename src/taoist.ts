import type { Enemy, Game, Pet, Skill } from "./game";
import type { SkillId } from "./spells";
import { clamp } from "./rules";

export type ActorBuffs = {
  invisibleUntil: number;
  visibleUntil: number;
  invisibleSource?: SkillId;
  detectionRadius: number;
  armorUntil: number;
  armorPower: number;
  ghostUntil: number;
  ghostPower: number;
};
export const createTaoState = () => ({
  poisonMode: "green" as "green" | "red",
  healPriority: "self" as "self" | "pet",
  buffs: {} as Record<number, ActorBuffs>,
  healing: {} as Record<string, number>,
});
export function actorBuffs(g: Game, id: number): ActorBuffs {
  return (g.tao.buffs[id] ??= {
    invisibleUntil: 0,
    visibleUntil: 0,
    detectionRadius: 28,
    armorUntil: 0,
    armorPower: 0,
    ghostUntil: 0,
    ghostPower: 0,
  });
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const friends = (g: Game) => [
  { id: 0, actor: g.player, maxHp: g.maxHP },
  ...g.pets
    .filter((p) => p.hp > 0)
    .map((p) => ({ id: p.id, actor: p, maxHp: p.maxHp })),
];
export const invisible = (g: Game, id: number) =>
  (g.tao.buffs[id]?.invisibleUntil ?? 0) > g.clock;
export function revealActor(g: Game, id: number) {
  const buff = g.tao.buffs[id];
  if (buff && buff.invisibleUntil > 0) {
    buff.invisibleUntil = 0;
    buff.visibleUntil = g.clock + 1.5;
  }
}
export function canDetect(
  g: Game,
  e: Enemy,
  id: number,
  actor: { x: number; y: number },
) {
  return (
    e.kind === "boss" ||
    e.elite ||
    !invisible(g, id) ||
    distance(e, actor) <= actorBuffs(g, id).detectionRadius
  );
}
export function enemyVictim(g: Game, e: Enemy) {
  const visible = friends(g)
    .filter((f) => canDetect(g, e, f.id, f.actor))
    .sort((a, b) => distance(e, a.actor) - distance(e, b.actor));
  const next = visible[0];
  if (next) {
    e.lastSeen = {
      id: next.id,
      x: next.actor.x,
      y: next.actor.y,
      until: g.clock + 1.5,
    };
    return { id: next.id, x: next.actor.x, y: next.actor.y, visible: true };
  }
  if (e.lastSeen && e.lastSeen.until > g.clock)
    return { ...e.lastSeen, visible: false };
  return null;
}
export function buffDefense(g: Game, id: number, kind: "physical" | "magic") {
  const buff = g.tao.buffs[id];
  if (!buff) return 0;
  return kind === "physical"
    ? buff.armorUntil > g.clock
      ? buff.armorPower
      : 0
    : buff.ghostUntil > g.clock
      ? buff.ghostPower
      : 0;
}
function duration(g: Game, s: Skill, seconds: number, cap: number) {
  return Math.min(
    cap,
    seconds * (1 + s.duration / 100) * (1 + (g.stats.duration ?? 0) / 100),
  );
}
function radius(g: Game, s: Skill, base: number) {
  return (
    (base + s.range) *
    (1 + s.radius / 100) *
    (1 + (g.stats.skill_radius ?? 0) / 100)
  );
}
function heal(g: Game, id: number, amount: number, source: SkillId) {
  const friend = friends(g).find((f) => f.id === id);
  if (!friend) return 0;
  const net = Math.min(
    friend.maxHp - friend.actor.hp,
    amount * (1 + (g.stats.healing_received ?? 0) / 100),
  );
  if (net <= 0) return 0;
  friend.actor.hp += net;
  g.tao.healing[source] = (g.tao.healing[source] ?? 0) + net;
  g.effect(source, friend.actor.x, friend.actor.y, 0, 0.8);
  if (g.floating.length < 45)
    g.floating.push({
      id: g.nextEntityId(),
      x: friend.actor.x,
      y: friend.actor.y - 55,
      text: "+" + Math.round(net),
      color: "#9ad59a",
      life: 0.8,
    });
  return net;
}
export function refreshSummons(g: Game) {
  for (const p of g.pets) {
    const source = p.source ?? "charm";
    const skill = g.skills.find((s) => s.id === source);
    if (!p.baseMaxHp) continue;
    const ratio = p.hp / p.maxHp;
    const sc =
      source === "charm"
        ? 0
        : (((g.stats.sc_min ?? 0) + (g.stats.sc_max ?? 0)) / 2) * 5;
    p.maxHp =
      (p.baseMaxHp + sc) *
      (1 + (g.stats.summon_hp ?? 0) / 100) *
      (1 + (skill?.summonHP ?? 0) / 100);
    p.hp = Math.max(0, Math.min(p.maxHp, p.maxHp * ratio));
  }
}
function summon(g: Game, s: Skill) {
  const source = s.id === "skeleton" ? "skeleton" : "beast";
  const owned = g.pets.filter((p) => p.hp > 0 && p.source === source);
  const all = g.pets.filter(
    (p) => p.hp > 0 && ["skeleton", "beast"].includes(p.source ?? ""),
  );
  const cap = source === "skeleton" ? Math.min(2, 1 + s.count) : 1;
  if (owned.length >= cap || all.length >= 3) return false;
  let point: { x: number; y: number } | undefined;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      x = g.player.x + Math.cos(a) * 65,
      y = g.player.y + Math.sin(a) * 65;
    if (
      g.freePoint(x, y, 0) &&
      g.pets.every((p) => distance(p, { x, y }) > 28)
    ) {
      point = { x, y };
      break;
    }
  }
  if (!point) return false;
  const hp = source === "skeleton" ? 110 : 270;
  g.pets.push({
    id: g.nextEntityId(),
    ...point,
    kind: source === "skeleton" ? "summonedSkeleton" : "beast",
    source,
    hp,
    maxHp: hp,
    baseMaxHp: hp,
    damage: source === "skeleton" ? 11 : 16,
    speed: source === "skeleton" ? 155 : 135,
    dir: 4,
    cd: 0.5,
    born: g.clock,
    attackUntil: 0,
    moving: false,
  });
  refreshSummons(g);
  g.effect(source, point.x, point.y, 0, 1);
  return true;
}
function hide(g: Game, id: number, s: Skill) {
  const buff = actorBuffs(g, id);
  if (buff.invisibleUntil > g.clock || buff.visibleUntil > g.clock)
    return false;
  buff.invisibleUntil =
    g.clock +
    duration(g, s, s.id === "invisible" ? 6 : 5, s.id === "invisible" ? 8 : 9);
  buff.invisibleSource = s.id;
  buff.detectionRadius = Math.max(8, 28 - s.chance);
  return true;
}
export function castTaoist(g: Game, s: Skill, targets: Enemy[]) {
  if (s.id === "skeleton" || s.id === "beast") return summon(g, s);
  if (s.id === "heal" || s.id === "groupHeal") {
    const near = friends(g).filter(
      (f) =>
        distance(f.actor, g.player) <=
        radius(g, s, s.id === "heal" ? 180 : 144),
    );
    const injured = near.filter((f) => f.actor.hp < f.maxHp);
    if (s.id === "heal") {
      const needed = injured.filter(
        (f) => f.actor.hp / f.maxHp < (f.id === 0 ? 0.7 : 0.5),
      );
      needed.sort(
        (a, b) =>
          (g.tao.healPriority === "self"
            ? (a.id === 0 ? -2 : 0) - (b.id === 0 ? -2 : 0)
            : (a.id !== 0 ? -2 : 0) - (b.id !== 0 ? -2 : 0)) +
          a.actor.hp / a.maxHp -
          b.actor.hp / b.maxHp,
      );
      if (!needed.length) return false;
      const first = needed[0];
      const selected = [
        first,
        ...injured
          .filter((f) => f.id !== first.id)
          .sort((a, b) => a.actor.hp / a.maxHp - b.actor.hp / b.maxHp),
      ].slice(0, Math.min(3, 1 + s.count));
      const amount =
        (18 + g.rollStat("sc") * 1.5) *
        (1 + s.power / 100) *
        (1 + (g.stats.sc_bonus_pct ?? 0) / 100);
      for (const f of selected) heal(g, f.id, amount, s.id);
    } else {
      if (injured.length < 2 && g.player.hp / g.maxHP >= 0.35) return false;
      if (!injured.length) return false;
      const amount =
        (14 + g.rollStat("sc")) *
        (1 + s.power / 100) *
        (1 + (g.stats.sc_bonus_pct ?? 0) / 100);
      for (const f of injured) heal(g, f.id, amount, s.id);
    }
    return true;
  }
  if (s.id === "ghost" || s.id === "armor") {
    const until = s.id === "ghost" ? "ghostUntil" : "armorUntil";
    if (actorBuffs(g, 0)[until] > g.clock) return false;
    const value = (5 + g.rollStat("sc") * 0.6) * (1 + s.power / 100);
    for (const f of friends(g).filter(
      (f) => distance(f.actor, g.player) <= radius(g, s, 160),
    )) {
      const buff = actorBuffs(g, f.id);
      buff[until] = g.clock + duration(g, s, 8, 12);
      buff[s.id === "ghost" ? "ghostPower" : "armorPower"] = value;
      g.effect(s.id, f.actor.x, f.actor.y, 0, 0.8);
    }
    return true;
  }
  if (s.id === "invisible") {
    if (
      g.player.moving ||
      g.player.hp / g.maxHP >= 0.6 ||
      targets.filter((e) => distance(e, g.player) < 120).length < 2
    )
      return false;
    if (!hide(g, 0, s)) return false;
    g.effect(s.id, g.player.x, g.player.y, 0, 1);
    return true;
  }
  if (s.id === "groupInvisible") {
    const near = friends(g).filter(
      (f) => distance(f.actor, g.player) <= radius(g, s, 72),
    );
    if (!near.some((f) => f.id !== 0)) return false;
    let applied = false;
    for (const f of near) {
      if (
        (f.id === 0 && g.player.moving) ||
        (f.id !== 0 && (f.actor as Pet).moving)
      )
        continue;
      if (hide(g, f.id, s)) {
        g.effect(s.id, f.actor.x, f.actor.y, 0, 1);
        applied = true;
      }
    }
    return applied;
  }
  if (s.id === "talisman") {
    if (!targets.length) return false;
    revealActor(g, 0);
    const spirit = g.skills.find((s) => s.id === "spirit");
    for (const e of targets.slice(0, Math.min(3, 1 + s.count))) {
      const dx = e.x - g.player.x,
        dy = e.y - g.player.y,
        d = Math.max(1, Math.hypot(dx, dy));
      const speed = 320 * (1 + (g.stats.projectile_speed ?? 0) / 100);
      g.projectiles.push({
        id: g.nextEntityId(),
        x: g.player.x,
        y: g.player.y - 22,
        vx: (dx / d) * speed,
        vy: (dy / d) * speed,
        damage: taoDamage(g, 10, s),
        life: 3,
        dir:
          (((Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) + 4) % 16) + 16) %
          16,
        skill: s.id,
        targetId: e.id,
        homing: true,
        hitChance: Math.min(100, 90 + (spirit?.chance ?? 0)),
      });
    }
    return true;
  }
  if (s.id === "poison") {
    if (!targets.length) return false;
    revealActor(g, 0);
    for (const e of targets.slice(0, Math.min(3, 1 + s.count))) {
      const until = g.clock + duration(g, s, 6, 15);
      if (g.tao.poisonMode === "green") {
        const tick =
          e.greenPoison?.until && e.greenPoison.until > g.clock
            ? e.greenPoison.tickAt
            : g.clock + 1;
        e.greenPoison = {
          until,
          tickAt: tick,
          damage: Math.max(
            1,
            Math.round(
              (3 + g.rollStat("sc") * 0.5) *
                (1 + (g.stats.sc_bonus_pct ?? 0) / 100) *
                (1 + (g.stats.all_damage_pct ?? 0) / 100),
            ),
          ),
        };
      } else
        e.redPoison = {
          until,
          reduction: Math.min(0.35, 0.15 + s.power / 100),
        };
      g.effect("poison", e.x, e.y, 0, 0.7);
    }
    return true;
  }
  if (s.id === "reveal") {
    const chosen = targets
      .filter((e) => e.elite || e.kind === "boss")
      .slice(0, Math.min(3, 1 + s.count));
    if (!chosen.length) return false;
    for (const e of chosen) {
      e.revealUntil = g.clock + duration(g, s, 6, 12);
      e.revealTags = s.power > 0;
    }
    return true;
  }
  if (s.id === "trap") {
    const eligible = targets.filter(
      (e) =>
        e.kind !== "boss" &&
        !e.elite &&
        (e.level ?? 1) <= g.level + 2 &&
        distance(e, g.player) < 220 &&
        (e.trapUntil ?? 0) <= g.clock,
    );
    if (!eligible.length) return false;
    const center = eligible[0],
      range = radius(g, s, 72);
    revealActor(g, 0);
    for (const e of eligible.filter((e) => distance(e, center) <= range)) {
      e.trapUntil = g.clock + duration(g, s, 4, 8);
      e.windup = 0;
      g.effect(
        "trap",
        e.x,
        e.y,
        range,
        Math.min(4, e.trapUntil - g.clock),
      ).targetId = e.id;
    }
    return true;
  }
  return false;
}
export function taoDamage(g: Game, base: number, s: Skill) {
  const crit =
    g.rng.next() < (g.stats.crit_chance ?? 0) / 100
      ? 1.5 + (g.stats.crit_mult ?? 0)
      : 1;
  return Math.round(
    (base + g.rollStat("sc")) *
      (1 + s.power / 100) *
      (1 + (g.stats.sc_bonus_pct ?? 0) / 100) *
      (1 + (g.stats.all_damage_pct ?? 0) / 100) *
      crit,
  );
}
export function updateTaoist(g: Game) {
  for (const [id, buff] of Object.entries(g.tao.buffs)) {
    if (
      Number(id) !== 0 &&
      !g.pets.some((p) => p.id === Number(id) && p.hp > 0)
    ) {
      delete g.tao.buffs[Number(id)];
      continue;
    }
    if (buff.invisibleUntil > 0 && buff.invisibleUntil <= g.clock)
      revealActor(g, Number(id));
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const poison = e.greenPoison;
    if (
      poison &&
      poison.until >= g.clock - 1e-8 &&
      poison.tickAt <= g.clock + 1e-8
    ) {
      g.hit(e, poison.damage, "poison");
      poison.tickAt += 1;
    }
    if (poison && poison.until < g.clock - 1e-8) delete e.greenPoison;
    if (e.redPoison && e.redPoison.until <= g.clock) delete e.redPoison;
  }
}
export function clearTaoSkill(g: Game, id: SkillId) {
  if (["skeleton", "beast"].includes(id))
    g.pets = g.pets.filter((p) => p.source !== id);
  for (const [actor, buff] of Object.entries(g.tao.buffs)) {
    if (buff.invisibleSource === id) revealActor(g, Number(actor));
    if (id === "armor") buff.armorUntil = 0;
    if (id === "ghost") buff.ghostUntil = 0;
  }
  for (const e of g.enemies) {
    if (id === "poison") {
      delete e.greenPoison;
      delete e.redPoison;
    }
    if (id === "trap") e.trapUntil = 0;
    if (id === "reveal") e.revealUntil = 0;
  }
}
