import {expect,it,vi} from 'vitest';
import {Game} from '../src/game';
import {writeSurvivalCheckpoint} from '../src/survivor-persistence';
import {readSurvivalSave} from '../src/survivor-save';
it('writes a restorable independent checkpoint, including edits while paused',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal',176,'warrior');g.pause();
 let raw='';const store={setItem:(_k:string,v:string)=>{raw=v;},getItem:()=>raw};
 const saved=writeSurvivalCheckpoint(g,store)!;g.skills[0].rank=2;
 expect(saved.state.skills[0].rank).toBe(1);writeSurvivalCheckpoint(g,store);
 const restored=new Game();expect(restored.resumeSurvival(readSurvivalSave(store))).toBe(true);expect(restored.skills[0].rank).toBe(2);
});
it('does not overwrite a normal save from test mode and surfaces storage failures',()=>{
 const g=new Game();g.survivorMode=true;g.start('test',176,'warrior');const setItem=vi.fn();expect(writeSurvivalCheckpoint(g,{setItem})).toBeNull();expect(setItem).not.toHaveBeenCalled();
 g.mode='normal';expect(()=>writeSurvivalCheckpoint(g,{setItem:()=>{throw new Error('quota');}})).toThrow('quota');
});
