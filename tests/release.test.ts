import { afterEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { assetUrl } from "../src/release";
// @ts-expect-error Build helper is native JavaScript.
import { validateAuthorization } from "../tools/asset-authorization.mjs";

afterEach(() => vi.unstubAllEnvs());
it("keeps atlas and audio requests under the GitHub Pages project prefix", () => {
  vi.stubEnv("BASE_URL", "/mafa-survivor/");
  vi.stubEnv("VITE_GIT_SHA", "test-stage");
  expect(assetUrl("atlas-0.png")).toBe("/mafa-survivor/assets/mir/atlas-0.png?rev=test-stage");
  expect(assetUrl("audio/manifest.json")).toBe(
    "/mafa-survivor/assets/mir/audio/manifest.json?rev=test-stage",
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

it("changes image and manifest URLs between releases so stale atlas coordinates cannot mix", () => {
  vi.stubEnv("VITE_GIT_SHA", "old-stage"); const before = assetUrl("manifest.json");
  vi.stubEnv("VITE_GIT_SHA", "new-stage");
  expect(assetUrl("manifest.json")).not.toBe(before);
  expect(assetUrl("atlas-0.png")).toContain("rev=new-stage");
  expect(assetUrl("audio/manifest.json")).toContain("rev=new-stage");
});

it("requires every additional source to retain its independently pinned kind, revision and scope",()=>{
 const source={id:"native",repository:"https://github.com/test/native",ref:"fixed",assetKinds:["images"]};
 const record={...confirmation,additionalSources:[{...source,scope:confirmation.scope}]};
 const manifest={...resource,sources:[source],frames:{tile:{sourceId:"native",sourceRepository:source.repository,sourceRef:source.ref}}};
 expect(validateAuthorization(record,manifest,["images","map"])).toBe(true);
 expect(validateAuthorization(confirmation,manifest,["images","map"])).toBe(false);
 expect(validateAuthorization(record,{...manifest,sources:[{...source,ref:"changed"}]},["images","map"])).toBe(false);
 expect(validateAuthorization({...record,additionalSources:[{...source,scope:["local"]}]},manifest,["images"])).toBe(false);
 expect(validateAuthorization(record,{...manifest,worlds:{map:manifest.frames.tile}},["images"])).toBe(false);
 expect(validateAuthorization(record,{...manifest,frames:{tile:{...manifest.frames.tile,sourceRef:"unlisted"}}},["images"])).toBe(false);
});
