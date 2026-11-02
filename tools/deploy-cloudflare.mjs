import {execFileSync,spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd(),portfolio=path.resolve(process.env.PORTFOLIO_DIR || "../holynova.github.io");
const git=(cwd,...args)=>execFileSync("git",args,{cwd,encoding:"utf8"}).trim();
if(git(root,"branch","--show-current")!=="main" || git(root,"status","--porcelain") ||
  git(portfolio,"branch","--show-current")!=="master" || git(portfolio,"status","--porcelain"))
  throw new Error("Commit and push the intended changes on clean project main and portfolio master before deployment.");
if(!git(portfolio,"remote","get-url","origin").includes("holynova/holynova.github.io"))throw new Error("Unexpected portfolio repository");
const source=JSON.parse(fs.readFileSync(path.join(portfolio,"mafa-survivor/build-source.json"),"utf8"));
if(source.repository!=="https://github.com/holynova/mafa-survivor" || source.base!=="/mafa-survivor/")throw new Error("Unexpected build source");
git(root,"merge-base","--is-ancestor",source.commit,"HEAD");
git(root,"diff","--exit-code",source.commit,"HEAD","--","src","tools","index.html","vite.config.ts","package.json","package-lock.json","docs/asset-authorization.json");
const config=path.join(portfolio,"wrangler.jsonc");
if(JSON.parse(fs.readFileSync(config,"utf8")).name!=="xiaosang-portfolio")throw new Error("Unexpected Worker target");
const result=spawnSync(process.execPath,[path.join(root,"node_modules/wrangler/bin/wrangler.js"),"deploy","--config",config,...(process.argv.includes("--dry-run") ? ["--dry-run"] : [])],{cwd:portfolio,stdio:"inherit"});
process.exit(result.status ?? 1);
