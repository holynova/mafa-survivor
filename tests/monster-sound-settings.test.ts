import {afterEach,expect,it,vi} from "vitest";
import {OriginalSounds} from "../src/sound";

afterEach(()=>vi.unstubAllGlobals());
function audio(){
 const stored=new Map<string,string>(),requests:string[]=[],nodes:{stopped:boolean;onended:(()=>void)|null}[]=[];
 const context={state:"running",currentTime:1,destination:{},resume:async()=>{},createGain:()=>({gain:{value:1},connect(){}}),decodeAudioData:async()=>({}),
  createBufferSource:()=>{const n={stopped:false,onended:null as (()=>void)|null,buffer:{},connect(){},disconnect(){},start(){},stop(){this.stopped=true;this.onended?.();}};nodes.push(n);return n;}};
 vi.stubGlobal("window",{localStorage:{getItem:(k:string)=>stored.get(k)??null,setItem:(k:string,v:string)=>stored.set(k,v)}});
 vi.stubGlobal("AudioContext",class {constructor(){return context;}});
 const mapping:Record<string,string>={attack:"player.wav",hurt:"hurt.wav",death:"death.wav"};
 for(const kind of ["orc","zombie","spider"])for(const event of ["attack","hurt","death"])mapping[`monster:${kind}:${event}`]=`${kind}-${event}.wav`;
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{requests.push(url);return url.includes("manifest.json") ? {ok:true,json:async()=>({mapping,files:Object.fromEntries(Object.values(mapping).map(f=>[f,{}]))})} : {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}));
 return {sounds:new OriginalSounds(),context,stored,requests,nodes};
}
it("loads only base sounds at unlock and deduplicates chapter-specific monster audio",async()=>{
 const {sounds,requests}=audio();await sounds.unlock();expect(requests.some(p=>p.includes("orc-"))).toBe(false);
 await sounds.preloadMonsters(["orc"]);expect(requests.filter(p=>p.includes("orc-")).length).toBe(3);expect(requests.some(p=>p.includes("zombie-"))).toBe(false);
 await sounds.preloadMonsters(["orc"]);expect(requests.filter(p=>p.includes("orc-")).length).toBe(3);
});
it("stops a disabled category immediately, keeps other categories audible, and restores saved switches",async()=>{
 const {sounds,nodes,context}=audio();await sounds.unlock();await sounds.preloadMonsters(["orc"]);
 sounds.play("monster:orc:hurt");expect(sounds.playedByKey["monster:orc:hurt"]).toBe(1);
 sounds.setMonsterEnabled("hurt",false);expect(nodes[0].stopped).toBe(true);context.currentTime+=1;
 sounds.play("monster:orc:hurt");expect(sounds.playedByKey["monster:orc:hurt"]).toBe(1);
 sounds.play("monster:orc:death");expect(sounds.playedByKey["monster:orc:death"]).toBe(1);
 const restored=new OriginalSounds();expect(restored.monsters).toEqual({attack:true,hurt:false,death:true});
 sounds.setMuted(true);expect(new OriginalSounds().muted).toBe(true);context.currentTime+=1;sounds.play("monster:orc:death");expect(sounds.playedByKey["monster:orc:death"]).toBe(1);
});
it("reserves a bounded monster mix alongside saturated spells and gives death priority over hurt",async()=>{
 const {sounds,context,nodes}=audio();await sounds.unlock();await sounds.preloadMonsters(["orc","zombie","spider"]);
 for(let i=0;i<8;i++){sounds.play("attack");context.currentTime+=.1;}
 for(const kind of ["orc","zombie","spider"])sounds.play(`monster:${kind}:hurt`);
 expect(sounds.played).toBe(11);sounds.play("monster:orc:death");expect(sounds.playedByKey["monster:orc:death"]).toBe(1);expect(nodes[8].stopped).toBe(true);
 sounds.play("hurt");expect(sounds.playedByKey.hurt).toBe(1);
});
