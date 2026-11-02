import {execFileSync,spawnSync} from "node:child_process";
if(execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim()!=="main" ||
  execFileSync("git",["status","--porcelain"],{encoding:"utf8"}).trim()) {
  throw new Error("Cloudflare deployment requires a clean main checkout. Commit the intended changes first.");
}
for(const [cmd,args] of [["npm",["run","build:cloudflare"]],[process.execPath,["node_modules/wrangler/bin/wrangler.js","deploy","--config","wrangler.jsonc"]]]) {
  const result=spawnSync(cmd,args,{stdio:"inherit"});if(result.status!==0)process.exit(result.status ?? 1);
}
