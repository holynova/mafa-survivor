import fs from "node:fs";
const root = new URL("../public/assets/mir/", import.meta.url);
const manifest = JSON.parse(
  fs.readFileSync(new URL("manifest.json", root), "utf8"),
);
const frames = {};
const failures = [];
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
for (const actor of [
  "wizard",
  "warrior",
  "scarecrow",
  "cat",
  "rakecat",
  "orc",
  "boss",
])
  for (const motion of ["wizard", "warrior"].includes(actor)
    ? ["idle", "walk", "cast", "attack", "hurt", "death"]
    : ["idle", "walk", "attack", "hurt", "death"])
    for (let dir = 0; dir < 8; dir++)
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
if (
  process.argv.includes("--release") &&
  manifest.releaseStatus !== "CLEARED_FOR_DISTRIBUTION"
) {
  console.error(
    "BLOCKED_BY_ASSET_RIGHTS: original artwork redistribution rights are unverified.",
  );
  process.exitCode = 1;
}
