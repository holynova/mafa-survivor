import { assetUrl, isGraybox } from "./release";
import {MONSTER_SOUND_EVENTS,monsterSoundEvent,monsterSoundKey,type MonsterSoundEvent} from "./monster-audio";
type AudioManifest = {
  mapping: Record<string, string>;
  files: Record<string, unknown>;
};
export class OriginalSounds {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private manifest: AudioManifest | null = null;
  private loading: Promise<void> | null = null;
  private voices = 0;
  private monsterSources=new Map<AudioBufferSourceNode,MonsterSoundEvent>();
  private monsterGains=new Map<MonsterSoundEvent,GainNode>();
  private requests=new Map<string,Promise<void>>();
  private queued=new Set<string>();
  private feedback:AudioBufferSourceNode|null=null;
  playedByKey:Record<string,number>={};
  muted = false;
  monsters:Record<MonsterSoundEvent,boolean>={attack:true,hurt:true,death:true};
  volume = 0.35;
  played = 0;
  error = "";
  private last = new Map<string, number>();
  constructor(){
    if(typeof window==="undefined")return;
    try {
      const saved=JSON.parse(window.localStorage?.getItem("mafa-sound-settings-v1")??"null");
      if(typeof saved?.muted==="boolean")this.muted=saved.muted;
      for(const event of MONSTER_SOUND_EVENTS)if(typeof saved?.monsters?.[event]==="boolean")this.monsters[event]=saved.monsters[event];
    }catch{/* A storage restriction never prevents playing. */}
  }
  private persist(){
    if(typeof window==="undefined")return;
    try{window.localStorage?.setItem("mafa-sound-settings-v1",JSON.stringify({muted:this.muted,monsters:this.monsters}));}catch{/* Session controls still work. */}
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
        this.gain.connect(this.context.destination);
        for(const event of MONSTER_SOUND_EVENTS){const gain=this.context.createGain();gain.gain.value=this.monsters[event] ? .65 : 0;gain.connect(this.gain);this.monsterGains.set(event,gain);}
      }
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
    // Keep the existing player/spell sounds ready. Monster voices are loaded
    // by chapter, rather than delaying startup on the complete 13MB library.
    await Promise.all(
      [...new Set(Object.entries(this.manifest!.mapping).filter(([key])=>!monsterSoundEvent(key)).map(([,file])=>file))].map(file=>this.loadBuffer(file)),
    );
  }
  private async loadBuffer(file:string){
    if(this.buffers.has(file))return;
    let request=this.requests.get(file);
    if(!request){request=(async()=>{const r=await fetch(assetUrl("audio/"+file));if(!r.ok)throw new Error(file);this.buffers.set(file,await this.context!.decodeAudioData(await r.arrayBuffer()));})();this.requests.set(file,request);}
    try{await request;}finally{this.requests.delete(file);}
  }
  async preloadMonsters(kinds:readonly string[]){
    if(!this.context)return;
    try{
      await this.loading;
      const files=[...new Set(kinds.flatMap(kind=>MONSTER_SOUND_EVENTS.filter(event=>this.monsters[event]).map(event=>this.manifest?.mapping[monsterSoundKey(kind,event)]).filter((file):file is string=>!!file)))];
      // Bound chapter requests; repeated calls share the same decode promise.
      for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(file=>this.loadBuffer(file)));
    }catch{this.error="部分怪物音效未加载，重新开关声音可重试";}
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
    const monster=monsterSoundEvent(key);
    const critical=key==="hurt" || key==="death";
    if (
      !this.context ||
      this.context.state !== "running" ||
      this.muted ||
      monster && !this.monsters[monster] ||
      (!critical && !monster && this.voices-this.monsterSources.size >= 8)
    )
      return;
    const file = this.manifest?.mapping[key],
      buffer = file ? this.buffers.get(file) : undefined;
    if (!buffer) {
      if(monster && file && !this.queued.has(key)){
        this.queued.add(key);const requestedAt=this.context.currentTime;
        void this.loadBuffer(file).then(()=>{this.queued.delete(key);if(this.context && this.context.currentTime-requestedAt<=1)this.play(key);}).catch(()=>{this.queued.delete(key);this.error="部分怪物音效未加载，重新开关声音可重试";});
      }
      return;
    }
    const now = this.context.currentTime;
    if (now - (this.last.get(key) ?? -10) < (monster==="attack" ? .28 : monster ? .16 : .09)) return;
    if(monster && this.monsterSources.size>=3){
      const replace=monster==="death" ? [...this.monsterSources].find(([,event])=>event!=="death")?.[0] : undefined;
      if(!replace)return;
      replace.stop();
    }
    this.last.set(key, now);
    if(critical)this.feedback?.stop();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(monster ? this.monsterGains.get(monster)! : this.gain!);
    if(monster)this.monsterSources.set(source,monster);
    this.voices++;
    this.played++;
    this.playedByKey[key]=(this.playedByKey[key]??0)+1;
    if(critical)this.feedback=source;
    source.onended = () => {
      this.voices--;
      this.monsterSources.delete(source);
      if(this.feedback===source)this.feedback=null;
      source.disconnect();
    };
    source.start();
  }
}
export const sounds = new OriginalSounds();
