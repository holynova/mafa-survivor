import type Phaser from 'phaser';
import type {DangerZone} from './encounters';

/** Paint the damage area with one translucent fill. */
export function drawDanger(g:Phaser.GameObjects.Graphics,z:DangerZone,impact=0,reduceFlash=false){
 const opacity=impact?impact*(reduceFlash?.1:.24):.23+Math.max(0,Math.min(1,z.progress))*.13;
 g.fillStyle(impact?0xff623b:0xdb282b,opacity);
 if(z.shape==='circle'){
  g.fillCircle(z.x,z.y,z.radius);
 }else{
  const dx=z.toX-z.x,dy=z.toY-z.y,len=Math.max(1,Math.hypot(dx,dy));
  const nx=-dy/len*z.width/2,ny=dx/len*z.width/2;
  g.fillPoints([{x:z.x+nx,y:z.y+ny},{x:z.toX+nx,y:z.toY+ny},{x:z.toX-nx,y:z.toY-ny},{x:z.x-nx,y:z.y-ny}],true);
 }
}
