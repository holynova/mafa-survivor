import {expect,it} from "vitest";
import {Game} from "../src/game";
import {testSpellVisual} from "../src/test-mode";
it.each(["hellfire","beast","poison"] as const)("freezes a real %s cast, including its simulation state",sample=>{
  const g=new Game();g.start("test",176);
  expect(testSpellVisual(g,sample)).toBe(true);
  expect(g.phase).toBe("paused");
  if(sample==="poison"){
    expect(g.enemies.some(e=>e.greenPoison)).toBe(true);
    expect(g.enemies.some(e=>e.redPoison)).toBe(true);
  }else expect(g.effects.some(f=>f.kind===(sample==="beast" ? "beastflame" : sample))).toBe(true);
});
it("never resets an ordinary run for visual inspection",()=>{
  const g=new Game();g.start("normal",12);const id=g.runId;
  expect(testSpellVisual(g,"hellfire")).toBe(false);expect(g.runId).toBe(id);
});
