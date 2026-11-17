import {assetUrl} from './release';
import type {MapId} from './content';
export const MUSIC_TRACKS={mine:'00020004_BD041.mp3',valley:'00020007_BD60.mp3',desert:'00010006_B300.mp3',woma:'00020003_BD02.mp3',redmoon:'00020009_BD99.mp3',field:'00010001_B000.mp3',cave:'00020008_BD70.mp3',temple:'00020006_BD50.mp3'} as const;
export type MusicTrack=keyof typeof MUSIC_TRACKS;
/** Category reuse, not a claim that each map used this exact track in 1.76. */
export const CHAPTER_MUSIC:Record<MapId,MusicTrack>={biche:'field',bairimen:'field',mengzhong:'desert',mine:'mine',centipede:'valley',stone:'cave',shimu:'cave',woma:'woma',zuma:'temple',redmoon:'redmoon'};
/** Final encounters rearrange original map music, with each chapter changing track. */
export function encounterMusic(map: MapId, finalEncounter: boolean): MusicTrack {
 const chapter = CHAPTER_MUSIC[map];
 if (!finalEncounter) return chapter;
 return chapter === 'redmoon' ? 'temple' : 'redmoon';
}
type Deck={track:MusicTrack;media:HTMLAudioElement;source:MediaElementAudioSourceNode;gain:GainNode;timer?:ReturnType<typeof setTimeout>};
/** Stream long music through Web Audio. At most two decks exist during a crossfade. */
export class OriginalMusic {
 private current?:Deck;
 private outgoing?:Deck;
 private desired='';
 private playAttempt=0;
 error='';
 constructor(private context:AudioContext,private output:GainNode,private createMedia=()=>new Audio()){}
 get status(){return {track:this.current?.track??null,playing:!!this.current&&!this.current.media.paused,decks:Number(!!this.current)+Number(!!this.outgoing),error:this.error};}
 private ramp(deck:Deck,value:number,seconds=.6){
  const gain=deck.gain.gain,now=this.context.currentTime;
  // Hold current interpolated value before reversing a fade.
  gain.cancelAndHoldAtTime(now);gain.linearRampToValueAtTime(value,now+seconds);
 }
 private dispose(deck?:Deck){if(!deck)return;clearTimeout(deck.timer);deck.media.pause();deck.media.removeAttribute('src');deck.media.load();deck.source.disconnect();deck.gain.disconnect();}
 sync(track:MusicTrack|null,active:boolean,boss:boolean){
  const desired=`${track}:${active}:${boss}`;
  if(this.desired===desired)return;
  this.desired=desired;
  const attempt=++this.playAttempt;
  if(!track){this.error='';this.dispose(this.current);this.dispose(this.outgoing);this.current=this.outgoing=undefined;return;}
  if(this.current?.track!==track){
   this.error='';
   this.dispose(this.outgoing);this.outgoing=this.current;
   if(this.outgoing){const old=this.outgoing;clearTimeout(old.timer);this.ramp(old,0);old.timer=setTimeout(()=>{this.dispose(old);if(this.outgoing===old)this.outgoing=undefined;},650);}
   const media=this.createMedia();media.preload='none';media.loop=true;media.src=assetUrl('music/'+MUSIC_TRACKS[track]);
   const source=this.context.createMediaElementSource(media),gain=this.context.createGain();gain.gain.value=0;source.connect(gain);gain.connect(this.output);
   this.current={track,media,source,gain};
  }
  const deck=this.current;clearTimeout(deck.timer);
  if(active){
   this.ramp(deck,boss?.65:1);
   void deck.media.play().then(()=>{if(this.current===deck&&this.playAttempt===attempt)this.error='';}).catch(()=>{if(this.current===deck&&this.playAttempt===attempt)this.error='音乐未播放，请在声音设置中重试';});
  }else{
   this.ramp(deck,0,.25);deck.timer=setTimeout(()=>deck.media.pause(),300);
  }
 }
 suspend(){this.playAttempt++;this.desired='';if(this.current){clearTimeout(this.current.timer);this.current.media.pause();this.current.gain.gain.cancelScheduledValues(this.context.currentTime);this.current.gain.gain.value=0;}this.dispose(this.outgoing);this.outgoing=undefined;}
 retry(){this.desired='';}
 stop(){this.sync(null,false,false);}
}
