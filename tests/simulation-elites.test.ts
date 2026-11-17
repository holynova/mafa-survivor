import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {simulationInput} from '../src/simulation';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
function arena(){setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('normal',176,'warrior');g.enemies=[];const e=g.spawnEnemy('evilSnake');Object.assign(e,{x:g.player.x+250,y:g.player.y});g.drops=[{id:g.nextEntityId(),x:g.player.x-90,y:g.player.y,born:0,exp:1,gold:4}];return g;}
it('makes an optional elite route instead of changing the default movement or granting rewards',()=>{const g=arena(),before=g.snapshotSurvival()!;expect(simulationInput(g).x).toBeLessThan(0);expect(simulationInput(g,{x:0,y:0},{huntElites:true}).x).toBeGreaterThan(0);expect({...g.snapshotSurvival(),savedAt:before.savedAt}).toEqual(before);});
it('abandons elite hunting when injured and keeps emergency bottles ahead of the challenge',()=>{const g=arena();g.player.hp=g.maxHP*.4;g.drops[0].heal=20;expect(simulationInput(g,{x:0,y:0},{huntElites:true}).x).toBeLessThan(0);});
it('collects actual equipment before pursuing another elite and does not turn the policy on in legacy mode',()=>{const g=arena();g.drops[0].itemId='equip-extra-青铜剑';expect(simulationInput(g,{x:0,y:0},{huntElites:true}).x).toBeLessThan(0);g.drops[0].itemId=undefined;g.survivorMode=false;expect(simulationInput(g,{x:0,y:0},{huntElites:true})).toEqual(simulationInput(g));});
