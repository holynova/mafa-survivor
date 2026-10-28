import type {Game} from "./game";

/** One presentation boundary for the original body, weapon and shadow layers. */
export function heroPose(g:Game,renderSeconds:number) {
  const preview=g.mode==="test" && g.test.pose!=="live";
  return {
    motion:preview ? g.test.pose : g.phase==="dead" ? "death" :
      g.clock<g.player.attackUntil ? "attack" : g.player.moving ? "walk" :
      g.clock<g.player.castUntil ? "cast" : "idle",
    dir:preview ? g.test.direction : g.phase!=="dead" && g.clock<g.player.attackUntil ? g.player.attackDir : g.player.dir,
    time:preview ? renderSeconds : g.clock,
  };
}
