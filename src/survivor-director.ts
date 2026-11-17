import type {MapId} from './content';
export type EncounterStage={at:number;name:string;weights:Record<string,number>};
/** Relative composition, not extra spawns. Each chapter keeps its source roster. */
export const CHAPTER_ENCOUNTERS:Partial<Record<MapId,readonly EncounterStage[]>>={
 biche:[
  {at:0,name:'郊外试探',weights:{scarecrow:5,cat:4,rakecat:2,orc:1,orcWarrior:0,spider:0}},
  {at:120,name:'半兽推进',weights:{scarecrow:2,cat:1,rakecat:2,orc:4,orcWarrior:2,spider:1}},
  {at:360,name:'蛛群交错',weights:{scarecrow:1,cat:1,rakecat:2,orc:3,orcWarrior:3,spider:2}},
  {at:720,name:'勇士压阵',weights:{scarecrow:1,cat:1,rakecat:1,orc:3,orcWarrior:5,spider:2}},
  {at:1080,name:'首领决战',weights:{scarecrow:2,cat:1,rakecat:1,orc:3,orcWarrior:3,spider:1}},
 ],
 shimu:[
  {at:0,name:'红猪探路',weights:{redBoar:5,blackBoar:1,scorpionSnake:0,evilSnake:0}},
  {at:120,name:'黑猪堵路',weights:{redBoar:3,blackBoar:4,scorpionSnake:1,evilSnake:1}},
  {at:360,name:'蛇群压制',weights:{redBoar:2,blackBoar:3,scorpionSnake:2,evilSnake:2}},
  {at:720,name:'重装猪群',weights:{redBoar:2,blackBoar:5,scorpionSnake:2,evilSnake:1}},
  {at:1080,name:'白猪决战',weights:{redBoar:3,blackBoar:3,scorpionSnake:1,evilSnake:1}},
 ],
 bairimen:[
  {at:0,name:'城外巡游',weights:{orc:5,orcWarrior:2,spider:0,moonSpider:0}},
  {at:120,name:'蛛网试探',weights:{orc:3,orcWarrior:3,spider:1,moonSpider:1}},
  {at:360,name:'密林夹击',weights:{orc:2,orcWarrior:4,spider:2,moonSpider:2}},
  {at:720,name:'月魔围攻',weights:{orc:2,orcWarrior:3,spider:1,moonSpider:3}},
  {at:1080,name:'赤月决战',weights:{orc:3,orcWarrior:3,spider:1,moonSpider:1}},
 ],
};
export function encounterStage(map:MapId,seconds:number){return CHAPTER_ENCOUNTERS[map]?.filter(s=>seconds>=s.at).at(-1);}
export function chapterMonsterWeight(map:MapId,seconds:number,kind:string){return encounterStage(map,seconds)?.weights[kind]??1;}
/** Narrow routes and multi-shot snakes need a lower firing-line population. */
export function chapterRangedLimit(map:MapId|undefined,seconds:number,base:number){
 if(map==='shimu'||map==='bairimen')return Math.min(base,seconds<360?3:seconds<720?5:8);
 if(map==='biche')return Math.min(base,12);
 return base;
}
