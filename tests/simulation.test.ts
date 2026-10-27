import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {simulationInput,runSimulation} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import biche from "./fixtures/biche-layout.json";

afterEach(()=>setWorldLayouts({}));
it("moves along a narrow source-grid route instead of stopping before a nearby waypoint",()=>{
  const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 ? 1 : 0);
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:336}}});
  const g=new Game();g.start("trial",176,"wizard",false,"mine");
  g.drops.push({id:100,x:850,y:336,exp:2,gold:4,born:0});
  const input=simulationInput(g);
  expect(input.x).toBeGreaterThan(0);expect(Math.abs(input.y)).toBeLessThan(0.01);
  const before=g.player.x;g.input=input;g.step(1/60);
  expect(g.player.x).toBeGreaterThan(before);expect(g.canStand(g.player.x,g.player.y)).toBe(true);
});
it("replays a real seeded trial with identical actions, economy and combat outcomes",()=>{
  setWorldLayouts({biche});
  const config={seed:176,classId:"wizard" as const,mapId:"biche" as const,mode:"trial" as const};
  const first=runSimulation(config),second=runSimulation(config);
  expect(first).toEqual(second);expect(first.failure).toBeNull();
  expect(first.terminal).toBe(true);expect(first.ticks).toBeGreaterThan(100);
  expect(first.seconds).toBeCloseTo(first.ticks/60,6);
  expect(first.kills).toBeGreaterThan(0);
},20_000);
