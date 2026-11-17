import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {simulationInput} from '../src/simulation';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
function arena(){setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('normal',176,'wizard');g.enemies=[];g.survival.spawnAt=999;g.survival.chests=[{id:1,x:g.player.x+140,y:g.player.y,eligible:true}];return g;}
it('reserves an eligible chest until the build recipe is ready, and leaves the legacy bot unchanged',()=>{const g=arena();expect(simulationInput(g,{x:0,y:0},{seekChests:true})).toEqual({x:0,y:0});g.skills[0].rank=8;g.survival.charms.flame=1;expect(simulationInput(g)).toEqual({x:0,y:0});expect(simulationInput(g,{x:0,y:0},{seekChests:true}).x).toBeGreaterThan(0);});
it('walks to a chest and evolves through the real pickup rule without granting a reward directly',()=>{const g=arena();g.skills[0].rank=8;g.survival.charms.flame=1;const before=g.player.x;for(let i=0;i<90&&g.phase==='battle';i++){g.input=simulationInput(g,g.input,{seekChests:true});g.step(1/60);}expect(g.player.x).toBeGreaterThan(before);expect(g.survival.chests).toHaveLength(0);expect(g.survival.evolved).toContain('fireball');expect(g.phase).toBe('paused');});
it('keeps emergency healing ahead of a ready evolution chest',()=>{const g=arena();g.player.hp=10;g.skills[0].rank=8;g.survival.charms.flame=1;g.drops=[{id:99,x:g.player.x-100,y:g.player.y,born:0,exp:0,gold:0,heal:20}];expect(simulationInput(g,{x:0,y:0},{seekChests:true}).x).toBeLessThan(0);});
