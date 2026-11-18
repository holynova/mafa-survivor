import {expect,it} from 'vitest';
import type Phaser from 'phaser';
import {drawDanger} from '../src/danger-render';

function graphics(){
 const calls:{method:string;args:unknown[]}[]=[];
 const g=new Proxy({}, {get:(_t,key)=> (...args:unknown[])=>{
  calls.push({method:String(key),args});
  return g;
 }}) as Phaser.GameObjects.Graphics;
 return {g,calls};
}

it('uses a fill only and keeps the damage radius with reduced flash',()=>{
 const zone={id:'test',shape:'circle' as const,x:50,y:70,radius:130,progress:.5,until:1};
 for(const reduceFlash of [false,true]){
  const {g,calls}=graphics();
  drawDanger(g,zone,0,reduceFlash);
  expect(calls.map(call=>call.method)).toEqual(['fillStyle','fillCircle']);
  expect(calls[1].args).toEqual([50,70,130]);
 }
});

it('fills the same locked attack lane during the impact without a stroke',()=>{
 const {g,calls}=graphics();
 drawDanger(g,{id:'lane',shape:'lane',x:10,y:20,toX:110,toY:20,width:32,progress:1,until:1},.5);
 expect(calls.map(call=>call.method)).toEqual(['fillStyle','fillPoints']);
 expect(calls[1].args).toEqual([[{x:10,y:36},{x:110,y:36},{x:110,y:4},{x:10,y:4}],true]);
});
