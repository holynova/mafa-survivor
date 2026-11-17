import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {finalBossBearing} from '../src/encounters';
import {setWorldLayouts} from '../src/world';
import bairimen from './fixtures/bairimen-layout.json';
afterEach(()=>setWorldLayouts({}));
function arena(){setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('normal',176,'wizard');const boss=g.spawnEnemy('redMoon');g.survival.finalBossId=boss.id;return {g,boss};}
it.each([[1,0,'东'],[1,1,'东南'],[0,1,'南'],[-1,1,'西南'],[-1,0,'西'],[-1,-1,'西北'],[0,-1,'北'],[1,-1,'东北']] as const)('reports relative bearing %s,%s without changing combat', (x,y,direction)=>{
 const {g,boss}=arena();Object.assign(boss,{x:g.player.x+x*400,y:g.player.y+y*400});
 const before=g.snapshotSurvival()!;expect(finalBossBearing(g,boss)).toMatchObject({direction,status:'远处',blocked:false});
 expect({...g.snapshotSurvival(),savedAt:before.savedAt}).toEqual(before);
});
it('uses current detection range and hides an unobstructed close target, not a distant skill readiness claim',()=>{
 const {g,boss}=arena();Object.assign(boss,{x:g.player.x+81,y:g.player.y});expect(finalBossBearing(g,boss)?.status).toBe('');
 boss.x=g.player.x+80;expect(finalBossBearing(g,boss)).toBeNull();boss.x=g.player.x+g.detectionRange;expect(finalBossBearing(g,boss)?.status).toBe('');boss.x+=1;expect(finalBossBearing(g,boss)?.status).toBe('远处');
});
it('marks the real Bai Ri Men wall as obstructed rather than promising a route',()=>{
 setWorldLayouts({bairimen});const g=new Game();g.survivorMode=true;g.unlockedMaps.add('bairimen');g.start('normal',176,'wizard',false,'bairimen');Object.assign(g.player,{x:174,y:1488});const boss=g.spawnEnemy('redMoon');Object.assign(boss,{x:72,y:1136});g.survival.finalBossId=boss.id;
 expect(finalBossBearing(g,boss)).toMatchObject({direction:'北',status:'视线受阻',blocked:true});
});
it('does not expose cues for previous phase bosses, defeated targets or the legacy mode',()=>{
 const {g,boss}=arena();boss.x=g.player.x+400;g.survival.finalBossId=-1;expect(finalBossBearing(g,boss)).toBeNull();g.survival.finalBossId=boss.id;boss.hp=0;expect(finalBossBearing(g,boss)).toBeNull();boss.hp=boss.maxHp;g.survivorMode=false;expect(finalBossBearing(g,boss)).toBeNull();
});
