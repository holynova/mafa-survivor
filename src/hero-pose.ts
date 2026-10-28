import type {Game} from "./game";

/** One presentation boundary for the original body, weapon and shadow layers. */
export function heroPose(g:Game,renderSeconds:number,deathSeconds=0) {
  const preview=g.mode==="test" && g.test.pose!=="live";
  const defeated=g.phase==="dead",dead=defeated && g.player.hp<=0;
  const hitStart=g.player.hitUntil-.45;
  const hurt=!defeated && g.clock>=hitStart && g.clock<hitStart+.18;
  return {
    motion:preview ? g.test.pose : dead ? "death" : defeated ? "idle" : hurt ? "hurt" :
      g.clock<g.player.attackUntil ? "attack" : g.player.moving ? "walk" :
      g.clock<g.player.castUntil ? "cast" : "idle",
    dir:preview ? g.test.direction : !defeated && !hurt && g.clock<g.player.attackUntil ? g.player.attackDir : g.player.dir,
    time:preview ? renderSeconds : dead ? Math.max(0,deathSeconds) : hurt ? g.clock-hitStart : g.clock,
  };
}
