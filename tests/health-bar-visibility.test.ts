import {expect,it} from 'vitest';
import {ordinaryHealthBarIds} from '../src/health-bar-visibility';
const actor=(id:number,x=id*10)=>({id,kind:'orc',elite:false,hp:30,maxHp:100,x,y:100});
it('bounds a 220-enemy crowd in full and reduced display without changing any actor',()=>{
 const enemies=Array.from({length:220},(_,i)=>actor(i+1));const before=JSON.stringify(enemies);
 expect(ordinaryHealthBarIds(enemies,{x:0,y:100},undefined,'full').size).toBe(24);
 expect(ordinaryHealthBarIds(enemies,{x:0,y:100},undefined,'reduced').size).toBe(12);
 expect([...ordinaryHealthBarIds(enemies,{x:0,y:100},undefined,'full')]).toEqual(Array.from({length:24},(_,i)=>i+1));
 expect(JSON.stringify(enemies)).toBe(before);
});
it('does not spend ordinary slots on full health, dead, elite or Boss actors',()=>{
 const special=[{...actor(1),hp:100},{...actor(2),hp:0},{...actor(3),elite:true},{...actor(4),kind:'redMoon'}];
 const normal=Array.from({length:30},(_,i)=>actor(i+10));const ids=ordinaryHealthBarIds([...special,...normal],{x:0,y:100},undefined,'full');
 expect(ids.size).toBe(24);for(const e of special)expect(ids.has(e.id)).toBe(false);
});
it('selects visible bars instead of spending the budget on closer offscreen enemies',()=>{
 const enemies=[...Array.from({length:30},(_,i)=>actor(i+1,i)),actor(100,180)];
 expect([...ordinaryHealthBarIds(enemies,{x:0,y:100},{x:150,y:0,width:200,height:200},'full')]).toEqual([100]);
});
it('keeps existing bars through small rank changes, but yields to a materially nearer threat',()=>{
 const near=Array.from({length:11},(_,i)=>actor(i+1,i));const old=actor(50,100),rival=actor(51,95),previous=new Set([50]);
 expect(ordinaryHealthBarIds([...near,old,rival],{x:0,y:100},undefined,'reduced',previous).has(50)).toBe(true);
 rival.x=50;expect(ordinaryHealthBarIds([...near,old,rival],{x:0,y:100},undefined,'reduced',previous).has(51)).toBe(true);
 old.hp=0;expect(ordinaryHealthBarIds([...near,old,rival],{x:0,y:100},undefined,'reduced',previous).has(50)).toBe(false);
});
