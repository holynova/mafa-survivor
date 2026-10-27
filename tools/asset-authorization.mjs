import fs from "node:fs";

export function validateAuthorization(record, manifest, kinds) {
  return record?.basis === "project_owner_attestation" &&
    Boolean(record.statement && record.confirmedAt) &&
    record.repository === manifest.repository && record.ref === manifest.ref &&
    kinds.every((kind) => record.assetKinds?.includes(kind)) &&
    ["public_github_pages", "stage_releases"].every((scope) => record.scope?.includes(scope)) &&
    manifest.releaseStatus === "AUTHORIZED_BY_PROJECT_OWNER" &&
    manifest.authorizationEvidence === "docs/asset-authorization.json";
}

export function checkReleaseAuthorization() {
  const read = (file) => JSON.parse(fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"));
  const record = read("docs/asset-authorization.json");
  for (const [file, kinds] of [
    ["docs/asset-manifest.json", ["images", "map"]],
    ["public/assets/mir/manifest.json", ["images", "map"]],
    ["docs/audio-manifest.json", ["audio"]],
    ["public/assets/mir/audio/manifest.json", ["audio"]],
  ]) {
    if (!validateAuthorization(record, read(file), kinds))
      throw new Error("Asset authorization does not cover " + file);
  }
}
