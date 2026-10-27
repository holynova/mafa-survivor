import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import project from "../package.json" with { type: "json" };

const profile = process.env.PAGES_ASSET_MODE;
if (!["graybox", "original"].includes(profile)) {
  throw new Error(
    "Set PAGES_ASSET_MODE after the public asset plan is confirmed (graybox or original).",
  );
}
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (profile === "original") {
  run("node", ["tools/check-assets.mjs", "--release"]);
  run("python3", ["tools/check-audio.py"]);
}
const version = process.env.VITE_RELEASE_VERSION || `v${project.version}`;
const commit = process.env.VITE_GIT_SHA || process.env.GITHUB_SHA || "local";
run("npm", ["run", "build"], {
  ...process.env,
  BASE_PATH: process.env.BASE_PATH || "/mafa-survivor/",
  VITE_ASSET_MODE: profile,
  VITE_RELEASE_VERSION: version,
  VITE_GIT_SHA: commit,
});
fs.writeFileSync(
  "dist/version.json",
  JSON.stringify(
    { version, commit, assetMode: profile, builtAt: new Date().toISOString() },
    null,
    2,
  ),
);
fs.writeFileSync("dist/.nojekyll", "");
if (profile === "graybox") {
  const walk = (directory) =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    });
  const prohibited = walk("dist").filter(
    (file) =>
      /\.(png|jpe?g|webp|gif|wav|mp3|ogg|bin)$/i.test(file) ||
      /[/\\]mir[/\\]/.test(file),
  );
  if (prohibited.length)
    throw new Error(
      "Graybox artifact contains prohibited original media: " +
        prohibited.join(", "),
    );
}
console.log(
  `Pages artifact verified: ${version}, ${profile}, ${commit.slice(0, 7)}`,
);
