import project from "../package.json";

export const isGraybox = import.meta.env.VITE_ASSET_MODE === "graybox";
export const releaseVersion =
  import.meta.env.VITE_RELEASE_VERSION || `v${project.version}`;
export const releaseCommit = (import.meta.env.VITE_GIT_SHA || "local").slice(
  0,
  7,
);
export const repositoryUrl = "https://github.com/holynova/mafa-survivor";
export const assetUrl = (file: string) =>
  `${import.meta.env.BASE_URL}assets/mir/${file}`;
