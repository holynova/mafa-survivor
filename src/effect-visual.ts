import type {Enemy,Fx} from "./game";
export type EffectSprite = {animation:string;x:number;y:number;time:number;depth:number;frameRate?:number};
export function effectSprites(f:Fx):EffectSprite[]{
 if(f.kind==="hellfire") {
  const angle=((f.dir??4)-2)*Math.PI/4,age=f.total-f.life;
  // Fixed ground-fire patches retain their original pixels; the cast direction
  // determines their world placement, rather than rotating the source texture.
  return Array.from({length:Math.max(1,Math.ceil(f.radius/48))},(_,index)=>{
   const distance=Math.min(f.radius,32+index*48);
   return {animation:"hellfire",x:f.x+Math.cos(angle)*distance,y:f.y+Math.sin(angle)*distance,
    time:age,depth:f.y+Math.sin(angle)*distance+.2,frameRate:30};
  });
 }
 const directional=["beam","powerstrike","thrust","cleave","firesword","womaShock","beastflame"];
 return [{animation:directional.includes(f.kind)?`${f.kind}/${f.dir??4}`:f.kind,x:f.x,y:f.y,time:f.total-f.life,depth:2100}];
}
export function poisonTint(enemy:Pick<Enemy,"redPoison"|"greenPoison"> & {hp?:number},clock:number):number|undefined{
 if(enemy.hp!==undefined && enemy.hp<=0)return undefined;
 if((enemy.redPoison?.until??0)>clock)return 0xff7070;
 if((enemy.greenPoison?.until??0)>clock)return 0x66c5d8;
 return undefined;
}
