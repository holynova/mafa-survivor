import {spawnSync,execFileSync} from "node:child_process";
const commit=process.env.VITE_GIT_SHA || execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const result=spawnSync(process.execPath,["tools/build-pages.mjs"],{stdio:"inherit",env:{...process.env,
  PAGES_ASSET_MODE:"original",BASE_PATH:"/",VITE_GIT_SHA:commit}});
if(result.status!==0)process.exit(result.status ?? 1);
