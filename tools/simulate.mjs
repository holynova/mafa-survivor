import {createServer} from "vite";
import {createHash} from "node:crypto";
import fs from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=fileURLToPath(new URL("../",import.meta.url));
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  const match=/^--(seeds|maps|classes|mode|out)=(.+)$/.exec(arg);
  if(!match)throw new Error(`Unknown option ${arg}; use --seeds=176 --maps=biche,mine,woma,zuma --classes=wizard,warrior,taoist --mode=normal --out=.artifacts/simulation.json`);
  return [match[1],match[2]];
}));
const seeds=(args.seeds ?? "176").split(",").map(Number);
const maps=(args.maps ?? "biche,mine,woma,zuma").split(",");
const classes=(args.classes ?? "wizard,warrior,taoist").split(",");
const mode=args.mode ?? "normal";
if(seeds.some(s=>!Number.isSafeInteger(s)) || maps.some(m=>!["biche","mine","woma","zuma"].includes(m)) ||
  classes.some(c=>!["wizard","warrior","taoist"].includes(c)) || !["normal","trial"].includes(mode))throw new Error("Invalid simulation matrix");
const server=await createServer({root,server:{middlewareMode:true,watch:null,hmr:false},appType:"custom"});
try {
  const policySha256=createHash("sha256").update(await fs.readFile(new URL("../src/simulation.ts",import.meta.url))).digest("hex");
  const {runSimulation}=await server.ssrLoadModule("/src/simulation.ts");
  const {setWorldLayouts}=await server.ssrLoadModule("/src/world.ts");
  const layouts={};
  for(const map of maps)layouts[map]=JSON.parse(await fs.readFile(new URL(`../tests/fixtures/${map}-layout.json`,import.meta.url),"utf8"));
  setWorldLayouts(layouts);
  const results=[];
  for(const seed of seeds)for(const mapId of maps)for(const classId of classes) {
    const result=runSimulation({seed,mapId,classId,mode});results.push(result);
    console.log(JSON.stringify({seed,mapId,classId,phase:result.phase,wave:result.wave,seconds:Math.round(result.seconds),kills:result.kills,level:result.level,failure:result.failure}));
  }
  const snapshot=await fs.readFile(new URL("../.source-commit",import.meta.url),"utf8").catch(e=>{if(e.code==="ENOENT")return null;throw e;});
  const report={schemaVersion:1,policy:"fixed-step-kiting-v4",policySha256,sourceCommit:snapshot?.trim() ?? execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),
    sourceSnapshot:snapshot ? "git-archive engine with separately hashed current controller" : null,
    sourceDirty:snapshot ? null : !!execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).trim(),generatedAt:new Date().toISOString(),
    sourceMaps:Object.fromEntries(Object.entries(layouts).map(([id,layout])=>[id,{sourcePath:layout.sourcePath,sourceSha256:layout.sourceSha256}])),results};
  const output=new URL(args.out ?? ".artifacts/simulation.json",new URL("../",import.meta.url));
  await fs.mkdir(new URL(".",output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+"\n");
  console.log(`Saved ${results.length} real combat runs to ${fileURLToPath(output)}`);
  if(results.some(r=>r.failure || !r.terminal))process.exitCode=1;
} finally {await server.close();}
