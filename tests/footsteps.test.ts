import {expect,it} from 'vitest';
import {CHAPTER_SURFACES,footstepKey} from '../src/footsteps';
import {MAP_IDS} from '../src/content';
import audio from '../docs/audio-manifest.json';

it('selects verified original left/right steps for every chapter surface family',()=>{
 expect(Object.keys(CHAPTER_SURFACES).sort()).toEqual([...MAP_IDS].sort());
 const mapping=audio.mapping as Record<string,string>;
 const files=audio.files as Record<string,unknown>;
 for(const map of MAP_IDS){
  const left=footstepKey(map,false),right=footstepKey(map,true);
  expect(mapping[left]).not.toBe(mapping[right]);
  expect(files[mapping[left]]).toBeDefined();expect(files[mapping[right]]).toBeDefined();
 }
 expect(mapping[footstepKey('biche',false)]).toBe('01000009.WAV');
 expect(mapping[footstepKey('woma',false)]).toBe('01000005.WAV');
 expect(mapping[footstepKey('mine',false)]).toBe('01000015.WAV');
 expect(mapping.step).toBe('01000001.WAV');
 expect(audio.footstepSoundReference.ref).toBe('bb6a22287abcd9f248d2aba755074c254c68787a');
});
