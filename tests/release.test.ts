import { afterEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { assetUrl } from "../src/release";
// @ts-expect-error Build helper is native JavaScript.
import { validateAuthorization } from "../tools/asset-authorization.mjs";

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
const resource = { repository: "https://github.com/etorth/mir2x_res", ref: "pinned",
  releaseStatus: "AUTHORIZED_BY_PROJECT_OWNER", authorizationEvidence: "docs/asset-authorization.json" };
const confirmation = { ...resource, basis: "project_owner_attestation", statement: "确认拥有原版授权，直接发布公开版本",
  confirmedAt: "2026-10-27", assetKinds: ["images", "map", "audio"], scope: ["public_github_pages", "stage_releases"] };
it("accepts the recorded owner confirmation for images, map and audio", () => {
  expect(validateAuthorization(confirmation, resource, ["images", "map", "audio"])).toBe(true);
});
it("does not authorize a changed source revision", () => {
  expect(validateAuthorization(confirmation, { ...resource, ref: "new-source" }, ["images"])).toBe(false);
});
it("does not treat an original profile or status alone as permission", () => {
  expect(validateAuthorization({ assetMode: "original" }, resource, ["images"])).toBe(false);
  expect(validateAuthorization(confirmation, { ...resource, releaseStatus: "BLOCKED_BY_ASSET_RIGHTS" }, ["images"])).toBe(false);
});
it("requires confirmation to cover audio and public stage distribution", () => {
  expect(validateAuthorization({ ...confirmation, assetKinds: ["images", "map"] }, resource, ["audio"])).toBe(false);
  expect(validateAuthorization({ ...confirmation, scope: ["local"] }, resource, ["images"])).toBe(false);
});
