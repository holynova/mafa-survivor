import {expect,it} from 'vitest';
import {RuntimeDiagnostics} from '../src/runtime-diagnostics';
it('reports actual rolling quantiles and excludes paused and resume intervals',()=>{
 const r=new RuntimeDiagnostics();r.frame(900,true);for(let i=1;i<=100;i++)r.frame(i,true);
 expect(r.snapshot()).toMatchObject({samples:100,p50MS:50,p95MS:95,p99MS:99,maxMS:100});
 r.frame(5000,false);r.frame(900,true);r.frame(NaN,true);expect(r.snapshot().samples).toBe(100);
 for(let i=0;i<3600;i++)r.frame(10,true);expect(r.snapshot()).toMatchObject({samples:3600,p99MS:10,maxMS:10,totalFrames:3700});
});
