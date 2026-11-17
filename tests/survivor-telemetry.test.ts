import {expect,it,vi} from 'vitest';
import {Game} from '../src/game';
import {SurvivorTelemetry,TELEMETRY_KEY} from '../src/survivor-telemetry';
import {collectLoot} from '../src/loot';
import {ITEMS} from '../src/content';
const run=(mode:'normal'|'test'='normal')=>{const g=new Game();g.survivorMode=true;g.start(mode,176,'warrior');return g;};
const storage=()=>{const entries=new Map<string,string>();return {getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);}};};
it('records real interval deltas and coverage without inventing intervening minutes',()=>{
 const g=run();g.damageDealt.basic=300;g.damageTaken.physical=30;g.damageTaken.sources['orc:melee']=30;g.player.hp=10;
 g.telemetry.step(g,10);g.telemetry.regeneration(g,4);g.clock=60;g.emit();
 let report=g.telemetry.snapshot(g)!;expect(report.samples).toHaveLength(1);expect(report.samples[0]).toMatchObject({from:0,to:60,elapsed:60,dps:5,delta:{taken:30,observedSeconds:10,lowHpSeconds:10,naturalPlayerHealing:4},damageSources:{'orc:melee':30}});
 g.clock=185;g.damageDealt.basic=425;g.emit();report=g.telemetry.snapshot(g)!;
 expect(report.samples).toHaveLength(2);expect(report.samples[1]).toMatchObject({from:60,to:185,elapsed:125,dps:1,delta:{damage:125,taken:0}});
 g.clock=190;g.emit();expect(g.telemetry.snapshot(g)!.current?.elapsed).toBe(5);
});
it('records choice exposure, choices, build change, real elite death and actual equipment replacement',()=>{
 const g=run();g.beginUpgrade();const offered=g.choices.map(c=>c.id);g.choose(offered[0]);
 const e=g.spawnEnemy('orc');e.elite=true;g.hit(e,10000,'basic');g.hit(e,10000,'basic');
 const item=ITEMS.find(x=>x.kind==='equipment'&&x.slot==='weapon'&&x.tier>1&&g.validItem(x))!;
 collectLoot(g,{id:999,x:g.player.x,y:g.player.y,exp:0,gold:0,born:g.clock,itemId:item.id});
 const events=g.telemetry.snapshot(g)!.events;
 expect(events.find(x=>x.type==='offers')?.details.ids).toBe(offered.join(','));expect(events.find(x=>x.type==='choice')?.details.id).toBe(offered[0]);
 expect(events.filter(x=>x.type==='elite-kill')).toHaveLength(1);expect(events.find(x=>x.type==='equipment')?.details.to).toBe(item.id);
});
it('persists normal journals, restores only matching saves, and labels test runs without overwriting',()=>{
 const store=storage(),g=run();g.clock=70;g.emit();g.telemetry.persist(g,store);const raw=store.getItem(TELEMETRY_KEY);
 const cp=g.snapshotSurvival()!,restored=new Game();expect(restored.resumeSurvival(cp)).toBe(true);expect(restored.telemetry.restore(restored,store)).toBe(true);expect(restored.telemetry.snapshot(restored)!.samples).toHaveLength(1);
 expect(restored.telemetry.snapshot(restored)!.events.some(x=>x.type==='resume')).toBe(true);
 const other=run();expect(other.telemetry.restore(other,store)).toBe(false);
 const test=run('test');test.telemetry.persist(test,store);expect(store.getItem(TELEMETRY_KEY)).toBe(raw);expect(test.telemetry.snapshot(test)!.mode).toBe('test');
});
it('fails safely on malformed journals or storage limits and bounds long test sessions',()=>{
 const g=run();g.telemetry.persist(g,{setItem(){throw new Error('quota');}});expect(g.telemetry.persistenceError).not.toBe('');
 expect(g.telemetry.restore(g,{getItem:()=>'{bad'})).toBe(false);
 for(let i=0;i<1800;i++)g.telemetry.event(g,'test',{i});
 const report=g.telemetry.snapshot(g)!;expect(report.events).toHaveLength(1500);expect(report.omittedEvents).toBeGreaterThan(0);
 report.events.length=0;expect(g.telemetry.snapshot(g)!.events).toHaveLength(1500);
});
it('does not change RNG or combat outcomes and ignores the legacy mode',()=>{
 const a=run(),b=run();for(const method of ['observe','event','step','regeneration'] as const)vi.spyOn(b.telemetry,method).mockImplementation(()=>{});
 for(let i=0;i<300;i++){a.step(1/60);b.step(1/60);}
 expect({rng:a.rng.seed,hp:a.player.hp,kills:a.kills,damage:a.damageDealt,enemies:a.enemies}).toEqual({rng:b.rng.seed,hp:b.player.hp,kills:b.kills,damage:b.damageDealt,enemies:b.enemies});
 const legacy=new Game();legacy.start('normal');expect(new SurvivorTelemetry().snapshot(legacy)).toBeNull();
});
it('records terminal cause once and preserves diagnostics across the resume phase-write race',()=>{
 const g=run(),store=storage();g.clock=30;g.telemetry.persist(g,store);const raw=store.getItem(TELEMETRY_KEY),cp=g.snapshotSurvival()!;
 const r=new Game();r.subscribe(()=>r.telemetry.persist(r,store));r.resumeSurvival(cp);expect(r.telemetry.restore(r,{getItem:()=>raw})).toBe(true);
 expect(r.telemetry.snapshot(r)!.startedAt).toBe(0);
 r.finish(false,'orc:melee');r.emit();expect(r.telemetry.snapshot(r)!.events.filter(x=>x.type==='end')).toHaveLength(1);
});
it('does not log rejected max-rank choices as accepted upgrades',()=>{
 const g=run();g.skills[0].rank=8;g.phase='upgrade';g.choices=[{id:'s:cleave',kind:'skill',skill:g.skills[0].id,name:'满级',description:'',value:0}];g.emit();g.choose('s:cleave');
 expect(g.telemetry.snapshot(g)!.events.filter(e=>e.type==='choice')).toHaveLength(0);
});
it('measures the actual journal write including failed writes, without persisting metrics or changing the journal schema',()=>{
 const g=run(),store=storage();let now=0;const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);
 try{
  const slowStore={setItem(k:string,v:string){now+=7;store.setItem(k,v);}};
  g.telemetry.persist(g,slowStore);
  const raw=store.getItem(TELEMETRY_KEY)!;
  expect(g.telemetry.persistenceSnapshot()).toMatchObject({attempts:1,failures:0,samples:1,p95MS:7,p99MS:7,maxMS:7,last:{success:true,writeMS:7,totalMS:7,bytes:new TextEncoder().encode(raw).byteLength}});
  expect(JSON.parse(raw)).not.toHaveProperty('journalStorage');
  g.telemetry.persist(g,slowStore);expect(g.telemetry.persistenceSnapshot().attempts).toBe(1);
  g.telemetry.event(g,'probe');g.telemetry.persist(g,{setItem(){now+=13;throw new Error('quota');}});
  expect(g.telemetry.persistenceSnapshot()).toMatchObject({attempts:2,failures:1,maxMS:13,last:{success:false,writeMS:13,totalMS:13}});
  expect(store.getItem(TELEMETRY_KEY)).toBe(raw);
  g.telemetry.persist(g,slowStore);expect(g.telemetry.persistenceSnapshot()).toMatchObject({attempts:3,failures:1,last:{success:true}});expect(g.telemetry.persistenceError).toBe('');
 }finally{clock.mockRestore();}
});
it('bounds timing samples and keeps returned metrics detached, excluding test and legacy writes',()=>{
 const g=run(),store=storage();
 for(let i=0;i<125;i++){g.telemetry.event(g,'probe',{i});g.telemetry.persist(g,store);}
 const report=g.telemetry.persistenceSnapshot();expect(report.attempts).toBe(125);expect(report.samples).toBe(120);
 report.last!.bytes=-1;expect(g.telemetry.persistenceSnapshot().last!.bytes).toBeGreaterThan(0);
 const test=run('test');test.telemetry.persist(test,store);expect(test.telemetry.persistenceSnapshot().samples).toBe(0);
 g.survivorMode=false;g.telemetry.persist(g,store);expect(g.telemetry.persistenceSnapshot().attempts).toBe(125);
});
