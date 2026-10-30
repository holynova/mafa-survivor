import {createServer} from "vite";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import fs from "node:fs/promises";
const root=new URL("../",import.meta.url);
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const match=/^--(seeds|maps|builds|out)=(.+)$/.exec(arg);if(!match)throw Error("Use --seeds=176,17,991 --maps=biche --builds=all --out=.artifacts/builds.json");return [match[1],match[2]];}));
const seeds=(args.seeds??"176").split(",").map(Number),maps=(args.maps??"biche").split(",");
const server=await createServer({root:root.pathname,server:{middlewareMode:true,watch:null,hmr:false},appType:"custom"});
try {
 const {Game}=await server.ssrLoadModule("/src/game.ts");
 const {RUN_BUILDS}=await server.ssrLoadModule("/src/builds.ts");
 const {simulationInput,simulateShop}=await server.ssrLoadModule("/src/simulation.ts");
 const {canAdvanceSkill}=await server.ssrLoadModule("/src/skill-growth.ts");
 const {getItem}=await server.ssrLoadModule("/src/content.ts");
 const {setWorldLayouts}=await server.ssrLoadModule("/src/world.ts");
 const {expNeeded}=await server.ssrLoadModule("/src/rules.ts");
 const builds=args.builds && args.builds!=="all" ? RUN_BUILDS.filter(b=>args.builds.split(",").includes(b.id)) : RUN_BUILDS;
 if(!builds.length || seeds.some(n=>!Number.isSafeInteger(n)))throw Error("Invalid build or seed");
 const layouts={};for(const map of maps)layouts[map]=JSON.parse(await fs.readFile(new URL(`tests/fixtures/${map}-layout.json`,root),"utf8"));setWorldLayouts(layouts);
 const results=[];
 for(const seed of seeds)for(const mapId of maps)for(const build of builds) {
  const g=new Game();g.applyProgress({crystals:0,unlockedMaps:[mapId]});g.start("normal",seed,build.classId,false,mapId);
  const sync=()=>{
   const wish=build.skills.find(s=>!g.skills.some(a=>a.id===s.id));g.setBookWish(wish?.id??null);
   const focus=build.skills.find(spec=>g.skills.some(s=>s.id===spec.id && s.rank<spec.rank && canAdvanceSkill(s,g.wave)));
   g.setSkillFocus(focus?.id??null);
  };
  sync();let ticks=0,interactions=0,skillChoices=0,statChoices=0,failure=null;const waves=[];
  while(ticks<54061 && interactions<5000 && !["won","dead"].includes(g.phase)) {
   if(g.phase==="upgrade") {
    const score=c=>{
     if(c.skill) {const index=build.skills.findIndex(s=>s.id===c.skill),spec=build.skills[index],owned=g.skills.find(s=>s.id===c.skill);
      return !spec || owned && owned.rank>=spec.rank ? -10 : (owned ? 100 : 90)-index*4;}
     return c.stat==="hp_max" && g.player.hp/g.maxHP<.6 ? 110 : c.stat==="hp_max" ? 35 : c.stat==="move_speed" ? 30 : 25;
    };
    const c=[...g.choices].sort((a,b)=>score(b)-score(a))[0];if(!c){failure="empty choices";break;}
    c.skill ? skillChoices++ : statChoices++;g.choose(c.id);interactions++;sync();continue;
   }
   if(g.phase==="replace") {g.replaceSkill(null);interactions++;continue;}
   if(g.phase==="shop") {
    const hp=g.offers.find(o=>!o.sold && getItem(o.itemId).kind==="heal");
    if(hp && g.player.hp/g.maxHP<.4 && g.gold>=hp.price)g.buy(hp.id);
    const book=g.bookOffer,spec=book && build.skills.find(s=>s.id===book.skill);
    if(book && spec && (build.skills.indexOf(spec)<2 || g.wave>=5))g.buyBook(book.id);
    if(g.phase!=="shop"){failure="unexpected full-slot book prompt";break;}
    simulateShop(g);
    waves.push({wave:g.wave,waveKills:g.lastWaveKills,training:{...g.training},level:g.level,hp:g.player.hp,gold:g.gold,books:[...g.booksBought],skillChoices,statChoices,skills:g.skills.map(s=>({id:s.id,rank:s.rank}))});
    g.nextWave();interactions++;sync();continue;
   }
   if(g.phase!=="battle"){failure=`unhandled ${g.phase}`;break;}
   if(ticks%10===0)g.input=simulationInput(g,g.input);
   g.step(1/60);ticks++;
   if(ticks%60===0 && (g.gold<0 || g.player.hp>g.maxHP+1e-6 || g.skills.length>6 || !g.canStand(g.player.x,g.player.y))) {failure="state invariant";break;}
  }
  const result={seed,mapId,build:build.id,classId:build.classId,phase:g.phase,terminal:["won","dead"].includes(g.phase),failure,wave:g.wave,seconds:g.clock,level:g.level,training:{...g.training},exp:g.exp,expNext:expNeeded(g.level),skillChoices,statChoices,books:[...g.booksBought],goldEarned:g.totalGold,gold:g.gold,skills:g.skills.map(s=>({id:s.id,rank:s.rank})),damage:g.damageDealt,healing:g.tao.healing,bossKilled:g.bossKilled,waves};
  results.push(result);console.log(JSON.stringify({seed,mapId,build:build.id,phase:g.phase,wave:g.wave,level:g.level,books:g.booksBought.length,failure}));
 }
 const sources=["tools/simulate-builds.mjs","src/simulation.ts","src/equipment.ts","src/builds.ts"],policySources={};
 for(const path of sources)policySources[path]=createHash("sha256").update(await fs.readFile(new URL(path,root))).digest("hex");
 const report={policy:"six-rank-build-v1-shared-v9-movement",policySources,sourceCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),sourceDirty:!!execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).trim(),generatedAt:new Date().toISOString(),results};
 await fs.writeFile(new URL(args.out??".artifacts/build-simulation.json",root),JSON.stringify(report,null,2)+"\n");
 if(results.some(r=>r.failure || !r.terminal))process.exitCode=1;
}finally{await server.close();}
