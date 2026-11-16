import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {recordSurvival,readSurvivorRecords,SURVIVOR_RECORD_KEY} from '../src/survivor-records';
it('stores only completed survivor runs under a separate key, once',()=>{const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,v:string)=>{values.set(key,v);}};const g=new Game();g.survivorMode=true;g.start('normal');recordSurvival(g,storage);expect(values.size).toBe(0);g.clock=1200;g.finish(true);recordSurvival(g,storage);recordSurvival(g,storage);expect(readSurvivorRecords(storage)).toHaveLength(1);expect([...values.keys()]).toEqual([SURVIVOR_RECORD_KEY]);});
it('rejects broken history rather than crashing the lobby',()=>{expect(readSurvivorRecords({getItem:()=>'{bad'})).toEqual([]);expect(readSurvivorRecords({getItem:()=>JSON.stringify([{won:true}])})).toEqual([]);});
