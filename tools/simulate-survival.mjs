import {createServer} from 'vite';
import fs from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const {Game}=await server.ssrLoadModule('/src/game.ts');
 const {simulationInput}=await server.ssrLoadModule('/src/simulation.ts');
 const {EVOLUTIONS}=await server.ssrLoadModule('/src/survivor.ts');
 const {setWorldLayouts}=await server.ssrLoadModule('/src/world.ts');
 const maps=(process.argv.find(a=>a.startsWith('--maps='))?.slice(7)??'biche').split(',');
 const seeds=(process.argv.find(a=>a.startsWith('--seeds='))?.slice(8)??'176').split(',').map(Number);
 const layouts={};for(const map of maps){if(!/^[a-z]+$/.test(map))throw new Error('Invalid map');layouts[map]=JSON.parse(await fs.readFile(`tests/fixtures/${map}-layout.json`,'utf8'));}setWorldLayouts(layouts);
 const reports=[];
 for(const mapId of maps)for(const seed of seeds)for(const classId of ['wizard','warrior','taoist']){
 const g=new Game();g.survivorMode=true;g.unlockedMaps.add(mapId);g.start('normal',seed,classId,false,mapId);let firstUpgrade=null,firstEvo=null,steps=0,saveChecks=0,maxSaveCharacters=0,maxSaveMS=0,move={x:0,y:0};
 while(!['won','dead'].includes(g.phase)&&steps++<40000){
 if(g.phase==='upgrade'){firstUpgrade??=g.clock;const score=c=>{if(c.skill&&g.skills.some(s=>s.id===c.skill))return 100;const ready=g.skills.find(s=>EVOLUTIONS[s.id]&&c.id==='p:'+EVOLUTIONS[s.id].charm);return ready?95:c.skill?30:10;};const c=[...g.choices].sort((a,b)=>score(b)-score(a))[0];if(c)g.choose(c.id);else{g.player.hp=g.maxHP;g.phase='battle';}}
 else if(g.phase==='paused'){firstEvo??=g.clock;g.pause();}
 else {if(steps%5===0)move=simulationInput(g,move);g.input=move;g.step(.05);if(process.argv.includes('--check-save')&&steps%1200===0&&g.phase==='battle'){const begin=performance.now();const cp=g.snapshotSurvival();maxSaveMS=Math.max(maxSaveMS,performance.now()-begin);maxSaveCharacters=Math.max(maxSaveCharacters,JSON.stringify(cp).length);saveChecks++;}}
 }
 reports.push({mapId,seed,classId,saveChecks,maxSaveCharacters,maxSaveMS,phase:g.phase,seconds:Math.round(g.clock),level:g.level,kills:g.kills,firstUpgrade,firstEvo,skills:g.skills.map(s=>({id:s.id,rank:s.rank})),evolved:g.survival.evolved});console.log(JSON.stringify(reports.at(-1)));
 }
 await fs.writeFile(process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'.artifacts/survival-simulation.json',JSON.stringify({note:'Legacy kiting bot, not human win-rate; no direct teleport/chest-seeking.',reports},null,2));
}finally{await server.close();}
