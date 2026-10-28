import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
const manifest:{animations:Record<string,string[]>}=JSON.parse(readFileSync("docs/asset-manifest.json","utf8"));
import {effectSprites,poisonTint} from "../src/effect-visual";
import type {Fx} from "../src/game";
const fx=(kind:Fx["kind"],dir=2):Fx=>({id:1,kind,x:500,y:500,radius:240,life:.4,total:.6,dir});
it("resolves actual imported beast fire in all eight directions",()=>{
 for(let dir=0;dir<8;dir++)for(const sprite of effectSprites(fx("beastflame",dir)))
  expect(manifest.animations[sprite.animation]?.length).toBeGreaterThan(0);
});
it("lays hellfire along its actual aim and length instead of showing only a patch behind the caster",()=>{
 const plan=effectSprites(fx("hellfire",2));
 expect(plan.length).toBeGreaterThan(3);expect(Math.max(...plan.map(p=>p.x))).toBeGreaterThan(650);
 expect(plan.every(p=>p.y===500)).toBe(true);
});
it("keeps red and blue-green poison visible through hurt animation and clears it on expiration",()=>{
 const green={until:5,tickAt:2,damage:3},red={until:4,reduction:.2};
 expect(poisonTint({greenPoison:green},1)).toBeTypeOf("number");
 expect(poisonTint({redPoison:red,greenPoison:green},1)).not.toBe(poisonTint({greenPoison:green},1));
 expect(poisonTint({redPoison:red,greenPoison:green},6)).toBeUndefined();
});
