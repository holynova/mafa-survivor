import { afterEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { assetUrl } from "../src/release";

afterEach(() => vi.unstubAllEnvs());
it("keeps atlas and audio requests under the GitHub Pages project prefix", () => {
  vi.stubEnv("BASE_URL", "/mafa-survivor/");
  expect(assetUrl("atlas-0.png")).toBe("/mafa-survivor/assets/mir/atlas-0.png");
  expect(assetUrl("audio/manifest.json")).toBe(
    "/mafa-survivor/assets/mir/audio/manifest.json",
  );
});
it("refuses a public build with an unconfirmed asset profile", () => {
  const result = spawnSync(process.execPath, ["tools/build-pages.mjs"], {
    env: { ...process.env, PAGES_ASSET_MODE: "" },
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("after the public asset plan is confirmed");
});
it("does not treat the original profile as permission to distribute unverified assets", () => {
  const result = spawnSync(process.execPath, ["tools/build-pages.mjs"], {
    env: { ...process.env, PAGES_ASSET_MODE: "original" },
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("BLOCKED_BY_ASSET_RIGHTS");
});
