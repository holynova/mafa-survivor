import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {acceptChapterChallenge,challengeAvailable,tickChapterChallenge} from '../src/chapter-challenge';
import {getItem} from '../src/content';
import {parseSurvivalSave} from '../src/survivor-save';
import {collectLoot} from '../src/loot';
import {setWorldLayouts} from '../src/world';
import shimu from './fixtures/shimu-layout.json';
import biche from './fixtures/biche-layout.json';
import bairimen from './fixtures/bairimen-layout.json';
afterEach(()=>setWorldLayouts({}));
function run(){const g=new Game();g.survivorMode=true;g.start('normal',176,'warrior');g.clock=130;g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;return g;}
it('never spawns or consumes RNG for ignored offers, and requires explicit pause acceptance',()=>{const g=run(),before=g.rng.seed;expect(challengeAvailable(g)).toBe(true);expect(acceptChapterChallenge(g)).toBe(false);tickChapterChallenge(g);expect(g.enemies).toHaveLength(0);expect(g.rng.seed).toBe(before);g.clock=240;g.pause();expect(acceptChapterChallenge(g)).toBe(false);});
it('spawns one reachable original elite, persists it, and does not restart the deadline on resume',()=>{setWorldLayouts({shimu});const g=run();g.unlockedMaps.add('shimu');g.start('normal',176,'warrior',false,'shimu');g.clock=130;g.pause();expect(acceptChapterChallenge(g)).toBe(true);const e=g.enemies.find(e=>e.id===g.survival.challenge.enemyId)!;expect(e.kind).toBe('blackBoar');expect(e.elite).toBe(true);expect(g.navigation!.connected(g.player,e)).toBe(true);expect(g.canStand(e.x,e.y)).toBe(true);expect(acceptChapterChallenge(g)).toBe(false);const save=g.snapshotSurvival()!;const other=new Game();expect(other.resumeSurvival(save)).toBe(true);expect(other.survival.challenge).toEqual(g.survival.challenge);expect(other.survival.challenge.endsAt).toBe(190);save.state.survival.challenge.enemyId=save.nextId;expect(parseSurvivalSave(save)).toBeNull();});
it('awards a source-backed tier-two weapon only after the real target kill, then auto-equips through pickup',()=>{const g=run();g.pause();expect(acceptChapterChallenge(g)).toBe(true);g.pause();const e=g.enemies.find(e=>e.id===g.survival.challenge.enemyId)!;const old=g.equipment.weapon!.itemId;g.hit(e,100000,'cleave');expect(g.survival.challenge.status).toBe('won');const d=g.drops.find(d=>d.itemId&&getItem(d.itemId).slot==='weapon'&&getItem(d.itemId).tier===2)!;expect(d).toBeDefined();expect(g.equipment.weapon!.itemId).toBe(old);const count=g.drops.length;g.hit(e,100000,'cleave');expect(g.drops.length).toBe(count);collectLoot(g,d);expect(getItem(g.equipment.weapon!.itemId).tier).toBe(2);});
it('expires without deleting the threat or granting the bonus, and does not count a kill at the deadline',()=>{const g=run();g.pause();acceptChapterChallenge(g);g.pause();const e=g.enemies[0];g.clock=g.survival.challenge.endsAt;tickChapterChallenge(g);expect(g.survival.challenge.status).toBe('expired');expect(e.hp).toBeGreaterThan(0);expect(g.drops).toHaveLength(0);g.hit(e,100000,'cleave');expect(g.telemetry.snapshot(g)!.events.some(e=>e.type==='challenge-complete')).toBe(false);});
it('migrates old saves without adding rewards and leaves legacy and unsupported maps unavailable',()=>{const g=run(),save=g.snapshotSurvival()!;const {challenge,...survival}=save.state.survival;expect(parseSurvivalSave({...save,state:{...save.state,survival}})?.state.survival.challenge.status).toBe('idle');g.survivorMode=false;expect(challengeAvailable(g)).toBe(false);g.survivorMode=true;g.mapId='mine';expect(challengeAvailable(g)).toBe(false);});
it('rejects unavailable ground before allocating an enemy or consuming RNG',()=>{const g=run();g.pause();g.canStand=()=>false;const before=g.rng.seed;expect(acceptChapterChallenge(g)).toBe(false);expect(g.enemies).toHaveLength(0);expect(g.rng.seed).toBe(before);expect(g.survival.challenge.status).toBe('idle');});
it('uses a strict deadline even if the kill happens before the next director tick',()=>{const g=run();g.pause();acceptChapterChallenge(g);g.pause();g.clock=g.survival.challenge.endsAt;g.hit(g.enemies[0],100000,'cleave');expect(g.survival.challenge.status).toBe('expired');expect(g.telemetry.snapshot(g)!.events.some(e=>e.type==='challenge-complete')).toBe(false);});

it('supports each source chapter and class with a legal approach and usable weapon reward',()=>{
 setWorldLayouts({biche,shimu,bairimen});
 for(const map of ['biche','shimu','bairimen'] as const)for(const role of ['warrior','wizard','taoist'] as const){
  const g=new Game();g.survivorMode=true;g.unlockedMaps.add(map);g.start('normal',176,role,false,map);g.clock=130;g.pause();expect(acceptChapterChallenge(g),`${map}/${role}`).toBe(true);
  const e=g.enemies.find(e=>e.id===g.survival.challenge.enemyId)!;expect(g.navigation!.lineClear(g.player,e,12)).toBe(true);g.pause();g.hit(e,1e6,'basic');
  const item=g.drops.filter(d=>d.itemId).map(d=>getItem(d.itemId!)).find(i=>i.slot==='weapon'&&i.tier===2);expect(item).toBeDefined();expect(g.validItem(item!)).toBe(true);
 }
});
