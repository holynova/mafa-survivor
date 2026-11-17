import {createServer} from 'vite';
import fs from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const {buySupply,supplyCredits,supplyCost}=await server.ssrLoadModule('/src/survivor-supplies.ts');
 const useRecovery=process.argv.includes('--use-recovery');
 const {Game}=await server.ssrLoadModule('/src/game.ts');
 const {simulationInput}=await server.ssrLoadModule('/src/simulation.ts');
 const {EVOLUTIONS,BUILD_GUIDES}=await server.ssrLoadModule('/src/survivor.ts');
 const {setWorldLayouts}=await server.ssrLoadModule('/src/world.ts');
 const maps=(process.argv.find(a=>a.startsWith('--maps='))?.slice(7)??'biche').split(',');
 const roles=(process.argv.find(a=>a.startsWith('--roles='))?.slice(8)??'wizard,warrior,taoist').split(',');
 const seeds=(process.argv.find(a=>a.startsWith('--seeds='))?.slice(8)??'176').split(',').map(Number);
 const layouts={};for(const map of maps){if(!/^[a-z]+$/.test(map))throw new Error('Invalid map');layouts[map]=JSON.parse(await fs.readFile(`tests/fixtures/${map}-layout.json`,'utf8'));}setWorldLayouts(layouts);
 const strategy=process.argv.find(a=>a.startsWith('--strategy='))?.slice(11)??'legacy';
 if(!['legacy','single','dual','spread'].includes(strategy))throw new Error('Unknown build strategy');
 const reports=[];
 for(const mapId of maps)for(const seed of seeds)for(const classId of roles){
 const g=new Game();g.survivorMode=true;g.unlockedMaps.add(mapId);g.start('normal',seed,classId,false,mapId);const pair=BUILD_GUIDES[classId].main;if(strategy!=='legacy')g.survival.mainSkills=strategy==='single'?[pair[0]]:strategy==='dual'?[...pair]:[];const checkpoints=[];let firstRank4=null,firstRank8=null;let nextSample=60;let firstUpgrade=null,firstEvo=null,steps=0,saveChecks=0,maxSaveCharacters=0,maxSaveMS=0,move={x:0,y:0};
 while(!['won','dead'].includes(g.phase)&&steps++<40000){
 if(firstRank4===null&&g.skills.some(s=>s.rank>=4))firstRank4=g.clock;if(firstRank8===null&&g.skills.some(s=>s.rank>=8))firstRank8=g.clock;
 if(g.clock>=nextSample){checkpoints.push({seconds:Math.round(g.clock),hp:g.player.hp,level:g.level,gold:g.gold,totalGold:g.totalGold,supplyCredits:g.survival.supplyBosses.length-g.survival.suppliesBought,kills:g.kills,enemies:g.enemies.length,ranged:g.enemies.filter(e=>e.ranged).length,damage:{...g.damageTaken.sources},skills:g.skills.map(s=>s.id+':'+s.rank)});nextSample+=60;}
 if(g.phase==='upgrade'){firstUpgrade??=g.clock;const score=c=>{if(strategy!=='legacy'){if(c.id.startsWith('evo:'))return 300;const owned=g.skills.find(s=>s.id===c.skill);if(strategy==='spread'&&c.skill)return 200-(owned?.rank??0)*10;if(c.id.startsWith('p:')&&g.skills.some(s=>s.rank===8&&EVOLUTIONS[s.id]?.charm===c.id.slice(2)))return 250;if(c.skill&&g.survival.mainSkills.includes(c.skill))return 200-(owned?.rank??0);if(owned)return 100;return c.skill?40:30;}if(process.argv.includes('--focus-evolutions')){const pair={wizard:['fireball','firewall'],warrior:['cleave','powerstrike'],taoist:['talisman','poison']}[classId];if(c.id.startsWith('p:')&&g.skills.some(s=>s.rank===8&&EVOLUTIONS[s.id]?.charm===c.id.slice(2)))return 130;if(c.skill&&pair.includes(c.skill))return g.skills.some(s=>s.id===c.skill)?120:110;}if(c.skill&&g.skills.some(s=>s.id===c.skill))return 100;const ready=g.skills.find(s=>EVOLUTIONS[s.id]&&c.id==='p:'+EVOLUTIONS[s.id].charm);return ready?95:c.skill?30:10;};const c=[...g.choices].sort((a,b)=>score(b)-score(a))[0];if(c)g.choose(c.id);else{g.player.hp=g.maxHP;g.phase='battle';}}
 else if(g.phase==='paused'){firstEvo??=g.clock;g.pause();}
 else {if(useRecovery&&g.player.hp<g.maxHP*.55){if(!g.potions.reserve.length&&supplyCredits(g)>0&&g.gold>=supplyCost(g,'potion')){g.pause();buySupply(g,'potion');g.pause();}g.useBloodPotion();}if(steps%5===0)move=simulationInput(g,move);g.input=move;g.step(.05);if(process.argv.includes('--check-save')&&steps%1200===0&&g.phase==='battle'){const begin=performance.now();const cp=g.snapshotSurvival();maxSaveMS=Math.max(maxSaveMS,performance.now()-begin);maxSaveCharacters=Math.max(maxSaveCharacters,JSON.stringify(cp).length);saveChecks++;}}
 }
 const finalBoss=g.enemies.find(e=>e.id===g.survival.finalBossId);
 reports.push({useRecovery,suppliesBought:g.survival.suppliesBought,potionHealing:g.tao.healing.bloodPotion??0,strategy,firstRank4,firstRank8,gold:g.gold,totalGold:g.totalGold,supplyCredits:g.survival.supplyBosses.length-g.survival.suppliesBought,finalBoss:finalBoss?{kind:finalBoss.kind,hp:finalBoss.hp,maxHp:finalBoss.maxHp,distance:Math.hypot(finalBoss.x-g.player.x,finalBoss.y-g.player.y),lineClear:g.attackLineClear(g.player,finalBoss)}:null,mapId,seed,classId,damageTaken:g.damageTaken,checkpoints,saveChecks,maxSaveCharacters,maxSaveMS,phase:g.phase,seconds:Math.round(g.clock),level:g.level,kills:g.kills,firstUpgrade,firstEvo,skills:g.skills.map(s=>({id:s.id,rank:s.rank})),evolved:g.survival.evolved,evolutionDamage:Object.fromEntries(Object.entries(g.damageDealt).filter(([id])=>id.startsWith('evolution:')))});console.log(JSON.stringify(reports.at(-1)));
 }
 await fs.writeFile(process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'.artifacts/survival-simulation.json',JSON.stringify({note:'Legacy kiting bot, not human win-rate; no direct teleport/chest-seeking.',strategy,focusEvolutions:process.argv.includes('--focus-evolutions'),reports},null,2));
}finally{await server.close();}
