import Phaser from "phaser";
import { SCENERY } from "./content";
import { game, WORLD, type Enemy } from "./game";
export type Manifest = {
  pages: {
    key: string;
    image: string;
    data: string;
    width: number;
    height: number;
  }[];
  animations: Record<string, string[]>;
  frames: Record<
    string,
    {
      dx: number;
      dy: number;
      width: number;
      height: number;
      texture: string;
      originX: number;
      originY: number;
    }
  >;
  rightsStatus: string;
};
export let assets: Manifest;
export function setAssetManifest(manifest: Manifest) {
  assets = manifest;
}
let rendererReady = false;
export const readyListeners = new Set<() => void>();
export const isReady = () => rendererReady;
export let frameMS = 0;
class BattleScene extends Phaser.Scene {
  private bodies = new Map<string, Phaser.GameObjects.Image>();
  private pool: Phaser.GameObjects.Image[] = [];
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private bars!: Phaser.GameObjects.Graphics;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private lastRun = "";
  private seen = new Set<string>();
  private drag: { id: number; x: number; y: number } | null = null;
  private corpses: {
    kind: string;
    dir: number;
    x: number;
    y: number;
    at: number;
  }[] = [];
  private lastEnemies = new Map<number, Enemy>();
  private failed = false;
  constructor() {
    super("battle");
  }
  preload() {
    for (const page of assets.pages)
      this.load.atlas(
        page.key,
        "/assets/mir/" + page.image,
        "/assets/mir/" + page.data,
      );
    this.load.on("loaderror", () => {
      this.failed = true;
      document.dispatchEvent(new CustomEvent("asset-error"));
    });
  }
  create() {
    if (this.failed) return;
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setZoom(this.zoom());
    this.paintGround();
    this.bars = this.add.graphics().setDepth(5000);
    this.keys = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.addCapture([
      "W",
      "A",
      "S",
      "D",
      "UP",
      "DOWN",
      "LEFT",
      "RIGHT",
      "SPACE",
    ]);
    this.input.keyboard!.on("keydown-ESC", () => game.pause());
    this.input.keyboard!.on("keydown-P", () => game.pause());
    this.input.keyboard!.on("keydown-SPACE", () => game.useManualSkill());
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      if (game.phase === "upgrade" && ["1", "2", "3"].includes(e.key)) {
        const c = game.choices[Number(e.key) - 1];
        if (c) game.choose(c.id);
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (game.phase === "battle" && p.downElement?.tagName === "CANVAS")
        this.drag = { id: p.id, x: p.x, y: p.y };
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.drag?.id === p.id) this.drag = null;
    });
    this.input.on("pointerupoutside", () => {
      this.drag = null;
    });
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.clearInput();
      if (game.phase === "battle") game.pause();
    });
    window.addEventListener("blur", () => this.clearInput());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clearInput();
        if (game.phase === "battle") game.pause();
      }
    });
    document.addEventListener("clear-game-input", () => this.clearInput());
    this.scale.on("resize", () => this.cameras.main.setZoom(this.zoom()));
    rendererReady = true;
    for (const f of readyListeners) f();
    game.emit();
  }
  private zoom() {
    return this.scale.width < 700 ? 1.15 : 1.5;
  }
  private clearInput() {
    this.drag = null;
    game.input = { x: 0, y: 0 };
    this.input.keyboard?.resetKeys();
  }
  private paintGround() {
    const grass = ["ground/3"].filter((x) => assets.frames[x]);
    const fallback = "ground/3";
    // Original ground blocks, tiled without repainting their pixels.
    const tile = assets.frames[grass[0] ?? fallback];
    const w = tile.width,
      h = tile.height;
    for (let y = 0; y < WORLD.h; y += h)
      for (let x = 0; x < WORLD.w; x += w) {
        const key =
          grass[
            (Math.floor(x / w) * 13 + Math.floor(y / h) * 7) % grass.length
          ] ?? fallback;
        this.add
          .image(x, y, assets.frames[key].texture, key)
          .setOrigin(0)
          .setDepth(-100);
      }
    for (const object of SCENERY) {
      const frame = "scenery/" + object.id;
      const f = assets.frames[frame];
      if (f)
        this.add
          .image(object.x, object.y, f.texture, frame)
          .setOrigin(0.5, 1)
          .setDepth(object.y);
    }
    // Boundary is a gameplay overlay; it makes the playable limits explicit.
    this.add
      .graphics()
      .lineStyle(2, 0xd8c894, 0.45)
      .strokeRect(24, 36, WORLD.w - 48, WORLD.h - 60)
      .setDepth(-1);
  }
  private draw(
    key: string,
    frame: string,
    x: number,
    y: number,
    depth: number,
    alpha = 1,
    scale = 1,
    offset = true,
  ) {
    if (!assets.frames[frame]) return;
    this.seen.add(key);
    let image = this.bodies.get(key);
    if (!image) {
      image =
        this.pool.pop() ??
        this.add.image(0, 0, assets.frames[frame].texture, frame);
      this.bodies.set(key, image);
    }
    const f = assets.frames[frame];
    image
      .setTexture(f.texture, frame)
      .setVisible(true)
      .setOrigin(offset ? 0 : 0.5)
      .setPosition(
        offset ? x + -f.originX * scale : x,
        offset ? y + -f.originY * scale : y,
      )
      .setDepth(depth)
      .setAlpha(alpha)
      .setScale(scale)
      .clearTint();
  }
  private actor(
    key: string,
    name: string,
    motion: string,
    dir: number,
    x: number,
    y: number,
    time: number,
    depth: number,
    alpha = 1,
    scale = 1,
  ) {
    const frames =
      assets.animations[`${name}/${motion}/${dir}`] ??
      assets.animations[`${name}/idle/${dir}`];
    if (frames?.length)
      this.draw(
        key,
        frames[Math.floor(time * 9) % frames.length],
        x,
        y,
        depth,
        alpha,
        scale,
      );
  }
  private fx(
    key: string,
    name: string,
    x: number,
    y: number,
    time: number,
    depth: number,
    scale = 1,
  ) {
    const frames = assets.animations[name];
    if (frames?.length)
      this.draw(
        key,
        frames[Math.floor(time * 10) % frames.length],
        x,
        y,
        depth,
        1,
        scale,
      );
  }
  update(_time: number, delta: number) {
    if (!rendererReady) return;
    frameMS = frameMS * 0.95 + delta * 0.05;
    if (this.lastRun !== game.runId) {
      this.lastRun = game.runId;
      this.clearInput();
      this.corpses = [];
      this.lastEnemies.clear();
      this.accumulator = 0;
    }
    if (game.phase === "battle") {
      let x =
          (this.wasd.D.isDown || this.keys.right.isDown ? 1 : 0) -
          (this.wasd.A.isDown || this.keys.left.isDown ? 1 : 0),
        y =
          (this.wasd.S.isDown || this.keys.down.isDown ? 1 : 0) -
          (this.wasd.W.isDown || this.keys.up.isDown ? 1 : 0);
      const p = this.input.activePointer;
      if (this.drag && p.isDown) {
        x = Phaser.Math.Clamp((p.x - this.drag.x) / 45, -1, 1);
        y = Phaser.Math.Clamp((p.y - this.drag.y) / 45, -1, 1);
      }
      game.input = { x, y };
      this.accumulator += Math.min(delta / 1000, 0.1);
      while (this.accumulator >= 1 / 60) {
        game.step(1 / 60);
        this.accumulator -= 1 / 60;
      }
    } else {
      this.accumulator = 0;
      this.drag = null;
    }
    this.seen.clear();
    this.bars.clear();
    const t = game.clock;
    if (game.phase === "lobby") {
      this.cameras.main.centerOn(WORLD.w / 2 + 70, WORLD.h / 2);
      this.actor(
        "hero",
        game.classId,
        "idle",
        5,
        WORLD.w / 2 + 80,
        WORLD.h / 2,
        _time / 1000,
        100,
      );
      [
        ["scarecrow", 230, -150],
        ["cat", 310, 100],
        ["orc", -110, 170],
        ["rakecat", -220, -140],
      ].forEach(([name, x, y], i) =>
        this.actor(
          "lobby-" + i,
          String(name),
          "idle",
          i,
          WORLD.w / 2 + Number(x),
          WORLD.h / 2 + Number(y),
          _time / 1000,
          Number(y) + 100,
        ),
      );
    } else {
      this.cameras.main.centerOn(game.player.x, game.player.y);
      for (const [id, e] of this.lastEnemies)
        if (!game.enemies.some((n) => n.id === id) && e.hp <= 0)
          this.corpses.push({
            kind: e.kind,
            dir: e.dir,
            x: e.x,
            y: e.y,
            at: t,
          });
      this.lastEnemies = new Map(game.enemies.map((e) => [e.id, e]));
      this.corpses = this.corpses.filter((c) => t - c.at < 1);
      this.corpses
        .slice(-40)
        .forEach((c, i) =>
          this.actor(
            "corpse-" + i,
            c.kind,
            "death",
            c.dir,
            c.x,
            c.y,
            Math.min(0.9, t - c.at),
            c.y,
            1 - (t - c.at),
          ),
        );
      for (const e of game.enemies) {
        const motion =
          e.windup > 0 ? "attack" : t - e.hitAt < 0.17 ? "hurt" : "walk";
        const scale = e.elite ? 1.15 : 1;
        this.actor(
          "enemy-" + e.id,
          e.kind,
          motion,
          e.dir,
          e.x,
          e.y,
          t - e.born,
          e.y,
          1,
          scale,
        );
        if (e.elite || e.hp < e.maxHp) {
          const w = e.kind === "boss" ? 64 : 32;
          this.bars
            .fillStyle(0x150c09, 0.85)
            .fillRect(e.x - w / 2, e.y - 58, w, 4);
          this.bars
            .fillStyle(e.elite ? 0xd3af59 : 0x9e503b, 1)
            .fillRect(
              e.x - w / 2,
              e.y - 58,
              w * Math.max(0, e.hp / e.maxHp),
              4,
            );
        }
        if (e.windup > 0) {
          this.bars
            .lineStyle(2, 0xf1b070, 0.6)
            .strokeEllipse(
              e.x,
              e.y + 1,
              e.kind === "boss" ? 145 : 52,
              e.kind === "boss" ? 75 : 25,
            );
        }
      }
      for (const p of game.pets) {
        this.actor(
          "pet-" + p.id,
          p.kind,
          t < p.attackUntil ? "attack" : "walk",
          p.dir,
          p.x,
          p.y,
          t - p.born,
          p.y,
        );
        this.bars
          .lineStyle(1, 0x83c88a, 0.8)
          .strokeEllipse(p.x, p.y + 3, 32, 16);
        this.bars
          .fillStyle(0x19351b, 0.9)
          .fillRect(p.x - 18, p.y - 54, 36, 3)
          .fillStyle(0x8bbd79, 1)
          .fillRect(p.x - 18, p.y - 54, (36 * p.hp) / p.maxHp, 3);
      }
      for (const d of game.drops) {
        if (d.gold > 0)
          this.draw(
            "drop-" + d.id,
            "item/金币（小）",
            d.x,
            d.y,
            10,
            1,
            0.75,
            false,
          );
        else this.bars.fillStyle(0x8bc2c5, 0.9).fillCircle(d.x, d.y, 3);
      }
      for (const p of game.projectiles)
        this.fx(
          "p-" + p.id,
          (p.skill ?? "fireball") + "/" + p.dir,
          p.x,
          p.y,
          t,
          2200,
          0.8,
        );
      for (const f of game.effects) {
        if (f.kind === "firewall") {
          const r = f.radius / 64;
          [
            [0, 0],
            [-30, 0],
            [30, 0],
            [0, -18],
            [0, 18],
          ].forEach(([x, y], i) =>
            this.fx(
              "fx-" + f.id + "-" + i,
              "firewall",
              f.x + x * r,
              f.y + y * r,
              t + i * 0.1,
              40,
              r,
            ),
          );
        } else {
          const animation = [
            "beam",
            "powerstrike",
            "thrust",
            "cleave",
            "firesword",
          ].includes(f.kind)
            ? f.kind + "/" + (f.dir ?? 4)
            : f.kind;
          this.fx(
            "fx-" + f.id,
            animation,
            f.x,
            f.y,
            f.total - f.life,
            2100,
            ["explosion", "ice", "nova", "repulse"].includes(f.kind)
              ? Math.max(0.8, f.radius / 120)
              : 1,
          );
        }
      }
      this.actor(
        "hero",
        game.classId,
        game.phase === "dead"
          ? "death"
          : t < game.player.attackUntil
            ? "attack"
            : game.player.moving
              ? "walk"
              : t < game.player.castUntil
                ? "cast"
                : "idle",
        game.player.dir,
        game.player.x,
        game.player.y,
        t,
        game.player.y + 0.5,
        t < game.player.hitUntil ? 0.65 : 1,
      );
      if (t < game.player.shieldUntil)
        this.fx(
          "shield",
          "shield",
          game.player.x,
          game.player.y,
          t,
          game.player.y + 1,
          1,
        );
      this.bars
        .lineStyle(1, 0xe4cc83, 0.65)
        .strokeEllipse(game.player.x, game.player.y + 3, 30, 15);
      for (const f of game.floating) {
        let label = this.labels.get(f.id);
        if (!label) {
          label = this.add
            .text(0, 0, "", {
              fontFamily: "Georgia, serif",
              fontSize: "15px",
              fontStyle: "bold",
              stroke: "#16130b",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(6000);
          this.labels.set(f.id, label);
        }
        label
          .setPosition(f.x, f.y)
          .setText(f.text)
          .setColor(f.color)
          .setAlpha(Math.min(1, f.life * 2));
      }
    }
    for (const [id, label] of this.labels)
      if (!game.floating.some((f) => f.id === id)) {
        label.destroy();
        this.labels.delete(id);
      }
    for (const [key, image] of this.bodies)
      if (!this.seen.has(key)) {
        image.setVisible(false);
        this.pool.push(image);
        this.bodies.delete(key);
      }
  }
}
let engine: Phaser.Game | null = null;
export function boot() {
  if (engine) return;
  engine = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "world",
    backgroundColor: "#1d271f",
    pixelArt: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [BattleScene],
    audio: { noAudio: true },
    render: { roundPixels: true },
    fps: { target: 60 },
  });
}
