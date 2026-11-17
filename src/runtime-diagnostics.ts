/** Bounded rolling browser timings, not an FPS or physical-memory guarantee. */
export class RuntimeDiagnostics {
 private frames:number[]=[];
 private cursor=0;
 private active=false;
 private lastTimestamp:number|null=null;
 timestamp(now:number,battle:boolean){const previous=this.lastTimestamp;this.lastTimestamp=now;if(previous!==null)this.frame(now-previous,battle);else this.active=battle;}
 totalFrames=0;
 longTasks={supported:false,count:0,totalMS:0,maxMS:0};
 webgl={lost:0,restored:0};
 frame(ms:number,battle:boolean){
  const wasActive=this.active;this.active=battle;
  if(!battle||!wasActive||!Number.isFinite(ms)||ms<=0)return;
  this.frames[this.cursor]=ms;this.cursor=(this.cursor+1)%3600;this.totalFrames++;
 }
 snapshot(){
  const values=[...this.frames].sort((a,b)=>a-b),percentile=(p:number)=>values.length?values[Math.max(0,Math.ceil(values.length*p)-1)]:null;
  return {scope:'current browser session; last 3600 raw renderer callback intervals during battle, first frame after pause excluded',samples:values.length,totalFrames:this.totalFrames,p50MS:percentile(.5),p95MS:percentile(.95),p99MS:percentile(.99),maxMS:values.at(-1)??null,longTasks:{...this.longTasks},webgl:{...this.webgl}};
 }
}
export const runtimeDiagnostics=new RuntimeDiagnostics();
export function observeRuntime(canvas:HTMLCanvasElement){
 let observer:PerformanceObserver|undefined;
 if(typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){
  try{observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){runtimeDiagnostics.longTasks.count++;runtimeDiagnostics.longTasks.totalMS+=e.duration;runtimeDiagnostics.longTasks.maxMS=Math.max(runtimeDiagnostics.longTasks.maxMS,e.duration);}});observer.observe({type:'longtask'});runtimeDiagnostics.longTasks.supported=true;}catch{observer?.disconnect();}
 }
 const lost=()=>runtimeDiagnostics.webgl.lost++,restored=()=>runtimeDiagnostics.webgl.restored++;
 canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
 return ()=>{observer?.disconnect();canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);};
}
