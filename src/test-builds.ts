import type {Game} from "./game";
import {getSkill,type SkillId,type SkillField} from "./spells";
import {getItem,MAPS} from "./content";
import {hasWorldAppearance} from "./appearance";
import {testWear} from "./test-mode";

type TestBuild={id:string;name:string;classId:"warrior"|"taoist";equipment:readonly string[];skills:readonly {id:SkillId;fields:readonly SkillField[]}[]};
export const TEST_BUILDS:readonly TestBuild[]=[
  {id:"warrior-fire",name:"战士 · 烈火攻杀",classId:"warrior",equipment:["equip-extra-井中月","equip-extra-战神盔甲"],skills:[
    {id:"swordsmanship",fields:["power","power"]},{id:"powerstrike",fields:["power","power"]},
    {id:"thrust",fields:["power","power"]},{id:"cleave",fields:["power","localCDR"]},
    {id:"dash",fields:["localCDR","localCDR"]},{id:"firesword",fields:["power","localCDR"]},
  ]},
  {id:"taoist-summon",name:"道士 · 符毒双召唤",classId:"taoist",equipment:["equip-extra-龙纹剑","equip-extra-灵魂战衣"],skills:[
    {id:"talisman",fields:["power","localCDR"]},{id:"poison",fields:["duration","count"]},
    {id:"skeleton",fields:["count","summonPower"]},{id:"beast",fields:["summonPower","radius"]},
    {id:"heal",fields:["power","localCDR"]},{id:"armor",fields:["duration","power"]},
  ]},
];

/** Explicit test grants, using shipped equipment and two legal branches per skill. */
export function testBossBuild(g:Game,id:string) {
  const build=TEST_BUILDS.find(b=>b.id===id);
  if(g.mode!=="test" || !build || !["battle","paused"].includes(g.phase))return false;
  const equipment=build.equipment.map(getItem);
  if(equipment.some(item=>!hasWorldAppearance(item) || item.classId!==build.classId))return false;
  const branches=build.skills.map(spec=>{
    const skill=getSkill(spec.id);
    if(skill.classId!==build.classId || spec.fields.length!==2)throw Error("Invalid test build skill");
    return spec.fields.map(field=>{
      const branch=skill.branches.find(b=>b.field===field);
      if(!branch)throw Error(`Invalid test build branch: ${spec.id}/${field}`);
      return branch;
    });
  });
  const mapId=g.mapId;g.start("test",176,build.classId,false,mapId);
  const point=g.navigation?.reachablePoints(g.player,150,230).filter(p=>g.attackLineClear(g.player,p))
    .sort((a,b)=>Math.hypot(a.x-g.player.x+190,a.y-g.player.y)-Math.hypot(b.x-g.player.x+190,b.y-g.player.y))[0];
  if(!point)return false;
  g.skills=build.skills.map((spec,i)=>{
    const s=g.newSkill(spec.id);s.cd=0;
    for(const branch of branches[i]){s.rank++;s[branch.field]+=branch.value;}
    return s;
  });
  // Lv18 represents 5 learned skills + 12 branch selections; no other bonuses.
  g.level=18;g.wave=g.maxWaves;g.bossSpawned=true;
  for(const item of equipment)testWear(g,item.id);
  Object.assign(g.test,{spawning:false,god:false,autowalk:true});
  const boss=g.spawnEnemy(MAPS[mapId].boss);Object.assign(boss,point);
  g.test.bossBuild={name:build.name,boss,equipment:equipment.map(item=>item.name),
    branches:build.skills.map((spec,i)=>`${getSkill(spec.id).name}：${branches[i].map(b=>b.label).join("、")}`)};
  g.pause();g.emit();return true;
}
