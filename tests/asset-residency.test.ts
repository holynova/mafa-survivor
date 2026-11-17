import {expect,it} from 'vitest';
import {atlasResidency,unusedAtlasPages} from '../src/asset-residency';
const pages=[{key:'core',width:2048,height:1024},{key:'mine',width:2048,height:2048,lazy:true},{key:'forest',width:1024,height:1024,lazy:true},{key:'weapon',width:1024,height:128,lazy:true}];
it('retains shared core and live actor pages while retiring the previous chapter',()=>{
 expect(unusedAtlasPages(pages,new Set(['core','mine','forest','weapon']),new Set(['forest','weapon']))).toEqual(['mine']);
});
it('never requests eviction of absent pages and can reload a retired chapter',()=>{
 expect(unusedAtlasPages(pages,new Set(['core','forest']),new Set(['mine']))).toEqual(['forest']);
 expect(unusedAtlasPages(pages,new Set(['core','mine']),new Set(['mine']))).toEqual([]);
});
it('reports pixel storage separately from compressed bytes or measured memory',()=>{
 expect(atlasResidency(pages,new Set(['core','weapon','unknown']))).toEqual({pages:2,rgbaBytes:2048*1024*4+1024*128*4});
});
