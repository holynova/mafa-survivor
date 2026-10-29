import "fake-indexeddb/auto";
import {beforeEach,expect,it} from "vitest";
import {deleteDB,openDB} from "idb";
import {Game} from "../src/game";
import {bookPrice,canonicalBonuses} from "../src/skill-growth";
import type {SkillId} from "../src/spells";
import {readCheckpoint,writeCheckpoint} from "../src/save";
import {sanitizeCheckpoint} from "../src/checkpoint";
beforeEach(async()=>{await deleteDB("mafa-survivor");});
function shop(wave=3,wish:SkillId="firewall") {
 const g=new Game();g.start("normal");g.wave=wave;g.setBookWish(wish);g.endWave();g.gold=1000;return g;
}
it("quotes a desired legal book at the milestone without consuming an ordinary stock slot",()=>{
 const g=shop();expect(g.bookOffer?.skill).toBe("firewall");expect(g.bookOffer?.price).toBe(153);expect(g.offers).toHaveLength(4);
 const quote={...g.bookOffer};g.reroll();expect(g.bookOffer).toEqual(quote);
 g.setBookWish("ice");expect(g.bookOffer).toEqual(quote);expect(g.bookWish).toBe("ice");
});
it("charges once, learns only rank one, preserves ordinary offers and enforces two per run",()=>{
 const g=shop(),id=g.bookOffer!.id,ordinary=JSON.stringify(g.offers),before=g.gold;
 expect(g.buyBook(id)).toBe(true);expect(g.gold).toBe(before-153);expect(g.skills.find(s=>s.id==="firewall")?.rank).toBe(1);
 expect(g.buyBook(id)).toBe(false);expect(g.booksBought).toEqual(["firewall"]);expect(JSON.stringify(g.offers)).toBe(ordinary);
 g.nextWave();g.wave=6;g.setBookWish("ice");g.endWave();expect(g.buyBook(g.bookOffer!.id)).toBe(true);
 g.nextWave();g.endWave();expect(g.bookOffer).toBeNull();expect(g.booksBought).toHaveLength(2);
});
it("does not spend on insufficient funds, stale quote, wrong phase, or a book learned by other means",()=>{
 const g=shop(),id=g.bookOffer!.id;g.gold=1;expect(g.buyBook(id)).toBe(false);g.gold=1000;
 g.phase="battle";expect(g.buyBook(id)).toBe(false);g.phase="shop";g.wave=4;expect(g.buyBook(id)).toBe(false);g.wave=3;
 g.skills.push(g.newSkill("firewall"));expect(g.buyBook(id)).toBe(false);expect(g.gold).toBe(1000);
});
it("checks advanced availability and class before giving a focus guarantee",()=>{
 const g=shop(1,"ice");expect(g.bookOffer?.skill).not.toBe("ice");expect(g.setBookWish("beast")).toBe(false);
 const a=shop(3,"ice");expect(a.bookOffer?.skill).toBe("ice");expect(a.bookOffer?.price).toBe(240);
});
it("defers payment for full-slot replacement, persists confirmation, and cancels atomically",()=>{
 const g=shop();g.skills=["fireball","lightning","shield","repulse","teleport","explosion"].map(id=>g.newSkill(id as SkillId,3));
 const before=g.gold,old=g.skills.map(s=>({...s}));expect(g.buyBook(g.bookOffer!.id)).toBe(true);expect(g.phase).toBe("replace");expect(g.gold).toBe(before);
 const resumed=new Game();expect(resumed.resumeCheckpoint(g.snapshotCheckpoint())).toBe(true);expect(resumed.pendingBook).toBe(g.pendingBook);
 expect(resumed.replaceSkill(null)).toBe(true);expect(resumed.phase).toBe("shop");expect(resumed.gold).toBe(before);expect(resumed.skills).toEqual(old);
 expect(resumed.buyBook(resumed.bookOffer!.id)).toBe(true);expect(resumed.replaceSkill(100)).toBe(false);expect(resumed.gold).toBe(before);
 expect(resumed.replaceSkill(2)).toBe(true);expect(resumed.phase).toBe("shop");expect(resumed.skills[2].id).toBe("firewall");expect(resumed.skills[2].rank).toBe(1);expect(resumed.gold).toBe(before-153);expect(resumed.booksBought).toEqual(["firewall"]);
});
it("resumes book focus, spent-book ledger, skill focus and missed-card counter",()=>{
 const g=shop();g.buyBook(g.bookOffer!.id);g.setBookWish("ice");g.setSkillFocus("firewall");g.focusMisses=2;
 const cp=g.snapshotCheckpoint()!,next=new Game();expect(next.resumeCheckpoint(cp)).toBe(true);
 expect(next.booksBought).toEqual(["firewall"]);expect(next.bookWish).toBe("ice");expect(next.skillFocus).toBe("firewall");expect(next.focusMisses).toBe(2);expect(next.bookOffer?.sold).toBe(true);
 const forged=structuredClone(cp);forged.bookOffer!.price=1;expect(sanitizeCheckpoint(forged)!.bookOffer).toBeNull();
});
it("migrates a legacy branch checkpoint once and durably preserves its original effects",async()=>{
 const g=new Game();g.start("normal");const cp=g.snapshotCheckpoint()!;
 cp.version=1;cp.skills[0].rank=3;cp.skills[0].power=44;cp.skills[0].count=0;
 // Simulates the actual old IndexedDB object, before the new reader sanitizes it.
 const db=await openDB("mafa-survivor",2,{upgrade(d){d.createObjectStore("runs",{keyPath:"runId"});d.createObjectStore("meta");}});
 await db.put("meta",cp,"run-checkpoint");db.close();
 const migrated=await readCheckpoint();expect(migrated?.version).toBe(2);expect(migrated?.legacyGrowth?.skills[0].power).toBe(44);
 expect(migrated?.skills[0].count).toBe(1);expect(migrated?.skills[0].power).toBe(12);
 const resumed=new Game();expect(resumed.resumeCheckpoint(migrated)).toBe(true);await writeCheckpoint(resumed.snapshotCheckpoint()!);
 const reread=await readCheckpoint();expect(reread?.skills[0]).toMatchObject(canonicalBonuses("fireball",3));expect(reread?.legacyGrowth?.skills[0].power).toBe(44);
 const saved=await openDB("mafa-survivor",2);expect(await saved.get("meta","run-checkpoint-before-six-levels")).toBeTruthy();saved.close();
});
it("rejects duplicate book ledgers and skill ids instead of granting duplicate growth",()=>{
 const g=shop(),cp=g.snapshotCheckpoint()!;cp.booksBought=["firewall","firewall"];expect(sanitizeCheckpoint(cp)).toBeNull();
 cp.booksBought=[];cp.skills.push({...cp.skills[0]});expect(sanitizeCheckpoint(cp)).toBeNull();
});
it("starts a new ordinary run without test grants or previous book limits",()=>{
 const g=shop();g.buyBook(g.bookOffer!.id);g.setSkillFocus("firewall");g.start("normal");
 expect(g.booksBought).toEqual([]);expect(g.bookWish).toBeNull();expect(g.skillFocus).toBeNull();expect(g.bookOffer).toBeNull();expect(g.skills).toHaveLength(1);expect(g.skills[0].rank).toBe(1);
 expect(bookPrice("firewall",3)).toBe(153);
});
it("converges legacy summon count to the migrated rank instead of retaining an old count branch",()=>{
 const g=new Game();g.start("normal",176,"taoist");const s=g.newSkill("skeleton",4);g.skills=[s];s.cd=0;g.cast(s);s.cd=0;g.cast(s);expect(g.pets).toHaveLength(2);
 const cp=g.snapshotCheckpoint()!;cp.version=1;cp.skills[0].rank=3;cp.skills[0].count=1;
 const migrated=sanitizeCheckpoint(cp)!;expect(migrated.pets).toHaveLength(1);expect(migrated.legacyGrowth?.skills[0].count).toBe(1);
});
it("retains actual summonedSkeleton and beast model ids, HP ratios and caps on refresh",()=>{
 const g=new Game();g.start("normal",176,"taoist");g.skills=[g.newSkill("skeleton",4),g.newSkill("beast",6)];
 for(const s of [g.skills[0],g.skills[0],g.skills[1]]){s.cd=0;g.cast(s);}
 expect(g.pets).toHaveLength(3);g.pets[0].hp*=.5;
 const cp=g.snapshotCheckpoint()!,next=new Game();expect(next.resumeCheckpoint(cp)).toBe(true);expect(next.pets).toHaveLength(3);
 expect(next.pets.map(p=>p.kind)).toEqual(["summonedSkeleton","summonedSkeleton","beast"]);expect(next.pets[0].hp/next.pets[0].maxHp).toBeCloseTo(.5);
});
