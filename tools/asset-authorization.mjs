import fs from "node:fs";

export function validateAuthorization(record, manifest, kinds) {
  const base = record?.basis === "project_owner_attestation" &&
    Boolean(record.statement && record.confirmedAt) &&
    record.repository === manifest.repository && record.ref === manifest.ref &&
    kinds.every((kind) => record.assetKinds?.includes(kind)) &&
    ["public_github_pages", "stage_releases"].every((scope) => record.scope?.includes(scope)) &&
    manifest.releaseStatus === "AUTHORIZED_BY_PROJECT_OWNER" &&
    manifest.authorizationEvidence === "docs/asset-authorization.json";
  if (!base) return false;
  const sources = manifest.sources ?? [];
  if (!Array.isArray(sources)) return false;
  const identities = new Set();
  for (const source of sources) {
    const entry = record.additionalSources?.find((s) => s.repository === source.repository && s.ref === source.ref);
    if (!source.id || identities.has(source.id) || !entry || !source.assetKinds?.length ||
      !source.assetKinds.every((kind) => entry.assetKinds?.includes(kind)) ||
      !["public_github_pages", "stage_releases"].every((scope) => entry.scope?.includes(scope))) return false;
    identities.add(source.id);
  }
  for (const [entry, kind] of [...Object.values(manifest.frames ?? {}).map((entry) => [entry, "images"]), ...Object.values(manifest.worlds ?? {}).map((entry) => [entry, "map"])]) {
    if (!entry.sourceId && !entry.sourceRepository && !entry.sourceRef) continue;
    const source = sources.find((s) => s.id === entry.sourceId);
    if (!source || !source.assetKinds.includes(kind) || source.repository !== entry.sourceRepository || source.ref !== entry.sourceRef) return false;
  }
  return true;
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
