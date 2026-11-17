import {afterEach,expect,it,vi} from 'vitest';
import {OriginalMusic,CHAPTER_MUSIC,MUSIC_TRACKS} from '../src/music';
import {MAP_IDS} from '../src/content';
import manifest from '../docs/music-manifest.json';
afterEach(()=>vi.useRealTimers());
function player(){
 vi.useFakeTimers();
 const media:HTMLAudioElement[]=[],gains:GainNode[]=[];
 const context={currentTime:0,createMediaElementSource:()=>({connect:vi.fn(),disconnect:vi.fn()}),createGain:()=>{const g={gain:{value:0,cancelAndHoldAtTime:vi.fn(),cancelScheduledValues:vi.fn(),linearRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};gains.push(g as unknown as GainNode);return g;}} as unknown as AudioContext;
 const create=()=>{const m={paused:true,src:'',preload:'',loop:false,play:vi.fn(function(this:{paused:boolean}){this.paused=false;return Promise.resolve();}),pause:vi.fn(function(this:{paused:boolean}){this.paused=true;}),removeAttribute:vi.fn(),load:vi.fn()} as unknown as HTMLAudioElement;media.push(m);return m;};
 return {p:new OriginalMusic(context,{} as GainNode,create),media,gains};
}
it('uses only source-backed tracks and covers every chapter',()=>{
 expect(MUSIC_TRACKS).toEqual(manifest.mapping);
 expect(Object.keys(CHAPTER_MUSIC).sort()).toEqual([...MAP_IDS].sort());
});
it('streams one track per scene, crossfades with at most two decks and releases old media',()=>{
 const {p,media}=player();p.sync('field',true,false);p.sync('field',true,false);
 expect(media).toHaveLength(1);expect(media[0].play).toHaveBeenCalledTimes(1);expect(media[0].preload).toBe('none');
 p.sync('cave',true,false);expect(p.status.decks).toBe(2);
 p.sync('temple',true,false);expect(p.status.decks).toBe(2);expect(media[0].removeAttribute).toHaveBeenCalledWith('src');
 vi.advanceTimersByTime(650);expect(p.status.decks).toBe(1);expect(media[1].pause).toHaveBeenCalled();
 p.stop();expect(p.status.decks).toBe(0);expect(media[2].removeAttribute).toHaveBeenCalledWith('src');
});
it('fades pause, cancels pending pause on resume and ducks music for boss cues',()=>{
 const {p,media,gains}=player();p.sync('field',true,false);p.sync('field',false,false);
 vi.advanceTimersByTime(100);p.sync('field',true,true);vi.advanceTimersByTime(500);
 expect(media[0].paused).toBe(false);expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.65,.6);
 p.sync('field',false,true);vi.advanceTimersByTime(300);expect(media[0].paused).toBe(true);
 p.sync('field',true,false);expect(media[0].paused).toBe(false);
 p.suspend();expect(media[0].paused).toBe(true);expect(gains[0].gain.value).toBe(0);
 p.sync('field',true,false);expect(media[0].paused).toBe(false);
});
it('does not retry rejected playback every frame, and ignores stale rejection after changing chapter',async()=>{
 const {p,media}=player();p.sync('field',false,false);
 media[0].play=vi.fn().mockRejectedValue(new Error('autoplay'));
 p.sync('field',true,false);await Promise.resolve();await Promise.resolve();expect(p.error).toContain('重试');
 p.sync('field',true,false);expect(media[0].play).toHaveBeenCalledTimes(1);
 p.retry();p.sync('field',true,false);p.sync('cave',true,false);await Promise.resolve();await Promise.resolve();expect(p.error).toBe('');
 p.stop();
});
