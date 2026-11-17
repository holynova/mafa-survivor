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

it('assigns source map-family music to Mengzhong, Woma and Redmoon instead of generic categories',()=>{
 expect(CHAPTER_MUSIC.mengzhong).toBe('desert');expect(CHAPTER_MUSIC.woma).toBe('woma');expect(CHAPTER_MUSIC.redmoon).toBe('redmoon');
 expect(manifest.files[MUSIC_TRACKS.desert].sourceMap).toBe('盟重县_74');
 expect(manifest.files[MUSIC_TRACKS.woma].sourceMap).toBe('沃玛神殿_D024');
 expect(manifest.files[MUSIC_TRACKS.redmoon].sourceMap).toBe('赤月恶魔洞穴_D10162');
 const {p,media}=player();for(const track of ['desert','woma','redmoon'] as const){p.sync(track,true,false);vi.advanceTimersByTime(650);expect(p.status).toMatchObject({track,playing:true,decks:1});}
 expect(media.map(m=>m.src)).toEqual(['desert','woma','redmoon'].map(k=>expect.stringContaining(MUSIC_TRACKS[k as keyof typeof MUSIC_TRACKS])));
 p.stop();expect(p.status.decks).toBe(0);
});
it('does not let a stale play rejection overwrite a successful retry on the same track',async()=>{
 const {p,media}=player();p.sync('field',false,false);
 let rejectOld!:(reason:Error)=>void;
 media[0].play=vi.fn().mockImplementationOnce(()=>new Promise<void>((_,reject)=>{rejectOld=reject;})).mockResolvedValue(undefined);
 p.sync('field',true,false);p.retry();p.sync('field',true,false);
 await Promise.resolve();await Promise.resolve();expect(p.error).toBe('');
 rejectOld(new Error('superseded autoplay request'));
 await Promise.resolve();await Promise.resolve();expect(p.error).toBe('');
});
it('ignores an outstanding rejection after suspend and clears errors when leaving music',async()=>{
 const {p,media}=player();p.sync('field',false,false);
 let rejectOld!:(reason:Error)=>void;
 media[0].play=vi.fn(()=>new Promise<void>((_,reject)=>{rejectOld=reject;}));
 p.sync('field',true,false);p.suspend();rejectOld(new Error('aborted'));
 await Promise.resolve();await Promise.resolve();expect(p.error).toBe('');
 media[0].play=vi.fn().mockRejectedValue(new Error('failed'));
 p.sync('field',true,false);await Promise.resolve();await Promise.resolve();expect(p.error).not.toBe('');
 p.stop();expect(p.error).toBe('');expect(p.status.decks).toBe(0);
});
it('does not let a stale success hide the newest failed retry',async()=>{
 const {p,media}=player();p.sync('field',false,false);
 let resolveOld!:()=>void;
 media[0].play=vi.fn().mockImplementationOnce(()=>new Promise<void>(resolve=>{resolveOld=resolve;})).mockRejectedValue(new Error('current failure'));
 p.sync('field',true,false);p.retry();p.sync('field',true,false);
 await Promise.resolve();await Promise.resolve();expect(p.error).toContain('重试');
 resolveOld();await Promise.resolve();await Promise.resolve();expect(p.error).toContain('重试');
});
