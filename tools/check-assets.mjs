import fs from "node:fs";
import {createHash} from "node:crypto";
import appearance from "./equipment-appearance.json" with { type: "json" };
import monsters from "./monster-models.json" with { type: "json" };
import { checkReleaseAuthorization } from "./asset-authorization.mjs";
const root = new URL("../public/assets/mir/", import.meta.url);
const manifest = JSON.parse(
  fs.readFileSync(new URL("manifest.json", root), "utf8"),
);
const frames = {};
const failures = [];
const stationary=new Set(monsters.stationaryModels ?? []);
for (const page of manifest.pages) {
  const atlas = JSON.parse(fs.readFileSync(new URL(page.data, root), "utf8"));
  if (page.width > 4096 || page.height > 4096)
    failures.push(page.key + ": texture too large");
  for (const [id, entry] of Object.entries(atlas.frames)) {
    if (frames[id]) failures.push(id + ": duplicate frame");
    frames[id] = entry;
    if (manifest.frames[id]?.texture !== page.key)
      failures.push(id + ": incorrect page");
    const f = entry.frame;
    if (f.x < 0 || f.y < 0 || f.x + f.w > page.width || f.y + f.h > page.height)
      failures.push(id + ": atlas overflow");
  }
}
for (const [name, sequence] of Object.entries(manifest.animations)) {
  if (!sequence.length) failures.push(name + ": empty");
  for (const id of sequence)
    if (!frames[id] || !manifest.frames[id])
      failures.push(name + ": missing " + id);
}
for (const actor of ["taoist", "wizard", "warrior", ...Object.keys(monsters.models)])
  for (const motion of ["wizard", "warrior", "taoist"].includes(actor)
    ? ["idle", "walk", "cast", "attack", "hurt", "death"]
    : stationary.has(actor) ? ["idle","attack","hurt","death"] : ["idle", "walk", "attack", "hurt", "death"])
    for (let dir = 0; dir < (stationary.has(actor) ? 1 : 8); dir++)
      if (!manifest.animations[`${actor}/${motion}/${dir}`])
        failures.push(`${actor}/${motion}/${dir}: missing`);
for (const spell of [
  "lightning",
  "firewall",
  "shield",
  "repulse",
  "charm",
  "hellfire",
  "teleport",
  "explosion",
  "nova",
  "holy",
  "ice",
])
  if (!manifest.animations[spell]?.length)
    failures.push(spell + ": no original animation");
for (const spell of ["fireball", "bigfireball"])
  for (let d = 0; d < 16; d++)
    if (!manifest.animations[`${spell}/${d}`]?.length)
      failures.push(`${spell}/${d}: missing`);
for (const spell of ["beam", "powerstrike", "thrust", "cleave", "firesword"])
  for (let d = 0; d < 8; d++)
    if (!manifest.animations[`${spell}/${d}`]?.length)
      failures.push(`${spell}/${d}: missing`);
for (const [id, f] of Object.entries(manifest.frames))
  if (!f.sourcePath || !f.sha256 || !f.sha1 || !frames[id])
    failures.push(id + ": missing source or atlas entry");
for (const [mapId, m] of Object.entries(manifest.worlds ?? { biche: manifest.world }).filter(([, m]) => m)) {
  if (m.walk.length !== (m.width / m.cellWidth) * (m.height / m.cellHeight))
    failures.push(mapId + ": invalid walk grid");
  if (m.spawn && !m.walk[Math.floor(m.spawn.y / m.cellHeight) * (m.width / m.cellWidth) + Math.floor(m.spawn.x / m.cellWidth)])
    failures.push(mapId + ": spawn is not walkable");
  for (const part of [...m.tiles, ...m.objects]) {
    const id =
      "map/" + part.texture.toString(16).toUpperCase().padStart(8, "0");
    if (!frames[id]) failures.push("map: missing " + id);
  }
}
for (const chapter of Object.keys(manifest.worlds)) {
  const fixture = JSON.parse(fs.readFileSync(new URL(`../tests/fixtures/${chapter}-layout.json`, import.meta.url), "utf8"));
  if (JSON.stringify(manifest.worlds?.[chapter]?.walk) !== JSON.stringify(fixture.walk) || manifest.worlds?.[chapter]?.sourceSha256 !== fixture.sourceSha256)
    failures.push(`${chapter}: checked navigation fixture differs from imported pinned source map`);
}
for (const name of ["womaFlame","womaShock"]) for(let d=0;d<8;d++)
  if(!manifest.animations[`${name}/${d}`]?.length)failures.push(`${name}/${d}: missing original temple effect`);
for (const model of ["zumaStatue","zumaStatue-shadow"]) for(const motion of ["stone","awaken"]) for(let d=0;d<8;d++)
  if(!manifest.animations[`${model}/${motion}/${d}`]?.length)failures.push(`${model}/${motion}/${d}: missing original transformation`);
// Equipment and shadows must share source animation indices, not merely exist.
const requireActor = (name, motions) => {
  for (const motion of motions) for (let dir = 0; dir < 8; dir++)
    if (!manifest.animations[`${name}/${motion}/${dir}`]?.length)
      failures.push(`${name}/${motion}/${dir}: missing appearance pose`);
};
for (const model of new Set(Object.values(appearance.clothes))) {
  requireActor(`dress-${model}`, Object.keys(appearance.motions));
  requireActor(`dress-${model}-shadow`, Object.keys(appearance.motions));
}
for (const model of new Set(Object.values(appearance.weapons))) {
  requireActor(`weapon-${model}`, Object.keys(appearance.motions));
  for (const motion of Object.keys(appearance.motions)) for (let dir = 0; dir < 8; dir++) {
    const body = manifest.animations[`dress-1/${motion}/${dir}`] ?? [];
    const weapon = manifest.animations[`weapon-${model}/${motion}/${dir}`] ?? [];
    const frames = new Set(weapon.map((k) => k.split("/").at(-1)));
    for (const frame of body) if (!frames.has(frame.split("/").at(-1)))
      failures.push(`weapon-${model}: missing matching body index ${frame}`);
  }
}
for (const name of Object.keys(monsters.models)) {
  if(stationary.has(name)) {
    for(const motion of ["idle","attack","hurt","death"])
      if(!manifest.animations[`${name}-shadow/${motion}/0`]?.length)failures.push(`${name}: missing stationary shadow ${motion}`);
  } else requireActor(name + "-shadow", ["idle", "walk", "attack", "hurt", "death"]);
}
for(const [name,ui] of Object.entries(manifest.uiFiles ?? {})) {
  const sha=createHash("sha256").update(fs.readFileSync(new URL(ui.file,root))).digest("hex");
  if(sha!==ui.sha256 || ui.sourceSha256!==manifest.frames[ui.frame]?.sha256)failures.push(name+": UI PNG differs from original source");
}
for(const name of ["board","chat","hp","mp","panel"])
  if(!manifest.uiFiles?.[name])failures.push(name+": missing original UI asset");
// New forest species must use their own source lookID in all eight directions.
for (const [name, look] of Object.entries(monsters.models))
  for (const [id, frame] of Object.entries(manifest.frames)) {
    if (frame.sourcePath.startsWith("texture/monster/") && (id.startsWith(name + "/") || id.startsWith(name + "-shadow/"))) {
      const code = parseInt(frame.sourcePath.split("/").at(-1).slice(0, 8), 16);
      if ((code >>> 12) !== (id.includes("-shadow/") ? look | (1 << 11) : look))
        failures.push(id + ": wrong original monster model");
    }
  }
for (const name of ["dress-1", "dress-1-shadow", "weapon-8"])
  for (const motion of Object.keys(appearance.motions)) for (let dir = 0; dir < 8; dir++)
    for (const key of manifest.animations[`${name}/${motion}/${dir}`] ?? [])
      if (manifest.pages.find((p) => p.key === manifest.frames[key].texture)?.lazy)
        failures.push(key + ": starter outfit must be preloaded");
for (const page of manifest.pages)
  if (page.group === "core" && page.lazy) failures.push(page.key + ": core atlas cannot be lazy");
console.log(
  JSON.stringify(
    {
      frames: Object.keys(manifest.frames).length,
      animations: Object.keys(manifest.animations).length,
      pages: manifest.pages.map((p) => ({
        key: p.key,
        width: p.width,
        height: p.height,
      })),
      releaseStatus: manifest.releaseStatus,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
if (process.argv.includes("--release")) checkReleaseAuthorization();
