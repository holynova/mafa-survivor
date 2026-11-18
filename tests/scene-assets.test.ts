import {expect,it} from 'vitest';
import type {Manifest} from '../src/renderer';
import {indexSceneAssets} from '../src/scene-assets';
import type {WorldLayout} from '../src/world';

it('includes only shared pages, the selected chapter and the selected class kit',()=>{
 const frame=(texture:string)=>({texture,dx:0,dy:0,width:1,height:1,originX:0,originY:0});
 const actors=['wolf','scarecrow','cleave','fireball','talisman','talismanHit','beast','beastflame','summonedSkeleton'];
 const frames=Object.fromEntries(actors.map(name=>[name+'/0',frame(name)]));
 frames['map/00000001']=frame('forest');
 frames['map/00000002']=frame('masonry');
 const world=(texture:number):WorldLayout=>({width:16,height:16,cellWidth:16,cellHeight:16,walk:[1],tiles:[{texture,x:0,y:0}],objects:[]});
 const assets:Manifest={rightsStatus:'test',frames,pages:[{key:'core',image:'',data:'',width:1,height:1}],worlds:{biche:world(1),woma:world(2)},
  animations:Object.fromEntries(actors.map(name=>[name,[name+'/0']]))};
 const index=indexSceneAssets(assets);
 expect([...index.selectionPages({classId:'warrior',mapId:'biche'})]).toEqual(expect.arrayContaining(['core','forest','scarecrow','cleave']));
 const tao=index.selectionPages({classId:'taoist',mapId:'woma'});
 expect([...tao]).toEqual(expect.arrayContaining(['core','masonry','talisman','talismanHit','beast','beastflame','summonedSkeleton']));
 for(const excluded of ['forest','scarecrow','cleave','fireball','wolf']) expect(tao.has(excluded)).toBe(false);
 expect(index.selectionPages({classId:'taoist',mapId:'woma'})).toBe(tao);
});
