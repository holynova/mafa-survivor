// Evaluate in the development page. Frozen, deterministic scene for renderer-only comparisons.
(() => {
 const g=window.__MAFA__;
 if(!g)throw new Error('Development game handle required');
 g.survivorMode=true;g.start('test',176,'wizard');
 Object.assign(g.test,{pose:'idle',spawning:false,autowalk:false,god:true});
 for(let i=0;i<220;i++){
  const e=g.spawnEnemy('orc');Object.assign(e,{x:100+(i%22)*92,y:100+Math.floor(i/22)*130,hp:40,maxHp:60,speed:0});
 }
 for(let i=0;i<1000;i++)g.drops.push({id:g.nextEntityId(),x:70+(i%40)*52,y:70+Math.floor(i/40)*55,exp:6,gold:3,born:0,...(i%10===0?{heal:20}:{})});
 return {enemies:g.enemies.length,drops:g.drops.length};
})();
