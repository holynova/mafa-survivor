import {expect,it} from 'vitest';
import {outputCurve,OUTPUT_HEADROOM} from '../src/audio-output';
it('retains silence, sign and low-level detail while bounding extreme additive peaks',()=>{
 const c=outputCurve(),mid=(c.length-1)/2;expect(c[mid]).toBe(0);
 for(let i=0;i<c.length;i++){
  const x=(i/mid-1)*OUTPUT_HEADROOM;
  expect(Math.abs(c[i])).toBeLessThan(.981);
  expect(c[i]).toBeCloseTo(-c[c.length-1-i],6);
  if(Math.abs(x)<=.8)expect(c[i]).toBeCloseTo(x,6);
  if(i)expect(c[i]).toBeGreaterThanOrEqual(c[i-1]);
 }
 expect(c.at(-1)).toBeCloseTo(.98,6);
});
