import type {Game} from "./game";
import {getSkill} from "./spells";
import {getItem,ITEMS,MAPS} from "./content";
import {hasWorldAppearance} from "./appearance";
import {testWear} from "./test-mode";

export {RUN_BUILDS as TEST_BUILDS} from "./builds";
import {RUN_BUILDS as TEST_BUILDS} from "./builds";

/** Explicit test grants for the six-rank endpoints; bypasses growth/economy only in test mode. */
export function testBossBuild(g:Game,id:string) {
  const build=TEST_BUILDS.find(b=>b.id===id);
  if(g.mode!=="test" || !build || !["battle","paused"].includes(g.phase))return false;
  const equipment=build.equipment.map(name=>ITEMS.find(item=>item.name===name)!);
  if(equipment.some(item=>!hasWorldAppearance(item) || item.classId!==build.classId))return false;
  const mapId=g.mapId;g.start("test",176,build.classId,false,mapId);
  const point=g.navigation?.reachablePoints(g.player,150,230).filter(p=>g.attackLineClear(g.player,p))
    .sort((a,b)=>Math.hypot(a.x-g.player.x+190,a.y-g.player.y)-Math.hypot(b.x-g.player.x+190,b.y-g.player.y))[0];
  if(!point)return false;
  g.skills=build.skills.map(spec=>{const s=g.newSkill(spec.id,spec.rank);s.cd=0;return s;});
  // 19 skill choices after the initial skill; equipment is explicitly granted.
  g.level=20;g.wave=g.maxWaves;g.bossSpawned=true;
  for(const item of equipment)testWear(g,item.id);
  Object.assign(g.test,{spawning:false,god:false,autowalk:true});
  const boss=g.spawnEnemy(MAPS[mapId].boss);Object.assign(boss,point);
  g.test.bossBuild={name:build.name,boss,equipment:equipment.map(item=>item.name),
    branches:build.skills.map(spec=>`${getSkill(spec.id).name} Lv.${spec.rank}`)};
  g.pause();g.emit();return true;
}
