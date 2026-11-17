import {connectAudioOutput} from './audio-output';
import {OriginalMusic,encounterMusic} from "./music";
import type {MapId} from "./content";
import { assetUrl, isGraybox } from "./release";
import {MONSTER_SOUND_EVENTS,monsterSoundEvent,monsterSoundKey,type MonsterSoundEvent} from "./monster-audio";
type AudioManifest = {
  mapping: Record<string, string>;
  files: Record<string, unknown>;
};
export class OriginalSounds {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private combatGain:GainNode|null=null;
  private musicGain:GainNode|null=null;
  private music:OriginalMusic|null=null;
  musicVolume=.45;
  combatVolume=1;
  private buffers = new Map<string, AudioBuffer>();
  private baseFiles=new Set<string>();
  private chapterFiles=new Set<string>();
  private activeFiles=new Map<string,number>();
  private evictedBuffers=0;
  private chapterRequest=0;
  private manifest: AudioManifest | null = null;
  private loading: Promise<void> | null = null;
  private voices = 0;
  private monsterSources=new Map<AudioBufferSourceNode,MonsterSoundEvent>();
  private monsterGains=new Map<MonsterSoundEvent,GainNode>();
  private requests=new Map<string,Promise<void>>();
  private queued=new Set<string>();
  private feedback:AudioBufferSourceNode|null=null;
  private encounter:AudioBufferSourceNode|null=null;
  playedByKey:Record<string,number>={};
  muted = false;
  monsters:Record<MonsterSoundEvent,boolean>={attack:true,hurt:true,death:true};
  volume = 0.35;
  played = 0;
  error = "";
  private last = new Map<string, number>();
  constructor(private readonly cacheBudgetBytes=16*1024*1024){
    if(typeof window==="undefined")return;
    try {
      const saved=JSON.parse(window.localStorage?.getItem("mafa-sound-settings-v1")??"null");
      for(const key of ["volume","musicVolume","combatVolume"] as const)if(typeof saved?.[key]==="number"&&Number.isFinite(saved[key]))this[key]=Math.max(0,Math.min(1,saved[key]));
      if(typeof saved?.muted==="boolean")this.muted=saved.muted;
      for(const event of MONSTER_SOUND_EVENTS)if(typeof saved?.monsters?.[event]==="boolean")this.monsters[event]=saved.monsters[event];
    }catch{/* A storage restriction never prevents playing. */}
  }
  get cacheMetrics(){
    const decodedBytes=[...this.buffers.values()].reduce((sum,b)=>sum+(b.length||0)*(b.numberOfChannels||0)*4,0);
    return {buffers:this.buffers.size,decodedBytes,budgetBytes:this.cacheBudgetBytes,overBudgetBytes:Math.max(0,decodedBytes-this.cacheBudgetBytes),evicted:this.evictedBuffers};
  }
  private trimCache(protectedFile?:string){
    let bytes=this.cacheMetrics.decodedBytes;
    // LRU within each tier; old chapters go first. Playing sources and player
    // feedback remain resident even if their protected working set exceeds budget.
    const candidates=[...this.buffers.keys()].sort((a,b)=>Number(this.chapterFiles.has(a))-Number(this.chapterFiles.has(b)));
    for(const file of candidates){
      if(bytes<=this.cacheBudgetBytes)break;
      if(file===protectedFile||this.baseFiles.has(file)||this.activeFiles.has(file))continue;
      const b=this.buffers.get(file)!;
      bytes-=(b.length||0)*(b.numberOfChannels||0)*4;
      this.buffers.delete(file);this.evictedBuffers++;
    }
  }
  private persist(){
    if(typeof window==="undefined")return;
    try{window.localStorage?.setItem("mafa-sound-settings-v1",JSON.stringify({muted:this.muted,monsters:this.monsters,volume:this.volume,musicVolume:this.musicVolume,combatVolume:this.combatVolume}));}catch{/* Session controls still work. */}
  }
  get status() {
    if (isGraybox) return "灰盒版不包含原版音效";
    return (
      this.error ||
      (this.context?.state === "running"
        ? "原版音效已解锁"
        : "等待点击解锁音效")
    );
  }
  async unlock() {
    if (isGraybox) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.muted ? 0 : this.volume;
        connectAudioOutput(this.context,this.gain);
        this.combatGain=this.context.createGain();this.combatGain.gain.value=this.combatVolume;this.combatGain.connect(this.gain);
        this.musicGain=this.context.createGain();this.musicGain.gain.value=this.musicVolume;this.musicGain.connect(this.gain);
        if(typeof this.context.createMediaElementSource==="function")this.music=new OriginalMusic(this.context,this.musicGain);
        for(const event of MONSTER_SOUND_EVENTS){const gain=this.context.createGain();gain.gain.value=this.monsters[event] ? .65 : 0;gain.connect(this.combatGain);this.monsterGains.set(event,gain);}
      }
      this.music?.retry();
      const resumed=this.context.resume();
      this.loading ??= this.load();
      await Promise.all([resumed,this.loading]);
    } catch {
      this.error = "音效加载失败，请刷新重试";
    }
  }
  private async load() {
    const r = await fetch(assetUrl("audio/manifest.json"));
    if (!r.ok) throw new Error("audio manifest");
    this.manifest = await r.json();
    this.baseFiles=new Set(Object.entries(this.manifest!.mapping).filter(([key])=>!monsterSoundEvent(key)).map(([,file])=>file));
    // Keep the existing player/spell sounds ready. Monster voices are loaded
    // by chapter, rather than delaying startup on the complete 13MB library.
    await Promise.all(
      [...this.baseFiles].map(file=>this.loadBuffer(file)),
    );
  }
  private async loadBuffer(file:string){
    const cached=this.buffers.get(file);
    if(cached){this.buffers.delete(file);this.buffers.set(file,cached);return;}
    let request=this.requests.get(file);
    if(!request){request=(async()=>{const r=await fetch(assetUrl("audio/"+file));if(!r.ok)throw new Error(file);this.buffers.set(file,await this.context!.decodeAudioData(await r.arrayBuffer()));})();this.requests.set(file,request);}
    try{await request;this.trimCache(file);}finally{this.requests.delete(file);}
  }
  async preloadMonsters(kinds:readonly string[]){
    if(!this.context)return;
    const generation=++this.chapterRequest;
    try{
      await this.loading;
      const files=[...new Set(kinds.flatMap(kind=>MONSTER_SOUND_EVENTS.filter(event=>this.monsters[event]).map(event=>this.manifest?.mapping[monsterSoundKey(kind,event)]).filter((file):file is string=>!!file)))];
      if(generation!==this.chapterRequest)return;
      this.chapterFiles=new Set(files);
      // Bound chapter requests; repeated calls share the same decode promise.
      for(let i=0;i<files.length&&generation===this.chapterRequest;i+=6)await Promise.all(files.slice(i,i+6).map(file=>this.loadBuffer(file)));
      this.trimCache();
    }catch{this.error="部分怪物音效未加载，重新开关声音可重试";}
  }
  get musicStatus(){return this.music?.status??{track:null,playing:false,decks:0,error:""};}
  suspendMusic(){this.music?.suspend();}
  syncMusic(map:MapId,phase:string,boss:boolean,enabled:boolean,finalEncounter=false){
    this.music?.sync(enabled&&phase!=="lobby"&&phase!=="dead"&&phase!=="won" ? encounterMusic(map,finalEncounter) : null,phase==="battle"&&!this.muted&&this.volume>0&&this.musicVolume>0,boss);
  }
  setVolume(channel:"master"|"music"|"combat",value:number){
    if(!Number.isFinite(value))return;value=Math.max(0,Math.min(1,value));
    if(channel==="master"){this.volume=value;if(this.gain)this.gain.gain.value=this.muted?0:value;}
    if(channel==="music"){this.musicVolume=value;if(this.musicGain)this.musicGain.gain.value=value;}
    if(channel==="combat"){this.combatVolume=value;if(this.combatGain)this.combatGain.gain.value=value;}
    this.persist();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.gain) this.gain.gain.value = value ? 0 : this.volume;
    this.persist();
  }
  setMonsterEnabled(event:MonsterSoundEvent,value:boolean){
    this.monsters[event]=value;
    const gain=this.monsterGains.get(event);if(gain)gain.gain.value=value ? .65 : 0;
    if(!value)for(const [source,kind] of this.monsterSources)if(kind===event)source.stop();
    this.persist();
  }
  play(key: string) {
    const alert=key.startsWith("encounter:");
    const resourceKey=alert ? key.replace(/^encounter:/,"monster:") : key;
    const monster=monsterSoundEvent(resourceKey);
    const critical=key==="hurt" || key==="death";
    if (
      !this.context ||
      this.context.state !== "running" ||
      this.muted ||
      monster && !this.monsters[monster] ||
      (!critical && !monster && this.voices-this.monsterSources.size >= 8)
    )
      return;
    const file = this.manifest?.mapping[resourceKey],
      buffer = file ? this.buffers.get(file) : undefined;
    if (!buffer) {
      if(monster && file && !this.queued.has(key)){
        this.queued.add(key);const requestedAt=this.context.currentTime;
        void this.loadBuffer(file).then(()=>{this.queued.delete(key);if(this.context && this.context.currentTime-requestedAt<=1)this.play(key);}).catch(()=>{this.queued.delete(key);this.error="部分怪物音效未加载，重新开关声音可重试";});
      }
      return;
    }
    const now = this.context.currentTime;
    if (now - (this.last.get(key) ?? -10) < (key==="coin" ? .16 : monster==="attack" ? .28 : monster ? .16 : .09)) return;
    if(monster && !alert && this.monsterSources.size-Number(!!this.encounter)>=3){
      const replace=monster==="death" ? [...this.monsterSources].find(([source,event])=>source!==this.encounter&&event!=="death")?.[0] : undefined;
      if(!replace)return;
      replace.stop();
    }
    this.last.set(key, now);
    if(critical)this.feedback?.stop();
    if(alert)this.encounter?.stop();
    const source = this.context.createBufferSource();
    this.buffers.delete(file!);this.buffers.set(file!,buffer);
    this.activeFiles.set(file!,(this.activeFiles.get(file!)??0)+1);
    source.buffer = buffer;
    source.connect(monster ? this.monsterGains.get(monster)! : this.combatGain!);
    if(monster)this.monsterSources.set(source,monster);
    this.voices++;
    this.played++;
    this.playedByKey[key]=(this.playedByKey[key]??0)+1;
    if(critical)this.feedback=source;
    if(alert)this.encounter=source;
    source.onended = () => {
      this.voices--;
      this.monsterSources.delete(source);
      if(this.feedback===source)this.feedback=null;
      if(this.encounter===source)this.encounter=null;
      source.disconnect();
      const count=(this.activeFiles.get(file!)??1)-1;
      if(count)this.activeFiles.set(file!,count);else this.activeFiles.delete(file!);
      source.buffer=null;
      this.trimCache();
    };
    source.start();
  }
}
export const sounds = new OriginalSounds();

if(typeof document!=="undefined"){document.addEventListener("visibilitychange",()=>{if(document.hidden)sounds.suspendMusic();});window.addEventListener("pagehide",()=>sounds.suspendMusic());}
