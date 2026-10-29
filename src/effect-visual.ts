import type {Enemy,Fx} from "./game";
export type EffectSprite = {animation:string;x:number;y:number;time:number;depth:number;frameRate?:number;scale?:number;rotation?:number};
export function effectSprites(f:Fx):EffectSprite[]{
 if(f.kind==="hellfire") {
  const angle=f.aimAngle??((f.dir??4)-2)*Math.PI/4,age=f.total-f.life;
  // Fixed ground-fire patches retain their original pixels; the cast direction
  // determines their world placement, rather than rotating the source texture.
  const spread=Math.max(0,((f.width??52)-52)/2),rows=spread>0 ? [-spread,0,spread] : [0];
  return rows.flatMap(offset=>Array.from({length:Math.max(1,Math.ceil(f.radius/48))},(_,index)=>{
   const distance=Math.min(f.radius,32+index*48),x=f.x+Math.cos(angle)*distance-Math.sin(angle)*offset,y=f.y+Math.sin(angle)*distance+Math.cos(angle)*offset;
   return {animation:"hellfire",x,y,time:age,depth:y+.2,frameRate:30};
  }));
 }
 if(f.kind==="beastflame") {
  const offset=Math.PI/5*((f.spread??1)-1),angle=((f.dir??4)-2)*Math.PI/4;
  return (offset>0 ? [-offset,0,offset] : [0]).map(rotation=>({animation:`beastflame/${f.dir??4}`,x:f.x,y:f.y,time:f.total-f.life,depth:2100,scale:f.radius/140,rotation:rotation+(f.aimAngle??angle)-angle}));
 }
 if(f.kind==="beam") {
  const angle=f.aimAngle??((f.dir??4)-2)*Math.PI/4,spread=Math.max(0,((f.width??36)-36)/2);
  return (spread>0 ? [-spread,0,spread] : [0]).map(offset=>({animation:`beam/${f.dir??4}`,x:f.x-Math.sin(angle)*offset,y:f.y+Math.cos(angle)*offset,time:f.total-f.life,depth:2100,scale:f.radius/520,rotation:angle-((f.dir??4)-2)*Math.PI/4}));
 }
 const directional=["beam","powerstrike","thrust","cleave","firesword","womaShock","beastflame","overlordBlade"];
 return [{animation:directional.includes(f.kind)?`${f.kind}/${f.dir??4}`:f.kind,x:f.x,y:f.y,time:f.total-f.life,depth:2100}];
}
export function poisonTint(enemy:Pick<Enemy,"redPoison"|"greenPoison"> & {hp?:number},clock:number):number|undefined{
 if(enemy.hp!==undefined && enemy.hp<=0)return undefined;
 if((enemy.redPoison?.until??0)>clock)return 0xff7070;
 if((enemy.greenPoison?.until??0)>clock)return 0x66c5d8;
 return undefined;
}
