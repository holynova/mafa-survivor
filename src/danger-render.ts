import type Phaser from 'phaser';
import type {DangerZone} from './encounters';
/** Combat overlays, not replacement spell art. Borders match damage geometry. */
export function drawDanger(g:Phaser.GameObjects.Graphics,z:DangerZone,clock:number,impact=0){
 const p=Math.max(0,Math.min(1,z.progress)),pulse=(Math.sin(clock*9)+1)/2;
 const opacity=impact?impact*.22:.07+p*.12+pulse*.025;
 const color=impact?0xff623b:0xdb282b;
 if(z.shape==='circle'){
  g.lineStyle(10,color,.08).strokeCircle(z.x,z.y,z.radius);
  g.fillStyle(color,opacity).fillCircle(z.x,z.y,z.radius);
  g.lineStyle(2,0xff5149,.8).strokeCircle(z.x,z.y,z.radius);
  g.lineStyle(1,0xffba88,.35).strokeCircle(z.x,z.y,Math.max(1,z.radius-6));
  if(!impact){g.lineStyle(3,0xffc09b,.9).beginPath().arc(z.x,z.y,z.radius,-Math.PI/2,-Math.PI/2+Math.PI*2*p,false).strokePath();}
 }else{
  const dx=z.toX-z.x,dy=z.toY-z.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len*z.width/2,ny=dx/len*z.width/2;
  const points=[{x:z.x+nx,y:z.y+ny},{x:z.toX+nx,y:z.toY+ny},{x:z.toX-nx,y:z.toY-ny},{x:z.x-nx,y:z.y-ny}];
  g.fillStyle(color,opacity).fillPoints(points,true).lineStyle(8,color,.08).strokePoints(points,true).lineStyle(2,0xff5149,.85).strokePoints(points,true);
  if(!impact){const end={x:z.x+dx*p,y:z.y+dy*p};g.lineStyle(2,0xffbf96,.65).lineBetween(end.x+nx,end.y+ny,end.x-nx,end.y-ny);}
 }
}
