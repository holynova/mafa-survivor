/** Faster repeated attacks, with per-hit output reduced at the same boundary. */
const faster = new Set(["fireball","lightning","firewall","hellfire","bigfireball","explosion","beam","nova","ice",
  "powerstrike","thrust","cleave","firesword","talisman","poison","heal","groupHeal"]);
export const ATTACK_CADENCE = .8;
export const cooldownScale = (skill:string) => faster.has(skill) ? ATTACK_CADENCE : 1;
export function outputScale(skill:string) {
  if(skill==="poison")return 1; // Its existing one-second tick cadence is unchanged.
  if(skill==="firewall")return .9; // Faster placement improves uptime, never tick stacking.
  return faster.has(skill) || ["basic","skeleton","beast","charm"].includes(skill) ? ATTACK_CADENCE : 1;
}
