import type {Game} from './game';
export const GUIDE_KEY='mafa-survivor-guide-v1';
export type GuideProgress={move:boolean;pickup:boolean;choice:boolean};
const empty=():GuideProgress=>({move:false,pickup:false,choice:false});
export function readGuide(storage:Pick<Storage,'getItem'>|undefined):GuideProgress{try{const v=JSON.parse(storage?.getItem(GUIDE_KEY)??'{}');return {move:v?.move===true,pickup:v?.pickup===true,choice:v?.choice===true};}catch{return empty();}}
export class SurvivorGuideTracker{
 progress:GuideProgress;
 private run='';private origin={x:0,y:0};private gold=0;private exp=0;private level=1;private previous='';private sawMoveInput=false;
 constructor(private storage?:Pick<Storage,'getItem'|'setItem'>){this.progress=readGuide(storage);}
 private save(){try{this.storage?.setItem(GUIDE_KEY,JSON.stringify(this.progress));}catch{/* The guide stays dismissible without browser storage. */}}
 reset(){this.progress=empty();this.run='';this.save();}
 skip(){this.progress={move:true,pickup:true,choice:true};this.save();}
 observe(g:Game){
  if(!g.survivorMode||g.mode!=='normal'||g.phase==='lobby')return;
  if(this.run!==g.runId){this.run=g.runId;this.origin={x:g.player.x,y:g.player.y};this.gold=g.totalGold;this.exp=g.exp;this.level=g.level;this.previous=g.phase;this.sawMoveInput=false;}
  const before=JSON.stringify(this.progress);
  if(Math.hypot(g.input.x,g.input.y)>.1||Math.hypot(g.touchInput.x,g.touchInput.y)>.1)this.sawMoveInput=true;
  if(this.sawMoveInput&&Math.hypot(g.player.x-this.origin.x,g.player.y-this.origin.y)>=24)this.progress.move=true;
  if(g.totalGold>this.gold||g.exp>this.exp||g.level>this.level)this.progress.pickup=true;
  if(this.previous==='upgrade'&&g.phase==='battle')this.progress.choice=true;
  this.previous=g.phase;
  if(JSON.stringify(this.progress)!==before)this.save();
 }
 step(phase:string){if(phase==='upgrade'&&!this.progress.choice)return 'choice';if(phase==='battle'){if(!this.progress.move)return 'move';if(!this.progress.pickup)return 'pickup';}return null;}
}
export const survivorGuide=new SurvivorGuideTracker(typeof localStorage==='undefined'?undefined:localStorage);
