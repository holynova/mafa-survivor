import {afterEach,expect,it,vi} from "vitest";
import {OriginalSounds} from "../src/sound";
afterEach(()=>vi.unstubAllGlobals());
it("keeps injury/death audible under spell voice saturation and respects mute",async()=>{
 const nodes:{started:boolean;stopped:boolean;onended:(()=>void)|null}[]=[];
 let context:FakeContext;
 class FakeContext {
  state="running";currentTime=1;destination={};
  constructor(){context=this;}
  async resume(){}
  createGain(){return {gain:{value:1},connect(){}};}
  async decodeAudioData(){return {};}
  createBufferSource(){const n={started:false,stopped:false,onended:null as (()=>void)|null,buffer:{},connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};nodes.push(n);return n;}
 }
 vi.stubGlobal("AudioContext",FakeContext);
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.includes("manifest.json") ? {ok:true,json:async()=>({mapping:{attack:"a.wav",hurt:"h.wav",death:"d.wav"},files:{"a.wav":{},"h.wav":{},"d.wav":{}}})} : {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));
 const sounds=new OriginalSounds();await sounds.unlock();
 for(let i=0;i<8;i++){sounds.play("attack");context!.currentTime+=.1;}
 expect(sounds.playedByKey.attack).toBe(8);sounds.play("hurt");expect(sounds.playedByKey.hurt).toBe(1);
 context!.currentTime+=.2;sounds.play("death");expect(sounds.playedByKey.death).toBe(1);expect(nodes[8].stopped).toBe(true);
 sounds.setMuted(true);context!.currentTime+=1;sounds.play("death");expect(sounds.playedByKey.death).toBe(1);
});
