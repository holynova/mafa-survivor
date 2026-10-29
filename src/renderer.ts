import Phaser from "phaser";
import {alignCameraScroll,battleViewport} from "./camera-grid";
import {heroPose} from "./hero-pose";
import {enemyInsight} from "./enemy-insight";
import {effectSprites,poisonTint} from "./effect-visual";
import {dropVisuals,lootName} from "./loot-visual";
import {simulationInput} from "./simulation";
import { mapObjectAlpha, mapObjectDepth, coversActor, type Occluder } from "./map-render";
import { assetUrl, isGraybox } from "./release";
import { sounds } from "./sound";
import { setWorldLayouts, type WorldLayout } from "./world";
import { MovementInput, inputDiagnostics } from "./input";
import { SCENERY, ITEMS, MAPS, STATIONARY_MONSTERS, isBossKind, type MapId } from "./content";
let battleBottomInset=0;
export function setBattleInset(height:number) {battleBottomInset=Math.max(0,height);}
import { resolveAppearance, weaponBehind } from "./appearance";
import { game, WORLD, type Enemy } from "./game";
export type Manifest = {
  world?: WorldLayout;
  worlds?: Partial<Record<MapId, WorldLayout>>;
  pages: {
    key: string;
    image: string;
    data: string;
    width: number;
    height: number;
    lazy?: boolean;
    group?: string;
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
  setWorldLayouts(manifest.worlds ?? (manifest.world ? { biche: manifest.world } : {}));
}
let rendererReady = false;
export const readyListeners = new Set<() => void>();
export const isReady = () => rendererReady;
export let frameMS = 0;
export const appearanceStatus = { loading: false, error: "" };
class BattleScene extends Phaser.Scene {
  private autopilotClock=-1;
  private autopilotAction={x:0,y:0};
  private bodies = new Map<string, Phaser.GameObjects.Image>();
  private pool: Phaser.GameObjects.Image[] = [];
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private seenLabels=new Set<number>();
  private showLootNames=false;
  private deathStartedAt:number|null=null;
  private bars!: Phaser.GameObjects.Graphics;
  private movementInput!: MovementInput;
  private accumulator = 0;
  private lastRun = "";
  private testVisualEpoch = 0;
  private nextFootstep = 0;
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
  private occluders: Occluder[] = [];
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private paintedMap: MapId | null = null;
  private modelPages = new Map<string, Set<string>>();
  private queuedPages = new Set<string>();
  private failedPages = new Set<string>();
  private heroLook: { body: string; weapon: string | null } = { body: "dress-1", weapon: "weapon-8" };
  private viewportKey="";
  constructor() {
    super("battle");
  }
  preload() {
    for (const page of assets.pages.filter((p) => !p.lazy))
      this.load.atlas(page.key, assetUrl(page.image), assetUrl(page.data));
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if (!rendererReady) {
        this.failed = true;
        document.dispatchEvent(new CustomEvent("asset-error"));
      } else {
        this.failedPages.add(file.key);
        appearanceStatus.error = "原版素材加载失败，请重试";
        game.emit();
      }
    });
  }
  create() {
    if (this.failed) return;
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.syncViewport();
    this.cameras.main.roundPixels=false;
    this.paintGround();
    for (const [name, sequence] of Object.entries(assets.animations)) {
      const model = name.split("/")[0];
      const pages = this.modelPages.get(model) ?? new Set<string>();
      for (const frame of sequence) if (assets.frames[frame]) pages.add(assets.frames[frame].texture);
      this.modelPages.set(model, pages);
    }
    for (const [id, world] of Object.entries(assets.worlds ?? { biche: assets.world })) {
      if (!world) continue;
      this.modelPages.set("world-" + id, new Set([...world.tiles, ...world.objects].map((part) =>
        assets.frames["map/" + part.texture.toString(16).toUpperCase().padStart(8, "0")]?.texture).filter((v): v is string => !!v)));
    }
    this.load.on("complete", () => game.emit());
    document.addEventListener("retry-appearance", () => {
      this.failedPages.clear();
      this.queuedPages.clear();
      appearanceStatus.error = "";
    });
    this.bars = this.add.graphics().setDepth(5000);
    this.movementInput = new MovementInput(
      window,
      () => game.phase === "battle",
      ()=>game.useBloodPotion(),
    );
    this.game.canvas.tabIndex = 0;
    this.game.canvas.setAttribute("aria-label", "游戏战场");
    this.game.events.once(Phaser.Core.Events.DESTROY, () =>
      this.movementInput.destroy(),
    );
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
      "ALT",
    ]);
    this.input.keyboard!.on("keydown-ESC", () => game.pause());
    this.input.keyboard!.on("keydown-P", () => game.pause());
    this.input.keyboard!.on("keydown-SPACE", () => game.useManualSkill());
    this.input.keyboard!.on("keydown-ALT",()=>{this.showLootNames=true;});
    this.input.keyboard!.on("keyup-ALT",()=>{this.showLootNames=false;});
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      if (game.phase === "upgrade" && ["1", "2", "3"].includes(e.key)) {
        const c = game.choices[Number(e.key) - 1];
        if (c) game.choose(c.id);
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (game.phase === "battle" && p.downElement?.tagName === "CANVAS") {
        // Phaser prevents the browser's default pointer focus. Return keyboard
        // control after the user finishes editing a test input or checkbox.
        this.game.canvas.focus({ preventScroll: true });
        this.drag = { id: p.id, x: p.x, y: p.y };
      }
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
    this.scale.on("resize", () => this.syncViewport());
    rendererReady = true;
    for (const f of readyListeners) f();
    game.emit();
  }
  private centerCamera(x:number,y:number) {
    this.syncViewport();
    const camera=this.cameras.main;
    camera.centerOn(x,y);
    camera.scrollX=alignCameraScroll(camera.scrollX,camera.zoomX,camera.width*camera.originX,camera.x,{min:camera.clampX(-Number.MAX_SAFE_INTEGER),max:camera.clampX(Number.MAX_SAFE_INTEGER)});
    camera.scrollY=alignCameraScroll(camera.scrollY,camera.zoomY,camera.height*camera.originY,camera.y,{min:camera.clampY(-Number.MAX_SAFE_INTEGER),max:camera.clampY(Number.MAX_SAFE_INTEGER)});
  }
  private syncViewport() {
    const view=battleViewport(this.scale.width,this.scale.height,game.phase==="lobby" ? 0 : battleBottomInset);
    const key=`${view.width}/${view.height}`;
    if(key===this.viewportKey)return;
    this.viewportKey=key;
    this.cameras.main.setViewport(0,0,view.width,view.height).setZoom(this.zoom());
  }
  private zoom() {
    return this.scale.width < 700 ? 1.15 : 1.5;
  }
  private clearInput() {
    this.showLootNames=false;
    this.drag = null;
    game.input = { x: 0, y: 0 };
    this.input.keyboard?.resetKeys();
    this.movementInput?.clear();
  }
  private paintGround() {
    for (const object of this.worldObjects) object.destroy();
    this.worldObjects = [];
    this.occluders = [];
    this.paintedMap = game.mapId;
    if (this.textures.exists("terrain")) this.textures.remove("terrain");
    if (isGraybox) {
      const g = this.add.graphics().setDepth(-100);
      this.worldObjects.push(g);
      g.fillStyle(0x18221e, 1).fillRect(0, 0, WORLD.w, WORLD.h);
      g.lineStyle(1, 0x2c3d33, 0.45);
      for (let x = 0; x < WORLD.w; x += 96) g.lineBetween(x, 0, x, WORLD.h);
      for (let y = 0; y < WORLD.h; y += 96) g.lineBetween(0, y, WORLD.w, y);
      for (const object of SCENERY)
        g.fillStyle(0x63715c, 1).fillCircle(object.x, object.y, object.r + 8);
      return;
    }
    const map = game.layout;
    const texture = this.textures.createCanvas("terrain", WORLD.w, WORLD.h)!;
    const context = texture.context;
    context.imageSmoothingEnabled = false;
    context.fillStyle = game.mapId === "biche" ? "#252a1e" : "#11100e";
    context.fillRect(0, 0, WORLD.w, WORLD.h);
    const paint = (key: string, x: number, y: number, bottom = false) => {
      const meta = assets.frames[key];
      if (!meta) return;
      const f = this.textures.getFrame(meta.texture, key);
      context.drawImage(
        f.source.image as HTMLImageElement,
        f.cutX,
        f.cutY,
        f.cutWidth,
        f.cutHeight,
        x,
        bottom ? y - f.cutHeight : y,
        f.cutWidth,
        f.cutHeight,
      );
    };
    if (map) {
      for (const tile of map.tiles)
        paint(
          "map/" + tile.texture.toString(16).toUpperCase().padStart(8, "0"),
          tile.x,
          tile.y,
        );
      for (const o of map.objects)
        if (o.depth === 0)
          paint(
            "map/" + o.texture.toString(16).toUpperCase().padStart(8, "0"),
            o.x,
            o.y,
            true,
          );
    } else {
      const f = assets.frames["ground/3"];
      for (let y = 0; y < WORLD.h; y += f.height)
        for (let x = 0; x < WORLD.w; x += f.width) paint("ground/3", x, y);
    }
    texture.refresh();
    this.worldObjects.push(this.add.image(0, 0, "terrain").setOrigin(0).setDepth(-100));
    const alphaMasks = new Map<string, Uint8Array>();
    if (map)
      for (const o of map.objects) {
        if (o.depth === 0) continue;
        const key =
            "map/" + o.texture.toString(16).toUpperCase().padStart(8, "0"),
          f = assets.frames[key];
        if (!f) continue;
        const image = this.add
          .image(o.x, o.y, f.texture, key)
          .setOrigin(0, 1)
          .setDepth(mapObjectDepth(o, map.cellHeight))
          .setAlpha(mapObjectAlpha(o, f.width, f.height, mapObjectDepth(o, map.cellHeight), null));
        this.worldObjects.push(image);
        if (!alphaMasks.has(key)) {
          const frame = this.textures.getFrame(f.texture, key);
          const canvas = document.createElement("canvas");
          canvas.width = f.width; canvas.height = f.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(frame.source.image as HTMLImageElement, frame.cutX, frame.cutY, f.width, f.height, 0, 0, f.width, f.height);
          const pixels = ctx.getImageData(0, 0, f.width, f.height).data;
          alphaMasks.set(key, Uint8Array.from({ length: f.width * f.height }, (_, i) => pixels[i * 4 + 3]));
        }
        this.occluders.push({ x: o.x, y: o.y, width: f.width, height: f.height, depth: image.depth, mask: alphaMasks.get(key)! });
      }
    else
      for (const o of SCENERY) {
        const key = "scenery/" + o.id,
          f = assets.frames[key];
        if (f)
          this.worldObjects.push(this.add
            .image(o.x, o.y, f.texture, key)
            .setOrigin(0.5, 1)
            .setDepth(o.y));
      }
    this.worldObjects.push(this.add
      .graphics()
      .lineStyle(2, 0xd8c894, 0.45)
      .strokeRect(24, 36, WORLD.w - 48, WORLD.h - 60)
      .setDepth(-1));
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
    if (isGraybox) {
      this.bars.fillStyle(0xcbb368, alpha).fillRect(x - 4, y - 4, 8, 8);
      return;
    }
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
      .setRotation(0)
      .clearTint();
  }
  private requireModels(names: string[]) {
    const needed = new Set<string>();
    for (const name of names)
      for (const texture of this.modelPages.get(name) ?? []) needed.add(texture);
    let complete = true;
    for (const page of assets.pages.filter((p) => needed.has(p.key))) {
      if (this.textures.exists(page.key)) continue;
      complete = false;
      if (this.queuedPages.has(page.key) || this.failedPages.has(page.key)) continue;
      this.queuedPages.add(page.key);
      this.load.atlas(page.key, assetUrl(page.image), assetUrl(page.data));
    }
    const loading = !complete && !appearanceStatus.error;
    if (appearanceStatus.loading !== loading) {
      appearanceStatus.loading = loading;
      game.emit();
    }
    if (!this.load.isLoading() && this.load.list.size) this.load.start();
    if (complete) appearanceStatus.error = "";
    return complete;
  }
  private hero(motion: string, dir: number, x: number, y: number, time: number, depth: number, alpha: number) {
    const desired = resolveAppearance(game.classId, game.phase === "lobby"
      ? { weapon: { itemId: ITEMS.find((i) => i.name === "木剑")!.id } }
      : game.equipment);
    const needed = [desired.body, desired.body + "-shadow", ...(desired.weapon ? [desired.weapon] : [])];
    if (this.requireModels(needed)) this.heroLook = desired;
    const body = assets.animations[`${this.heroLook.body}/${motion}/${dir}`];
    if (!body?.length) return;
    const terminalDeath=motion==="death" && !(game.mode==="test" && game.test.pose==="death");
    const frame = body[terminalDeath ? Math.min(body.length-1,Math.floor(time*9)) : Math.floor(time * 9) % body.length];
    const index = Number(frame.split("/").at(-1));
    const matching = (name: string) => assets.animations[`${name}/${motion}/${dir}`]?.find((f) => Number(f.split("/").at(-1)) === index);
    const shadow = matching(this.heroLook.body + "-shadow");
    if (shadow) this.draw("hero-shadow", shadow, x, y, -40, alpha * 0.46);
    const weapon = this.heroLook.weapon && matching(this.heroLook.weapon);
    if (weapon) this.draw("hero-weapon", weapon, x, y, depth + (weaponBehind(motion, dir, index) ? -0.1 : 0.1), alpha);
    this.draw("hero", frame, x, y, depth, alpha);
    if (game.phase !== "lobby" && this.occluders.some((part) => coversActor(part, { x, y }))) {
      this.draw("hero-cover", frame, x, y, 4100, alpha * 0.32);
      this.bodies.get("hero-cover")?.setTintFill(0xe4d5ab);
      if (weapon) {
        this.draw("weapon-cover", weapon, x, y, 4100 + (weaponBehind(motion, dir, index) ? -0.1 : 0.1), alpha * 0.32);
        this.bodies.get("weapon-cover")?.setTintFill(0xe4d5ab);
      }
    }
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
    height = 0,
  ) {
    if (isGraybox) {
      const color = key.startsWith("hero")
        ? 0xdec78b
        : key.startsWith("pet")
          ? 0x8abfa1
          : 0xc4766a;
      const radius = (isBossKind(name) ? 26 : 12) * scale;
      this.bars
        .fillStyle(color, alpha)
        .fillCircle(x, y - 12, radius)
        .lineStyle(2, 0x102016, 1)
        .strokeCircle(x, y - 12, radius);
      const angle = ((dir - 2) * Math.PI) / 4;
      this.bars
        .lineStyle(3, 0xe8e1c4, alpha)
        .lineBetween(
          x,
          y - 12,
          x + Math.cos(angle) * (radius + 8),
          y - 12 + Math.sin(angle) * (radius + 8),
        );
      return;
    }
    if (key === "hero") {
      this.hero(motion, dir, x, y, time, depth, alpha);
      return;
    }
    if(STATIONARY_MONSTERS.includes(name)) {
      // These source monsters have one fixed body direction and no walk cycle.
      dir=0;
      if(motion==="walk")motion="idle";
    }
    const shadowFrames = assets.animations[`${name}-shadow/${motion}/${dir}`];
    if (shadowFrames?.length) this.draw(key + "-shadow", shadowFrames[Math.floor(time * 9) % shadowFrames.length], x, y, -40, alpha * 0.46, scale);
    const frames =
      assets.animations[`${name}/${motion}/${dir}`] ??
      assets.animations[`${name}/idle/${dir}`];
    if (frames?.length)
      this.draw(
        key,
        frames[Math.floor(time * 9) % frames.length],
        x,
        y - height,
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
    frameRate = 10,
    rotation = 0,
  ) {
    if (isGraybox) {
      this.bars
        .lineStyle(2, name.includes("fire") ? 0xd89f64 : 0x83b3c1, 0.65)
        .strokeCircle(x, y - 10, (name.includes("beam") ? 30 : 15) * scale);
      return;
    }
    const frames = assets.animations[name];
    if (frames?.length) {
      this.draw(
        key,
        frames[Math.floor(time * frameRate) % frames.length],
        x,
        y,
        depth,
        1,
        scale,
      );
      if(rotation) {
        const frame=assets.frames[frames[Math.floor(time*frameRate)%frames.length]];
        this.bodies.get(key)?.setOrigin(frame.originX/frame.width,frame.originY/frame.height).setPosition(x,y).setRotation(rotation);
      }
    }
  }
  private label(id:number,text:string,x:number,y:number,color:string,alpha=1,size=12) {
    this.seenLabels.add(id);
    let label=this.labels.get(id);
    if(!label){label=this.add.text(0,0,"",{fontFamily:"SimSun, Songti SC, serif",fontSize:`${size}px`,stroke:"#16130b",strokeThickness:3}).setOrigin(.5).setDepth(6000);this.labels.set(id,label);}
    label.setPosition(x,y).setText(text).setColor(color).setAlpha(alpha).setFontSize(size);
    return label;
  }
  update(_time: number, delta: number) {
    if (!rendererReady) return;
    if (!isGraybox) {
      const kinds = [...new Set([...MAPS[game.mapId].monsterPool, MAPS[game.mapId].boss, ...game.enemies.map((e) => e.kind)])];
      const models = ["world-" + game.mapId, ...(game.mapId === "woma" || game.mapId === "zuma" ? ["womaFlame", "womaShock", "arrow"] : []),...(kinds.includes("overlord") ? ["overlordBlade","overlordDeath"] : []), ...kinds.flatMap((kind) => [kind, kind + "-shadow"])];
      const missing = models.some((name) => [...(this.modelPages.get(name) ?? [])].some((key) => !this.textures.exists(key)));
      if (missing && !this.requireModels(models)) { this.accumulator = 0; return; }
    }
    if (this.paintedMap !== game.mapId) {
      this.paintGround(); this.corpses = []; this.lastEnemies.clear(); this.clearInput();
    }
    frameMS = frameMS * 0.95 + delta * 0.05;
    if (this.testVisualEpoch !== game.test.visualEpoch) {
      this.testVisualEpoch = game.test.visualEpoch;
      this.corpses = []; this.lastEnemies.clear();
    }
    if (this.lastRun !== game.runId) {
      this.lastRun = game.runId;
      this.clearInput();
      this.corpses = [];
      this.lastEnemies.clear();
      this.accumulator = 0;
      this.autopilotClock=-1;this.autopilotAction={x:0,y:0};
      this.heroLook = { body: "dress-1", weapon: "weapon-8" };
    }
    if (game.phase === "battle") {
      const axes = this.movementInput.axes;
      let x = axes.x,
        y = axes.y;
      const previousHeld=inputDiagnostics.held,previousEvent=inputDiagnostics.last;
      inputDiagnostics.last = this.movementInput.lastEvent;
      inputDiagnostics.held = [...this.movementInput.held].join(" ") || "无";
      inputDiagnostics.x = x;
      inputDiagnostics.y = y;
      if(game.mode==="test" && (previousHeld!==inputDiagnostics.held || previousEvent!==inputDiagnostics.last))game.emit();
      const p = this.input.activePointer;
      if (this.drag && p.isDown && x === 0 && y === 0) {
        x = Phaser.Math.Clamp((p.x - this.drag.x) / 45, -1, 1);
        y = Phaser.Math.Clamp((p.y - this.drag.y) / 45, -1, 1);
      }
      game.input = { x, y };
      const manual=this.movementInput.held.size>0 || !!(this.drag && p.isDown);
      this.accumulator +=
        game.mode === "test" && game.test.pose !== "live"
          ? 0
          : Math.min(delta / 1000, 0.1) *
            (game.mode === "test" ? game.test.speed : 1);
      while (this.accumulator >= 1 / 60) {
        if(game.mode==="test" && game.test.autowalk && !manual) {
          if(game.clock>=this.autopilotClock){
            this.autopilotAction=simulationInput(game,this.autopilotAction);
            this.autopilotClock=game.clock+1/6;
          }
          game.input=this.autopilotAction;
        }
        game.step(1 / 60);
        this.accumulator -= 1 / 60;
      }
    } else {
      this.accumulator = 0;
      this.drag = null;
    }
    if (game.phase !== "lobby") {
      const audio=game.audioEvents.splice(0);
      for (const key of audio) sounds.play(key);
      if(game.mode==="test" && audio.some(key=>key==="hurt" || key==="death"))game.emit();
      if(game.phase==="battle"){
      if (game.player.moving && game.clock >= this.nextFootstep) {
        sounds.play("step");
        this.nextFootstep = game.clock + 0.34;
      }
      }
    } else game.audioEvents = [];
    this.seen.clear();
    this.seenLabels.clear();
    this.bars.clear();
    const t = game.clock;
    if (game.phase === "lobby") {
      this.centerCamera(WORLD.w / 2 + 70, WORLD.h / 2);
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
      this.centerCamera(game.player.x, game.player.y);
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
        const airborne=e.bossJumpTarget && game.clock>=(e.bossJumpWindupUntil ?? Infinity) && game.clock<(e.bossJumpUntil ?? 0);
        const jumpHeight=airborne ? Math.sin(Math.PI*Math.max(0,Math.min(1,(game.clock-(e.bossJumpWindupUntil ?? 0))/0.6)))*75 : 0;
        const motion =
          e.dormant ? "stone" : (e.awakenAt ?? 0)>game.clock ? "awaken" : e.windup > 0 || e.shock || e.rangedFireAt !== undefined || e.stompAt !== undefined || (e.chargeWindupUntil ?? 0) > game.clock ? "attack" : t - e.hitAt < 0.17 ? "hurt" : "walk";
        const scale = e.elite ? 1.15 : 1;
        this.actor(
          "enemy-" + e.id,
          e.kind,
          motion,
          e.dir,
          e.x,
          e.y,
          motion === "awaken" ? e.kind==="chulong" ? Math.min(9,Math.floor((game.clock-((e.awakenAt ?? 0)-1))*10))/9 : Math.min(5,Math.floor((game.clock-((e.awakenAt ?? 0)-0.8))/0.8*6))/9 : t - e.born,
          e.y,
          1,
          scale,
          jumpHeight,
        );
        const tint=poisonTint(e,game.clock);
        if(tint!==undefined)this.bodies.get("enemy-"+e.id)?.setTint(tint);
        const insight=enemyInsight(game,e);
        if(insight)this.label(-1000000-e.id,insight,e.x,e.y-90,"#e6dfaf",1,11);
        if (e.elite || e.hp < e.maxHp || insight) {
          const w = isBossKind(e.kind) ? 64 : 32;
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
              isBossKind(e.kind) ? 145 : 52,
              isBossKind(e.kind) ? 75 : 25,
            );
        }
        if (e.chargeTarget && (e.chargeWindupUntil ?? 0) > game.clock) {
          this.bars.lineStyle(3, 0xe6a754, 0.6)
            .lineBetween(e.x, e.y, e.chargeTarget.x, e.chargeTarget.y)
            .strokeEllipse(e.chargeTarget.x, e.chargeTarget.y, 50, 24);
        }
        if (e.stompAt !== undefined && e.stompOrigin) {
          this.bars.lineStyle(3, 0xe39a6c, 0.85)
            .strokeCircle(e.stompOrigin.x, e.stompOrigin.y, 130)
            .fillStyle(0xb96b42, 0.14).fillCircle(e.stompOrigin.x, e.stompOrigin.y, 130 * Math.max(0, 1 - (e.stompAt - game.clock)));
        }
        if(e.bossJumpTarget && game.clock<(e.bossJumpWindupUntil ?? 0)) {
          this.bars.lineStyle(3,0xf1ba72,0.9).strokeCircle(e.bossJumpTarget.x,e.bossJumpTarget.y,110)
            .fillStyle(0xd6904b,0.14).fillCircle(e.bossJumpTarget.x,e.bossJumpTarget.y,110)
            .lineStyle(2,0xf1ba72,0.6).lineBetween(e.x,e.y,e.bossJumpTarget.x,e.bossJumpTarget.y);
        }
        if (e.rangedTarget && e.rangedFireAt !== undefined) {
          const spread=e.kind === "zumaArcher" ? [-0.22,0,0.22] : [0];
          const angle=Math.atan2(e.rangedTarget.y-e.y,e.rangedTarget.x-e.x);
          for (const offset of spread) this.bars.lineStyle(2,0xeab46b,0.7)
            .lineBetween(e.x,e.y,e.x+Math.cos(angle+offset)*420,e.y+Math.sin(angle+offset)*420);
        }
        if(e.shock) this.bars.lineStyle(76,0xd18a4c,0.17)
          .lineBetween(e.shock.origin.x,e.shock.origin.y,e.shock.target.x,e.shock.target.y)
          .lineStyle(2,0xffcf81,0.85).lineBetween(e.shock.origin.x,e.shock.origin.y,e.shock.target.x,e.shock.target.y);
        if((e.awakenAt ?? 0)>game.clock) this.bars.lineStyle(3,0xffcc84,0.9).strokeCircle(e.x,e.y,42);
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
      const mouse=this.cameras.main.getWorldPoint(this.input.activePointer.x,this.input.activePointer.y);
      const lootLabels:Phaser.Geom.Rectangle[]=[];
      for (const d of game.drops) {
        for(const [i,part] of dropVisuals(d).entries()) {
          const key=`drop-${d.id}-${i}`;
          this.draw(key+"-shadow",part.frame,d.x+part.dx+1,d.y+part.dy-1,-31,.45,1,false);
          this.bodies.get(key+"-shadow")?.setTintFill(0);
          this.draw(key,part.frame,d.x+part.dx,d.y+part.dy,-30,1,1,false);
        }
        if(this.showLootNames || game.mode==="test" && game.test.lootLabels || d.itemId || d.heal || Math.hypot(mouse.x-d.x,mouse.y-d.y)<24) {
          const label=this.label(-d.id,lootName(d),d.x,d.y-23,d.heal ? "#f0a78c" : "#f5db79");
          let bounds=label.getBounds();
          for(let shift=0;shift<9 && lootLabels.some(old=>Phaser.Geom.Intersects.RectangleToRectangle(old,bounds));shift++) {
            label.y-=19;bounds=label.getBounds();
          }
          lootLabels.push(bounds);
        }
      }
      for (const p of game.projectiles)
        this.fx(
          "p-" + p.id,
          p.visual === "poison" ? "poison" : p.visual === "womaFlame" ? "womaFlame/"+Math.floor(p.dir/2) : (p.visual === "arrow" ? "arrow" : p.skill ?? "fireball") + "/" + p.dir,
          p.x,
          p.y - (p.height ?? 0),
          t,
          2200,
          p.visual === "poison" ? 0.55 : 0.8,
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
          effectSprites(f).forEach((sprite,index)=>this.fx(
            "fx-" + f.id+"-"+index,
            sprite.animation,
            sprite.x,
            sprite.y,
            sprite.time,
            sprite.depth,
            sprite.scale??(["explosion", "ice", "nova", "repulse"].includes(f.kind)
              ? Math.max(0.8, f.radius / 120)
              : 1),
            sprite.frameRate,sprite.rotation,
          ));
        }
      }
      if(game.phase==="dead" && game.player.hp<=0)this.deathStartedAt ??= _time;
      else this.deathStartedAt=null;
      const hero=heroPose(game,_time/1000,this.deathStartedAt===null ? 0 : (_time-this.deathStartedAt)/1000);
      if(game.mode==="test" && game.test.showDetection)this.bars.lineStyle(2,0x71c9e8,.55).strokeCircle(game.player.x,game.player.y,game.detectionRange);
      this.actor(
        "hero",
        game.classId,
        hero.motion,
        hero.dir,
        game.player.x,
        game.player.y,
        hero.time,
        game.player.y + 0.5,
        1,
      );
      if(hero.motion==="hurt" && t-(game.player.hitUntil-.45)<.09)
        for(const key of ["hero","hero-weapon","hero-cover","weapon-cover"])this.bodies.get(key)?.setTint(0xff9890);
      if (hero.motion!=="death" && t < game.player.shieldUntil)
        this.fx(
          "shield",
          "shield",
          game.player.x,
          game.player.y,
          t,
          game.player.y + 1,
          1,
        );
      if(hero.motion!=="death")this.bars
        .lineStyle(1, 0xe4cc83, 0.65)
        .strokeEllipse(game.player.x, game.player.y + 3, 30, 15);
      for (const f of game.floating)this.label(f.id,f.text,f.x,f.y,f.color,Math.min(1,f.life*2),15);
    }
    for (const [id, label] of this.labels)
      if (!this.seenLabels.has(id)) {
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
    backgroundColor: isGraybox ? "#1d271f" : "#100c08",
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
