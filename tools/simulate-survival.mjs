import {createServer} from 'vite';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const flags=new Set(['--trace-final-boss','--seek-experience','--accept-challenge','--hunt-elites','--seek-chests','--use-recovery','--focus-evolutions','--check-save']);
for(const arg of process.argv.slice(2))if(!flags.has(arg)&&!/^--(maps|roles|seeds|strategy|starter|out|max-steps)=.+$/.test(arg))throw new Error(`Unknown simulation option: ${arg}`);
const maxSteps=Number(process.argv.find(a=>a.startsWith('--max-steps='))?.slice(12)??40000);
if(!Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>40000)throw new Error('max-steps must be an integer from 1 to 40000');
const starterPolicy=process.argv.find(a=>a.startsWith('--starter='))?.slice(10)??'default';
if(!['default','alternative'].includes(starterPolicy))throw new Error('starter must be default or alternative');
const sourceMetadata={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),policyHash:createHash('sha256').update(await fs.readFile('tools/simulate-survival.mjs')).update(await fs.readFile('src/simulation.ts')).digest('hex')};
const server=await createServer({server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const {buySupply,supplyCredits,supplyCost}=await server.ssrLoadModule('/src/survivor-supplies.ts');
 const {challengeAvailable,acceptChapterChallenge}=await server.ssrLoadModule('/src/chapter-challenge.ts');
 const acceptChallenge=process.argv.includes('--accept-challenge');
 const huntElites=process.argv.includes('--hunt-elites');
 const seekChests=process.argv.includes('--seek-chests');
 const useRecovery=process.argv.includes('--use-recovery');
 const {isBossKind}=await server.ssrLoadModule('/src/content.ts');
 const {Game}=await server.ssrLoadModule('/src/game.ts');
 const {simulationInput}=await server.ssrLoadModule('/src/simulation.ts');
 const {SURVIVOR_STARTS}=await server.ssrLoadModule('/src/survivor-starts.ts');
 const {EVOLUTIONS}=await server.ssrLoadModule('/src/survivor.ts');
 const {setWorldLayouts}=await server.ssrLoadModule('/src/world.ts');
 const maps=(process.argv.find(a=>a.startsWith('--maps='))?.slice(7)??'biche').split(',');
 const roles=(process.argv.find(a=>a.startsWith('--roles='))?.slice(8)??'wizard,warrior,taoist').split(',');
 const seeds=(process.argv.find(a=>a.startsWith('--seeds='))?.slice(8)??'176').split(',').map(Number);
 if(!roles.length||roles.some(r=>!['wizard','warrior','taoist'].includes(r))||seeds.some(n=>!Number.isSafeInteger(n)))throw new Error('Invalid role or seed');
 const layouts={};for(const map of maps){if(!/^[a-z]+$/.test(map))throw new Error('Invalid map');layouts[map]=JSON.parse(await fs.readFile(`tests/fixtures/${map}-layout.json`,'utf8'));}setWorldLayouts(layouts);
 const strategy=process.argv.find(a=>a.startsWith('--strategy='))?.slice(11)??'legacy';
 if(!['legacy','single','dual','spread'].includes(strategy))throw new Error('Unknown build strategy');
 const seekExperience=process.argv.includes('--seek-experience');
 const traceFinalBoss=process.argv.includes('--trace-final-boss');
 const reports=[];
 for(const mapId of maps)for(const seed of seeds)for(const classId of roles){
 const g=new Game();g.survivorMode=true;g.unlockedMaps.add(mapId);g.start('normal',seed,classId,false,mapId,starterPolicy==='alternative'?SURVIVOR_STARTS[classId][1]:undefined);const starter=g.skills[0].id;const pair=[...g.survival.mainSkills];if(strategy!=='legacy')g.survival.mainSkills=strategy==='single'?[pair[0]]:strategy==='dual'?[...pair]:[];const checkpoints=[];let firstRank4=null,firstRank8=null,firstMainPair8=null;let nextSample=60;let firstUpgrade=null,firstEvo=null,steps=0,saveChecks=0,maxSaveCharacters=0,maxSaveMS=0,move={x:0,y:0};let failure=null;let challengeAttempted=false;const challengeTransitions=[];let challengeStatus=g.survival.challenge.status;const finalBossTrace=[];let nextBossSample=0;
 while(!['won','dead'].includes(g.phase)&&steps++<maxSteps){
 if(g.survival.challenge.status!==challengeStatus){challengeStatus=g.survival.challenge.status;challengeTransitions.push({at:g.clock,status:challengeStatus,hp:g.player.hp,equipment:{...g.equipment},skills:g.skills.map(s=>s.id+':'+s.rank)});}
 if(traceFinalBoss&&g.phase==='battle'&&g.clock>=nextBossSample){
  const boss=g.enemies.find(e=>e.id===g.survival.finalBossId&&e.hp>0);
  if(boss){const distance=Math.hypot(boss.x-g.player.x,boss.y-g.player.y);finalBossTrace.push({seconds:g.clock,player:{x:g.player.x,y:g.player.y,hp:g.player.hp},boss:{id:boss.id,x:boss.x,y:boss.y,hp:boss.hp,maxHp:boss.maxHp},distance,lineClear:g.attackLineClear(g.player,boss),detectionRange:g.detectionRange,nearerEnemies:g.enemies.filter(e=>e.hp>0&&e.id!==boss.id&&Math.hypot(e.x-g.player.x,e.y-g.player.y)<distance).length,skills:g.skills.map(s=>({id:s.id,rank:s.rank})),pets:g.pets.filter(p=>p.hp>0).map(p=>({kind:p.kind,x:p.x,y:p.y}))});nextBossSample=g.clock+1;}
 }
 if(firstEvo===null&&g.survival.evolved.length)firstEvo=g.clock;
 if(firstMainPair8===null&&pair.length===2&&pair.every(id=>g.skills.some(s=>s.id===id&&s.rank>=8)))firstMainPair8=g.clock;
 if(firstRank4===null&&g.skills.some(s=>s.rank>=4))firstRank4=g.clock;if(firstRank8===null&&g.skills.some(s=>s.rank>=8))firstRank8=g.clock;
 if(g.clock>=nextSample){checkpoints.push({seconds:Math.round(g.clock),hp:g.player.hp,level:g.level,gold:g.gold,totalGold:g.totalGold,supplyCredits:g.survival.supplyBosses.length-g.survival.suppliesBought,kills:g.kills,experience:{held:g.exp,required:g.experienceRequired,ground:g.drops.reduce((sum,d)=>sum+d.exp,0),piles:g.drops.filter(d=>d.exp>0).length,nearby:g.drops.filter(d=>Math.hypot(d.x-g.player.x,d.y-g.player.y)<150).reduce((sum,d)=>sum+d.exp,0)},enemies:g.enemies.length,ranged:g.enemies.filter(e=>e.ranged).length,damage:{...g.damageTaken.sources},damageDealt:{...g.damageDealt},pets:g.pets.filter(p=>p.hp>0).map(p=>({kind:p.kind,hp:p.hp})),chests:g.survival.chests.length,evolved:[...g.survival.evolved],skills:g.skills.map(s=>s.id+':'+s.rank)});nextSample+=60;}
 if(g.phase==='upgrade'){firstUpgrade??=g.clock;const score=c=>{if(strategy!=='legacy'){if(c.id.startsWith('evo:'))return 300;const owned=g.skills.find(s=>s.id===c.skill);if(strategy==='spread'&&c.skill)return 200-(owned?.rank??0)*10;if(c.id.startsWith('p:')&&g.skills.some(s=>s.rank===8&&EVOLUTIONS[s.id]?.charm===c.id.slice(2)))return 250;if(c.skill&&g.survival.mainSkills.includes(c.skill))return 200-(owned?.rank??0);if(owned)return 100;return c.skill?40:30;}if(process.argv.includes('--focus-evolutions')){const pair={wizard:['fireball','firewall'],warrior:['cleave','powerstrike'],taoist:['talisman','poison']}[classId];if(c.id.startsWith('p:')&&g.skills.some(s=>s.rank===8&&EVOLUTIONS[s.id]?.charm===c.id.slice(2)))return 130;if(c.skill&&pair.includes(c.skill))return g.skills.some(s=>s.id===c.skill)?120:110;}if(c.skill&&g.skills.some(s=>s.id===c.skill))return 100;const ready=g.skills.find(s=>EVOLUTIONS[s.id]&&c.id==='p:'+EVOLUTIONS[s.id].charm);return ready?95:c.skill?30:10;};const c=[...g.choices].sort((a,b)=>score(b)-score(a))[0];if(c)g.choose(c.id);else{failure='upgrade-without-options';break;}}
 else if(g.phase==='paused'){g.pause();}
 else if(g.phase!=='battle'){failure=`unexpected-phase:${g.phase}`;break;}
 else {if(acceptChallenge&&!challengeAttempted&&challengeAvailable(g)){challengeAttempted=true;g.pause();const accepted=acceptChapterChallenge(g);g.pause();if(!accepted)challengeTransitions.push({at:g.clock,status:'rejected'});}if(useRecovery&&g.player.hp<g.maxHP*.55){if(!g.potions.reserve.length&&supplyCredits(g)>0&&g.gold>=supplyCost(g,'potion')){g.pause();buySupply(g,'potion');g.pause();}g.useBloodPotion();}if(steps%5===0)move=simulationInput(g,move,{seekChests,huntElites,pursueChallenge:acceptChallenge,seekExperience});g.input=move;g.step(.05);if(process.argv.includes('--check-save')&&steps%1200===0&&g.phase==='battle'){const begin=performance.now();const cp=g.snapshotSurvival();maxSaveMS=Math.max(maxSaveMS,performance.now()-begin);maxSaveCharacters=Math.max(maxSaveCharacters,JSON.stringify(cp).length);saveChecks++;}}
 }
 if(!failure&&!['won','dead'].includes(g.phase))failure='step-limit';
 const diagnostic=g.telemetry.snapshot(g);
 const encounters=g.enemies.filter(e=>e.hp>0&&(e.elite||isBossKind(e.kind))).map(e=>({kind:e.kind,hp:e.hp,maxHp:e.maxHp,distance:Math.hypot(e.x-g.player.x,e.y-g.player.y),lineClear:g.attackLineClear(g.player,e)}));
 const finalBoss=g.enemies.find(e=>e.id===g.survival.finalBossId);
 reports.push({finalBossTrace:traceFinalBoss?finalBossTrace:undefined,seekExperience,starter,starterPolicy,acceptChallenge,challengeAttempted,challenge:{...g.survival.challenge},challengeTransitions,challengeEvents:diagnostic?.events.filter(e=>e.type.startsWith('challenge-'))??[],huntElites,failure,deathSource:g.result?.deathSource??null,lastInterval:diagnostic?.current??diagnostic?.samples.at(-1)??null,encounters,equipment:g.equipment,seekChests,useRecovery,damageDealt:{...g.damageDealt},remainingChests:g.survival.chests.length,suppliesBought:g.survival.suppliesBought,potionHealing:g.tao.healing.bloodPotion??0,strategy,recommendedMainSkills:pair,firstMainPair8,firstRank4,firstRank8,gold:g.gold,totalGold:g.totalGold,supplyCredits:g.survival.supplyBosses.length-g.survival.suppliesBought,finalBoss:finalBoss?{kind:finalBoss.kind,hp:finalBoss.hp,maxHp:finalBoss.maxHp,distance:Math.hypot(finalBoss.x-g.player.x,finalBoss.y-g.player.y),lineClear:g.attackLineClear(g.player,finalBoss)}:null,mapId,seed,classId,damageTaken:g.damageTaken,checkpoints,saveChecks,maxSaveCharacters,maxSaveMS,phase:g.phase,seconds:Math.round(g.clock),level:g.level,kills:g.kills,firstUpgrade,firstEvo,skills:g.skills.map(s=>({id:s.id,rank:s.rank})),evolved:g.survival.evolved,evolutionDamage:Object.fromEntries(Object.entries(g.damageDealt).filter(([id])=>id.startsWith('evolution:')))});console.log(JSON.stringify(reports.at(-1)));
 }
 await fs.writeFile(process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'.artifacts/survival-simulation.json',JSON.stringify({...sourceMetadata,traceFinalBoss,starterPolicy,seekExperience,maxSteps,acceptChallenge,huntElites,note:'Scripted movement/build/recovery strategy, not human win-rate; no teleport or free resources.',seekChests,useRecovery,strategy,focusEvolutions:process.argv.includes('--focus-evolutions'),reports},null,2));
 if(reports.some(r=>r.failure))process.exitCode=1;
}finally{await server.close();}
