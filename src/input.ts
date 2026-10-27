const codes: Record<string, string> = {
  w: "KeyW",
  a: "KeyA",
  s: "KeyS",
  d: "KeyD",
  ArrowUp: "ArrowUp",
  ArrowLeft: "ArrowLeft",
  ArrowDown: "ArrowDown",
  ArrowRight: "ArrowRight",
};
export function movement(keys: ReadonlySet<string>) {
  return {
    x:
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")),
    y:
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      Number(keys.has("KeyW") || keys.has("ArrowUp")),
  };
}
export class MovementInput {
  readonly held = new Set<string>();
  lastEvent = "尚未收到方向按键";
  constructor(
    private target: EventTarget,
    private active: () => boolean,
  ) {
    target.addEventListener("keydown", this.down, { capture: true });
    target.addEventListener("keyup", this.up, { capture: true });
  }
  private down = (raw: Event) => {
    const e = raw as KeyboardEvent;
    const code =
      e.code || codes[e.key?.length === 1 ? e.key.toLowerCase() : e.key];
    if (!Object.values(codes).includes(code)) return;
    this.lastEvent = `${e.code || "无 code"} / ${e.key}`;
    const element = e.target as HTMLElement | null;
    if (
      !this.active() ||
      e.metaKey ||
      e.ctrlKey ||
      element?.closest?.("input, textarea, select, [contenteditable=true]")
    )
      return;
    this.held.add(code);
    e.preventDefault();
  };
  private up = (raw: Event) => {
    const e = raw as KeyboardEvent;
    this.held.delete(
      e.code || codes[e.key?.length === 1 ? e.key.toLowerCase() : e.key],
    );
  };
  get axes() {
    return movement(this.held);
  }
  clear() {
    this.held.clear();
  }
  destroy() {
    this.target.removeEventListener("keydown", this.down, { capture: true });
    this.target.removeEventListener("keyup", this.up, { capture: true });
  }
}
export const inputDiagnostics = {
  last: "尚未收到方向按键",
  held: "无",
  x: 0,
  y: 0,
};
