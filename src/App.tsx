import { useEffect, useReducer, useState, useRef, type CSSProperties } from "react";
import { game, type Mode, type RunResult } from "./game";
import {
  SKILLS,
  SLOT_KEYS,
  SLOT_NAMES,
  STAT_NAMES,
  getItem,
  getSkill,
  type Slot,
  MAPS, MAP_IDS, MONSTERS, PLAYABLE_MAP_IDS,
} from "./content";
import {
  assets,
  isReady,
  readyListeners,
  frameMS,
  appearanceStatus,
  setAssetManifest,
  setBattleInset,
} from "./renderer";
import { CLASSES, CLASS_IDS } from "./classes";
import {primaryRange} from "./equipment";
import { expNeeded, sellPrice } from "./rules";
import { sounds } from "./sound";
import {
  assetUrl,
  isGraybox,
  releaseVersion,
  releaseCommit,
  repositoryUrl,
} from "./release";
import { TestTools } from "./TestTools";
import { saveRun, history, loadProgress, unlockChapter, buyTalent, readCheckpoint, writeCheckpoint, clearCheckpoint } from "./save";
import { SaveManager } from "./SaveManager";
import {damageSourceName} from "./damage-taken";
import {damageRows, purchaseRows, statRows, dpsText} from "./run-stats";
import {TALENTS, talentCost, talentLevel} from "./talents";
import type {RunCheckpoint} from "./checkpoint";
const time = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
function Art({
  frame,
  className = "",
}: {
  frame?: string;
  className?: string;
}) {
  const f = frame && assets?.frames[frame];
  if (!f)
    return (
      <span className={"art-empty " + className} aria-hidden="true">
        ◇
      </span>
    );
  return (
    <span
      className={"art " + className}
      aria-hidden="true"
      style={{
        width: f.width,
        height: f.height,
        backgroundImage: `url(${assetUrl(assets.pages.find((p) => p.key === f.texture)!.image)})`,
        backgroundPosition: `-${atlasPosition(frame!).x}px -${atlasPosition(frame!).y}px`,
      }}
    />
  );
}
let framePositions: Record<string, { x: number; y: number }> = {};
export async function loadArtPositions() {
  if (isGraybox) {
    setAssetManifest({
      pages: [],
      animations: {},
      frames: {},
      rightsStatus: "NO_THIRD_PARTY_ASSETS",
    });
    framePositions = {};
    return;
  }
  const r = await fetch(assetUrl("manifest.json"));
  if (!r.ok) throw new Error("无法读取素材清单");
  const manifest = await r.json();
  setAssetManifest(manifest);
  framePositions = {};
  await Promise.all(
    manifest.pages.filter((page: { lazy?: boolean }) => !page.lazy).map(async (page: { data: string }) => {
      const response = await fetch(assetUrl(page.data));
      if (!response.ok) throw new Error("无法读取素材图集");
      const atlas = await response.json();
      for (const [key, value] of Object.entries(atlas.frames))
        framePositions[key] = (
          value as { frame: { x: number; y: number } }
        ).frame;
    }),
  );
}
function atlasPosition(frame: string) {
  return framePositions[frame] ?? { x: 0, y: 0 };
}
function Icon({ frame }: { frame?: string }) {
  if(frame?.startsWith("item/") && assets?.frames[frame.replace("item/","package/")])frame=frame.replace("item/","package/");
  const f = frame && assets?.frames[frame],
    position = frame && framePositions[frame];
  const page = f && assets.pages.find((p) => p.key === f.texture);
  return (
    <span className="icon-box" aria-hidden="true">
      {f && position && page ? (
        <svg
          viewBox={`0 0 ${f.width} ${f.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <svg
            width={f.width}
            height={f.height}
            viewBox={`${position.x} ${position.y} ${f.width} ${f.height}`}
            overflow="hidden"
          >
            <image
              width={page.width}
              height={page.height}
              href={assetUrl(page.image)}
            />
          </svg>
        </svg>
      ) : (
        <span className="art-empty">◇</span>
      )}
    </span>
  );
}
export function App() {
  const [, refresh] = useReducer((x) => x + 1, 0);
  const [ready, setReady] = useState(isReady());
  const [assetError, setAssetError] = useState(false);
  const [records, setRecords] = useState<RunResult[]>([]);
  const [tab, setTab] = useState<
    "play" | "guide" | "talents" | "records" | "skills"
  >("play");
  const [inventory, setInventory] = useState(false);
  const [seed, setSeed] = useState("176");
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [progressBusy, setProgressBusy] = useState(true);
  const [chapterError, setChapterError] = useState("");
  const [savedRun, setSavedRun] = useState<RunCheckpoint | null>(null);
  const [settledRun,setSettledRun]=useState("");
  const inventoryResumes = useRef(false);
  const checkpointKey = useRef("");
  const battleConsole = useRef<HTMLElement|null>(null);
  const inLobby=game.phase==="lobby";
  useEffect(()=>{
    const console=battleConsole.current;
    if(!console){setBattleInset(0);return;}
    const measure=()=>setBattleInset(console.getBoundingClientRect().height);
    const observer=new ResizeObserver(measure);observer.observe(console);measure();
    return ()=>{observer.disconnect();setBattleInset(0);};
  },[inLobby]);
  useEffect(() => { document.title = `玛法幸存者 · ${game.mapId === "biche" ? "比奇荒野" : MAPS[game.mapId].name}`; }, [game.mapId]);
  useEffect(() => game.subscribe(refresh), []);
  useEffect(()=>{
    if(game.phase!=="dead" || game.player.hp>0 || !game.result)return;
    const runId=game.runId;
    const timer=window.setTimeout(()=>setSettledRun(runId),1200);
    return ()=>window.clearTimeout(timer);
  },[game.phase,game.runId]);
  // Autosave only at stable wave boundaries; a mid-wave refresh replays this wave.
  useEffect(() => game.subscribe(() => {
    if (game.mode === "test") return;
    const checkpoint = game.snapshotCheckpoint();
    if (!checkpoint) return;
    const key = JSON.stringify({ ...checkpoint, savedAt: 0 });
    if (key === checkpointKey.current) return;
    checkpointKey.current = key;
    void writeCheckpoint(checkpoint)
      .then((ok) => { if (ok) setSavedRun(checkpoint); })
      .catch(() => {});
  }), []);
  useEffect(() => {
    const f = () => {
      setReady(true);
    };
    readyListeners.add(f);
    // An asset-free build may finish Phaser initialization before React effects subscribe.
    if (isReady()) f();
    const fail = () => setAssetError(true);
    document.addEventListener("asset-error", fail);
    history()
      .then(setRecords)
      .catch(() => setSaveError("无法读取本地记录，当前仍可正常试玩。"));
    loadProgress().then(async (progress) => {
      game.applyProgress(progress);
      const checkpoint = await readCheckpoint();
      if (checkpoint && checkpoint.mode === "normal" && !game.unlockedMaps.has(checkpoint.mapId)) {
        await clearCheckpoint();
        return;
      }
      setSavedRun(checkpoint);
    })
      .catch((error: unknown) => setChapterError(error instanceof Error ? error.message : "无法读取局外进度，仍可试玩。"))
      .finally(() => setProgressBusy(false));
    return () => {
      readyListeners.delete(f);
      document.removeEventListener("asset-error", fail);
    };
  }, []);
  useEffect(() => {
    if (!game.result || game.mode === "test") return;
    setSaveStatus("正在保存…");
    setProgressBusy(true);
    saveRun(game.result)
      .then(async (progress) => {
        if (progress) game.applyProgress(progress);
        setSaveStatus("战绩已保存到本机");
        checkpointKey.current = "";
        setSavedRun(null);
        await clearCheckpoint().catch(() => {});
        return history();
      })
      .then(setRecords)
      .catch(() => {
        setSaveStatus("保存未成功");
        setSaveError("浏览器存储不可用，本次战绩尚未保存。");
        checkpointKey.current = "";
        setSavedRun(null);
        void clearCheckpoint().catch(() => {});
      }).finally(() => setProgressBusy(false));
  }, [game.result]);
  const start = (mode: Mode) => {
    void sounds.unlock();
    setInventory(false);
    setSaveError("");
    setSaveStatus("");
    checkpointKey.current = "";
    game.start(mode, Number(seed) >>> 0);
    requestAnimationFrame(() => document.querySelector("canvas")?.focus());
  };
  const resumeRun = async () => {
    if (!savedRun) return;
    setProgressBusy(true);
    setChapterError("");
    try {
      game.applyProgress(await loadProgress());
      if (!game.resumeCheckpoint(savedRun)) throw new Error("上次战斗存档无法恢复，已保留本机进度。");
      checkpointKey.current = "";
      setInventory(false);
      setSaveStatus("已从本波起点继续");
      setTab("play");
      requestAnimationFrame(() => document.querySelector("canvas")?.focus());
    } catch (error) {
      setChapterError(error instanceof Error ? error.message : "无法继续上次战斗。");
    } finally {
      setProgressBusy(false);
    }
  };
  const discardRun = async () => {
    setSavedRun(null);
    checkpointKey.current = "";
    await clearCheckpoint().catch(() => {});
  };
  const toggleInventory = () => {
    inventoryResumes.current = !inventory && game.phase === "battle";
    if (inventoryResumes.current) game.pause();
    setInventory(!inventory);
  };
  const closeInventory = () => {
    setInventory(false);
    if (inventoryResumes.current && game.phase === "paused") game.pause();
    inventoryResumes.current = false;
  };
  const active = !["lobby", "won", "dead"].includes(game.phase);
  const boss = game.boss;
  const chapter = MAPS[game.mapId];
  const bossName = MONSTERS.find((m) => m.id === (boss?.kind ?? chapter.boss))!.name;
  const chapterUnlocked = game.unlockedMaps.has(game.mapId);
  return (
    <main className={isGraybox ? "graybox" : "classic-ui"} style={isGraybox ? undefined : {
      "--mir-board":`url("${assetUrl("ui/board.png")}")`,
      "--mir-chat":`url("${assetUrl("ui/chat.png")}")`,
      "--mir-panel":`url("${assetUrl("ui/panel.png")}")`,
    } as CSSProperties}>
      <div className="vignette" />
      {game.player.hitUntil>game.clock && game.phase!=="lobby" && <div key={game.runId+game.player.hitUntil} className="damage-flash" aria-hidden="true" />}
      {game.phase==="dead" && game.player.hp<=0 && settledRun!==game.runId && <div className="death-cue" role="status">魂归玛法</div>}
      <TestTools />
      {(appearanceStatus.loading || appearanceStatus.error) && (
        <div className="appearance-notice" role="status">
          {appearanceStatus.error || "正在载入原版素材…"}
          {appearanceStatus.error && <button onClick={() => document.dispatchEvent(new Event("retry-appearance"))}>重试</button>}
        </div>
      )}
      <div className="release-badge">
        <span>
          {releaseVersion} · {releaseCommit}
          {isGraybox ? " · 灰盒测试版" : ""}
        </span>
        <a href={repositoryUrl + "/releases"} target="_blank" rel="noreferrer">
          版本记录
        </a>
        <a
          href={repositoryUrl + "/issues/new?template=bug_report.yml"}
          target="_blank"
          rel="noreferrer"
        >
          反馈问题
        </a>
      </div>
      {assetError && (
        <div className="asset-error" role="alert">
          <h2>原版素材未加载</h2>
          <p>请按 README 运行素材导入脚本，再刷新页面。</p>
          <button onClick={() => location.reload()}>重新加载</button>
        </div>
      )}
      {game.phase === "lobby" && (
        <>
          <div className="edition">
            开发预览 <span>03 / 法师 · 战士 · 道士</span>
          </div>
          <section className="lobby">
            <div className="eyebrow">
              <span /> M A F A · S U R V I V O R <span />
            </div>
            <h1>
              玛法<span>幸存者</span>
            </h1>
            <p className="tagline">故地重临，一人生还。</p>
            <nav className="lobby-tabs" aria-label="主菜单">
              {(["play", "guide", "talents", "records", "skills"] as const).map((t, i) => (
                <button
                  key={t}
                  className={tab === t ? "selected" : ""}
                  onClick={() => setTab(t)}
                >
                  {["踏入荒野", "行前须知", "玛法天赋", "征战记录", "技能图鉴"][i]}
                </button>
              ))}
            </nav>
            {(tab === "play" || tab === "skills") && (
              <div className="class-picker" role="group" aria-label="选择职业">
                {CLASS_IDS.map((id) => (
                  <button
                    key={id}
                    aria-pressed={game.classId === id}
                    onClick={() => game.selectClass(id)}
                  >
                    {CLASSES[id].name}
                  </button>
                ))}
              </div>
            )}
            {tab === "play" && (
              <div className="journey">
                <div className="class-picker chapter-picker" role="group" aria-label="选择章节">
                  {PLAYABLE_MAP_IDS.map((id) => <button key={id} disabled={!ready}
                    aria-pressed={game.mapId === id} onClick={() => { game.selectMap(id); setChapterError(""); }}>
                    {id === "biche" ? "比奇荒野" : MAPS[id].name}
                  </button>)}
                </div>
                <div className="chapter">
                  <span>{["第一章","第二章","第三章","第四章","第五章","第六章","第七章","第八章"][MAP_IDS.indexOf(game.mapId)]} · 玛法结晶 {game.crystals}</span>
                  <h2>{game.mapId === "biche" ? "比奇荒野" : chapter.name}</h2>
                  <p>
                    {game.mapId === "biche" ? "稻草人游荡在旧路旁。在怪潮中收集经验，找回熟悉的力量。" : game.mapId === "mine" ? "沿旧矿道穿过坍塌岩壁，提防转角后的骷髅弓箭手，迎战召唤僵尸的尸王。" : chapter.theme}
                  </p>
                  {!chapterUnlocked && <>
                    <button className="secondary" disabled={progressBusy || game.crystals < chapter.unlockCost}
                      onClick={async () => {
                        setProgressBusy(true); setChapterError("");
                        try { game.applyProgress(await unlockChapter(game.mapId)); }
                        catch (error) { setChapterError(error instanceof Error ? error.message : "解锁未保存，请重试。"); }
                        finally { setProgressBusy(false); }
                      }}>解锁正常远征 · {chapter.unlockCost} 玛法结晶</button>
                    <p className="muted">正常通关比奇可获得3结晶。短局试玩与快速测试可直接进入本章。</p>
                  </>}
                  {chapterError && <p className="inline-error">{chapterError}</p>}
                </div>
                {savedRun && (
                  <div className="resume-run">
                    <div>
                      <strong>继续上次战斗</strong>
                      <span>
                        {CLASSES[savedRun.classId]?.name ?? savedRun.classId} ·{" "}
                        {savedRun.mapId === "biche" ? "比奇荒野" : MAPS[savedRun.mapId].name} ·
                        第 {savedRun.wave} 波 ·{" "}
                        {{battle:"本波开头",shop:"波间商店",upgrade:"升级选择",replace:"替换技能"}[savedRun.phase]}
                      </span>
                      <small>刷新只回到本波起点；已保存金币、装备、技能与升级。</small>
                    </div>
                    <div>
                      <button className="primary" disabled={progressBusy} onClick={resumeRun}>
                        继续
                      </button>
                      <button className="secondary" disabled={progressBusy} onClick={discardRun}>
                        放弃
                      </button>
                    </div>
                  </div>
                )}
                <div className="mode-buttons">
                  <button
                    className="primary"
                    disabled={!ready || assetError || progressBusy || !chapterUnlocked}
                    onClick={() => start("normal")}
                  >
                    {ready ? chapterUnlocked ? game.mapId === "biche" ? "进入荒野" : game.mapId === "mine" ? "进入矿洞" : "进入神殿" : "正常远征尚未解锁" : "正在载入原版素材…"}
                    <span>12 波 · 每波 75 秒</span>
                  </button>
                  <button
                    className="secondary"
                    disabled={!ready || assetError}
                    onClick={() => start("trial")}
                  >
                    短局试玩<span>3 波 · 每波 35 秒 · 不发放结晶</span>
                  </button>
                </div>
                <div className="class-card">
                  <Art
                    frame={assets?.animations[game.classId + "/idle/4"]?.[0]}
                  />
                  <div>
                    <strong>{game.classInfo.name}</strong>
                    <span>{game.classInfo.role}</span>
                    <small>
                      初始技能：{getSkill(game.classInfo.startingSkill).name} ·
                      无限 MP
                    </small>
                  </div>
                  <span className="class-mark">已选</span>
                </div>
                <button
                  className="test-entry"
                  disabled={!ready || assetError}
                  onClick={() => start("test")}
                >
                  快速测试模式 <small>无敌 · 刷怪 · 换技能 · 动作检查</small>
                </button>
                <div className="seed">
                  <label htmlFor="seed">世界种子</label>
                  <input
                    id="seed"
                    type="number"
                    min="0"
                    max="4294967295"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                  <span>相同种子可复现随机选择</span>
                </div>
              </div>
            )}
            {tab === "guide" && (
              <div className="guide">
                <p>血瓶优先恢复当前生命，满血时最多储备3瓶。生命降至50%及以下会自动用药，也可按 <kbd>Q</kbd> 或点击血瓶提前使用，间隔2秒；新一局清空储备。</p>
                <p>
                  <kbd>W A S D</kbd> / <kbd>方向键</kbd>{" "}
                  移动；触屏可在战场上拖动。
                </p>
                <p>技能自动施放，靠近掉落物即可拾取经验与金币。</p>
                <p>
                  升级时暂停，点击或按 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>{" "}
                  选择强化。
                </p>
                <p>每波结束进入商店。未拾取经验全额结算，金币回收一半。</p>
                <p>
                  <kbd>Esc</kbd> / <kbd>P</kbd> 暂停。切出窗口会自动暂停。
                </p>
                <p className="muted">
                  法师 14 项、战士 6 项、道士 13 项技能可选，单局最多装备 6
                  项。普通攻击独立于技能槽；空格可触发瞬移、冲撞或手动技能。
                  道士可在行囊中切换红绿毒和治疗优先目标。
                </p>
              </div>
            )}
            {tab === "talents" && (
              <div className="talents" aria-label="玛法天赋">
                <p className="muted">
                  用玛法结晶永久强化本机进度 · 每项最多 5 级 · 每级 +1%（体魄为
                  +1 生命）· 玛法结晶 {game.crystals}
                </p>
                {TALENTS.map((def) => {
                  const level = talentLevel(game.talents, def.id);
                  const maxed = level >= def.maxLevel;
                  const cost = talentCost(level);
                  return (
                    <article key={def.id}>
                      <div>
                        <h3>
                          {def.name}
                          <small>
                            Lv.{level}/{def.maxLevel}
                          </small>
                        </h3>
                        <p>{def.description}</p>
                      </div>
                      <button
                        disabled={progressBusy || maxed || game.crystals < cost}
                        onClick={async () => {
                          setProgressBusy(true);
                          setChapterError("");
                          try {
                            game.applyProgress(await buyTalent(def.id));
                          } catch (error) {
                            setChapterError(
                              error instanceof Error ? error.message : "天赋未保存，请重试。",
                            );
                          } finally {
                            setProgressBusy(false);
                          }
                        }}
                      >
                        {maxed ? "已满级" : `升级 · ${cost} 结晶`}
                      </button>
                    </article>
                  );
                })}
                {chapterError && <p className="inline-error">{chapterError}</p>}
              </div>
            )}
            {tab === "skills" && (
              <div className="skill-book">
                <p className="muted">
                  {game.classInfo.name}经典技能池 · 每局最多 6 项 ·
                  数值为幸存者玩法设计值
                </p>
                {SKILLS.filter((skill) => skill.classId === game.classId).map(
                  (skill) => (
                    <article key={skill.id}>
                      <Icon frame={skill.asset} />
                      <div>
                        <h3>
                          {skill.name}
                          <small>
                            {skill.passive
                              ? "常驻 · 占槽"
                              : `CD ${skill.cooldown}s`}
                          </small>
                        </h3>
                        <p>{skill.description}</p>
                        <span>
                          {skill.branches.map((b) => b.label).join(" / ")}
                        </span>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
            {tab === "records" && (
              <div className="records">
                <SaveManager onBusyChange={setProgressBusy} onRestored={async progress => {
                  game.applyProgress(progress); setRecords(await history());
                  setSaveError(""); setChapterError("");
                  setSavedRun(null); checkpointKey.current = "";
                }} />
                {records.length ? (
                  records.map((r) => (
                    <article key={r.runId}>
                      <div>
                        <strong>
                          {r.won ? "生还" : "陨落"} ·{" "}
                          {!r.mapId || r.mapId === "biche" ? "比奇荒野" : MAPS[r.mapId].name}{r.mode === "trial" ? " · 短局试玩" : ""}
                        </strong>
                        <span>
                          {CLASSES[r.classId ?? "wizard"].name} · 第 {r.wave} 波
                          · 击败 {r.kills} · Lv.{r.level}
                        </span>
                      </div>
                      <b>{time(r.seconds)}</b>
                      <details className="record-detail">
                        <summary>本局详情</summary>
                        {damageRows(r.skillDamage, r.seconds).map((row) => (
                          <div key={row.id}>
                            <span>{row.name}</span>
                            <b>{Math.round(row.damage)}</b>
                            <em>
                              {dpsText(row.dps)}/秒 · {row.share.toFixed(0)}%
                            </em>
                          </div>
                        ))}
                        {purchaseRows(r.purchases).length > 0 && (
                          <p>
                            购买：
                            {purchaseRows(r.purchases)
                              .map((row) => `${row.name}×${row.count}`)
                              .join(" · ")}
                          </p>
                        )}
                      </details>
                    </article>
                  ))
                ) : (
                  <div className="empty">
                    <span>尚无征战记录</span>
                    <p>踏入荒野，写下你的第一段传说。</p>
                  </div>
                )}
              </div>
            )}
            {saveError && <p className="inline-error">{saveError}</p>}
          </section>
          <div className="world-caption">
            <span>{game.mapId === "biche" ? "比奇省 · 荒野边境" : game.mapId === "mine" ? "比奇省 · 废矿深处" : chapter.name + " · 远征之地"}</span>
            <small>经典资源 / 幸存者玩法</small>
          </div>
          <footer className="lobby-footer">
            <span>
              {isGraybox
                ? "灰盒测试：原版图片、地图与音效未公开"
                : "原版素材来自 mir2x_res · 来源与版本已登记"}
            </span>
            <span>
              {isGraybox
                ? "先验证玩法与操作，视觉以本地原版资源版本为准"
                : "阶段测试版 · 项目所有人已确认素材授权"}
            </span>
          </footer>
        </>
      )}
      {active && (
        <>
          <header className="hud">
            <div className="wave-info">
              <span>
                {game.mapId === "biche" ? "比奇荒野" : chapter.name}{game.mode === "trial" ? " · 试玩" : ""}{" "}
                <b>
                  第 {game.wave} / {game.maxWaves} 波
                </b>
              </span>
              <strong>
                {time(Math.max(0, game.duration - game.waveTime))}
              </strong>
              <div className="bar wave">
                <i
                  style={{ width: `${(game.waveTime / game.duration) * 100}%` }}
                />
              </div>
            </div>
          </header>
          {boss && (
            <div className="boss-bar">
              <span>
                {bossName}{" "}
                <small>
                  {Math.ceil(boss.hp)} / {Math.ceil(boss.maxHp)}
                </small>
              </span>
              <div className="bar hp">
                <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="battle-location">
            <span>{game.mapId === "biche" ? "比奇荒野" : chapter.name}</span>
            <small>
              {time(game.clock)} / {game.mode === "trial" ? "01:45" : "15:00"}
            </small>
          </div>
          <section ref={battleConsole} className="classic-console" aria-label="经典战斗操作栏">
            <div className="vitals">
              {!isGraybox && <div className="classic-orb" aria-hidden="true">
                <img className="hp-half" src={assetUrl("ui/hp.png")} alt="" style={{clipPath:`inset(${(1-Math.max(0,game.player.hp/game.maxHP))*100}% 0 0 0)`}} />
                <img className="mp-half" src={assetUrl("ui/mp.png")} alt="" />
              </div>}
              <span className="class-seal">{game.classInfo.seal}</span>
              <div className="life-info"><span className="infinite-mp" title="本作无限MP">MP ∞</span>
                <div>
                  <strong>
                    {game.classInfo.name} <small>Lv.{game.level}</small>
                  </strong>
                  <span>
                    {Math.ceil(game.player.hp)} / {Math.ceil(game.maxHP)}
                  </span>
                </div>
                <div className="bar hp">
                  <i
                    style={{
                      width: `${Math.max(0, game.player.hp / game.maxHP) * 100}%`,
                    }}
                  />
                </div>
                <div className="bar xp" style={{"--xp-progress":`${Math.min(1,game.exp/expNeeded(game.level))*100}%`} as CSSProperties}>
                  <i
                    style={{
                      width: `${Math.min(1, game.exp / expNeeded(game.level)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="console-middle">
              <div className="console-readout"><span>{chapter.name} · {game.classInfo.name} Lv.{game.level}</span><span>金币 {game.gold}　击败 {game.kills}　经验 {Math.floor(game.exp/expNeeded(game.level)*100)}%</span></div>
          <div className="skill-dock">
            {Array.from({ length: game.maxSkills }, (_, i) => {
              const s = game.skills[i];
              const def = s ? getSkill(s.id) : null;
              return (
                <div
                  key={i}
                  className={"skill-slot " + (s ? "" : "vacant")}
                  title={def?.description ?? "尚未习得"}
                >
                  {s && def ? (
                    <>
                      {["teleport", "dash"].includes(s.id) ? (
                        <button
                          className="manual-skill"
                          aria-label={`施放${def.name}`}
                          disabled={s.cd > 0 || game.phase !== "battle"}
                          onClick={() => game.useManualSkill()}
                        >
                          <Icon frame={def.asset} />
                        </button>
                      ) : s.id === "poison" ? (
                        <button className="manual-skill"
                          aria-label={`切换为${game.tao.poisonMode === "green" ? "红" : "绿"}毒`}
                          disabled={game.phase !== "battle"}
                          onClick={() => game.setPoisonMode(game.tao.poisonMode === "green" ? "red" : "green")}>
                          <Icon frame={def.asset} />
                        </button>
                      ) : (
                        <Icon frame={def.asset} />
                      )}
                      <div>
                        <strong>{def.name}{s.id === "poison" ? ` · ${game.tao.poisonMode === "green" ? "绿毒" : "红毒"}` : ""}</strong>
                        <span>
                          Lv.{s.rank}{" "}
                          <em>
                            {def.passive
                              ? "常驻"
                              : (s.id === "powerstrike" ||
                                    s.id === "firesword") &&
                                  game.charges[s.id]
                                ? "蓄力"
                                : s.cd > 0
                                  ? s.cd.toFixed(1) + "s"
                                  : "就绪"}
                          </em>
                        </span>
                      </div>
                      <div
                        className="skill-cd"
                        style={{
                          transform: `scaleX(${def.passive ? 0 : Math.min(1, s.cd / def.cooldown)})`,
                        }}
                      />
                    </>
                  ) : (
                    <span>待习得</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="controls-hint">
            <span>
              WASD 移动 · Q 血瓶 · Alt 物品名{" "}
              <button
                className="audio-toggle"
                disabled={isGraybox}
                aria-label={
                  isGraybox
                    ? "此版未包含原版音效"
                    : sounds.muted
                      ? "开启原版音效"
                      : "关闭原版音效"
                }
                onClick={() => {
                  void sounds.unlock();
                  sounds.setMuted(!sounds.muted);
                  game.emit();
                }}
              >
                {isGraybox
                  ? "原版音效未公开"
                  : sounds.muted
                    ? "音效关"
                    : "音效开"}
              </button>
            </span>
            <span>
              {game.enemies.length} 怪物 · {frameMS.toFixed(1)} ms
            </span>
          </div>
            </div>
            <div className="hud-right">
              <span className="console-ac">{Math.round(game.stats.def_max ?? 0)}</span>
              <span className="console-dc">{Math.round(game.stats.dc_max ?? 0)}</span>
              <span className="wallet">◈ {game.gold}</span>
              <span className="kills">击败 {game.kills}</span>
              <button className="potion-use" aria-label="使用储备血瓶（Q）" disabled={game.phase!=="battle" || game.player.hp>=game.maxHP || !game.potions.reserve.length || game.potions.cd>0} title="最多储备3瓶；半血自动使用，Q可提前使用；间隔2秒" onClick={()=>game.useBloodPotion()}>
                <Icon frame="item/金创药（小）"/><span>{game.potions.cd>0 ? game.potions.cd.toFixed(1)+"s" : `Q ${game.potions.reserve.length}/3`}</span>
              </button>
              <button aria-label="查看装备与属性" onClick={toggleInventory}>
                {!isGraybox && <img src={assetUrl("ui/character.png")} alt="" />}<span>装备</span>
              </button>
              <button
                aria-label={game.phase === "paused" ? "继续战斗" : "暂停战斗"}
                onClick={() => game.pause()}
              >
                {game.phase === "paused" ? "继续" : "暂停"}
              </button>
            </div>
            <div className="console-mobile-actions">
              <button aria-label="使用储备血瓶（Q）" disabled={game.phase!=="battle" || game.player.hp>=game.maxHP || !game.potions.reserve.length || game.potions.cd>0} onClick={()=>game.useBloodPotion()}>{game.potions.cd>0 ? game.potions.cd.toFixed(1)+"s" : `血瓶 ${game.potions.reserve.length}/3`}</button>
              <button aria-label="查看装备与属性" onClick={toggleInventory}>装备</button>
              <button aria-label={game.phase==="paused" ? "继续战斗" : "暂停战斗"} onClick={()=>game.pause()}>{game.phase==="paused" ? "继续" : "暂停"}</button>
            </div>
          </section>
        </>
      )}
      {game.phase === "upgrade" && (
        <div className="modal-backdrop">
          <section
            className="upgrade modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
          >
            <div className="eyebrow">新的力量</div>
            <h2 id="upgrade-title">
              修行精进 <small>Lv.{game.level}</small>
            </h2>
            <p className="muted">选择一项强化，继续你的征途。</p>
            <div className="upgrade-grid">
              {game.choices.map((c, i) => (
                <button
                  key={c.id}
                  className={
                    "upgrade-card " + (c.kind === "skill" ? "skill-choice" : "")
                  }
                  onClick={() => game.choose(c.id)}
                >
                  <span className="choice-category">
                    {c.kind === "skill"
                      ? game.skills.some((s) => s.id === c.skill)
                        ? "技能强化"
                        : "习得技能"
                      : "通用强化"}
                    <kbd>{i + 1}</kbd>
                  </span>
                  <Icon frame={c.skill ? getSkill(c.skill).asset : undefined} />
                  <strong>{c.name}</strong>
                  <p>{c.description}</p>
                  <span className="choose">选择此项 →</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {game.phase === "replace" && game.pendingSkill && (
        <div className="modal-backdrop">
          <section
            className="modal replacement"
            role="dialog"
            aria-modal="true"
            aria-label="替换技能"
          >
            <div className="eyebrow">六槽取舍</div>
            <h2>习得{getSkill(game.pendingSkill).name}</h2>
            <p className="muted">选择替换一项技能。保留的技能强化不受影响。</p>
            <div className="replacement-grid">
              {game.skills.map((skill, index) => (
                <button key={skill.id} onClick={() => game.replaceSkill(index)}>
                  <Icon frame={getSkill(skill.id).asset} />
                  <strong>
                    {getSkill(skill.id).name} Lv.{skill.rank}
                  </strong>
                  <small>替换此技能</small>
                </button>
              ))}
            </div>
            <button
              className="secondary"
              onClick={() => game.replaceSkill(null)}
            >
              放弃本次新技能
            </button>
          </section>
        </div>
      )}
      {game.phase === "shop" && (
        <div className="modal-backdrop shop-backdrop">
          <section
            className="shop modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-title"
          >
            <header>
              <div>
                <div className="eyebrow">荒野行商</div>
                <h2 id="shop-title">片刻休整</h2>
                <p>
                  第 {game.wave} 波结束 · 击败 {game.lastWaveKills} · 获得{" "}
                  {game.lastWaveGold} 金币
                </p>
              </div>
              <div className="shop-wallet">
                <span>持有金币</span>
                <strong>◈ {game.gold}</strong>
              </div>
            </header>
            <div className="shop-toolbar">
              <p>已锁定 {2-game.shopLocksRemaining}/2 件 · 可保留到下波攒钱购买；装备会自动穿戴。</p>
              <button
                disabled={game.gold < game.cooldownCost}
                onClick={() => game.reroll()}
              >
                刷新商品 <b>◈ {game.cooldownCost}</b>
              </button>
            </div>
            <div className="shop-grid">
              {game.offers.map((o) => {
                const item = getItem(o.itemId);
                const replacing =
                  item.kind === "equipment"
                    ? game.equipment[game.equipmentSlot(item)]
                    : null;
                const preview=item.slot==="weapon" ? game.previewEquipment(item) : null;
                const beforeRange=primaryRange(game.classId,game.stats);
                const afterRange=preview ? primaryRange(game.classId,preview) : null;
                return (
                  <article
                    key={o.id}
                    className={
                      "shop-card tier-" + item.tier + (o.sold ? " sold" : "")
                    }
                  >
                    <div className="shop-card-top">
                      <small>
                        {item.kind === "equipment"
                          ? "经典装备"
                          : item.kind === "passive"
                            ? "无格道具"
                            : "消耗品"}
                      </small>
                      <button
                        disabled={o.sold || (!o.locked && game.shopLocksRemaining===0)}
                        className={o.locked ? "locked" : ""}
                        aria-label={`${o.locked ? "解锁" : "锁定"}${item.name}`}
                        onClick={() => game.lock(o.id)}
                      >
                        {o.locked ? "已锁定" : "锁定"}
                      </button>
                    </div>
                    <Icon frame={item.icon} />
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {afterRange && <small className="replace-hint">
                      {beforeRange.label}区间 {beforeRange.min}–{beforeRange.max} → {afterRange.min}–{afterRange.max}
                    </small>}
                    {replacing && (
                      <small className="replace-hint">
                        替换 {getItem(replacing.itemId).name}，回收{" "}
                        {sellPrice(
                          replacing.paid,
                          getItem(replacing.itemId).price,
                        )}{" "}
                        金币
                      </small>
                    )}
                    <button
                      className="buy"
                      disabled={
                        o.sold || game.gold < o.price || !game.validItem(item)
                      }
                      onClick={() => game.buy(o.id)}
                    >
                      {o.sold ? (
                        "已购买"
                      ) : !game.validItem(item) ? (
                        "已达上限"
                      ) : (
                        <>
                          购买 <b>◈ {o.price}</b>
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
            <Equipment sell />
            <div className="shop-bottom">
              <span>
                无格道具{" "}
                {Object.values(game.passives).reduce((a, b) => a + b, 0)} 件{" "}
                <button
                  className="text-button"
                  onClick={() => setInventory(true)}
                >
                  查看属性
                </button>
              </span>
              <button className="primary" onClick={() => game.nextWave()}>
                迎战第 {game.wave + 1} 波 <span>→</span>
              </button>
            </div>
          </section>
        </div>
      )}
      {game.phase === "paused" && !inventory && game.mode !== "test" && (
        <div className="modal-backdrop">
          <section
            className="pause modal"
            role="dialog"
            aria-modal="true"
            aria-label="战斗已暂停"
          >
            <div className="eyebrow">稍歇片刻</div>
            <h2>战斗已暂停</h2>
            <p>你的征途，会在这里等你。</p>
            <button className="primary" onClick={() => game.pause()}>
              继续战斗
            </button>
            <button
              className="secondary"
              onClick={() => {
                game.finish(false);
              }}
            >
              结束本局
            </button>
          </section>
        </div>
      )}
      {inventory && (
        <div className="modal-backdrop inventory-backdrop">
          <section
            className="inventory modal"
            role="dialog"
            aria-modal="true"
            aria-label="装备与属性"
          >
            <header>
              <h2>装备与修为</h2>
              <button onClick={closeInventory} aria-label="关闭装备面板">
                关闭 ×
              </button>
            </header>
            <Equipment sell={game.phase === "shop"} />
            <div className="stat-grid">
              {[
                ["最大生命", Math.ceil(game.maxHP)],
                ["移动速度", Math.round(game.moveSpeed) + " px/s"],
                ["攻击", `${game.stats.dc_min ?? 0}–${game.stats.dc_max ?? 0}`],
                [
                  "魔法",
                  `${(game.stats.mc_min ?? 0) + (game.stats.mc_flat ?? 0)}–${(game.stats.mc_max ?? 0) + (game.stats.mc_flat ?? 0)}`,
                ],
                ["道术", `${game.stats.sc_min ?? 0}–${game.stats.sc_max ?? 0}`],
                [
                  "防御",
                  `${(game.stats.def_min ?? 0) + (game.stats.def_flat ?? 0)}–${(game.stats.def_max ?? 0) + (game.stats.def_flat ?? 0)}`,
                ],
                [
                  "魔御",
                  `${(game.stats.mdef_min ?? 0) + (game.stats.mdef_flat ?? 0)}–${(game.stats.mdef_max ?? 0) + (game.stats.mdef_flat ?? 0)}`,
                ],
                ["准确", game.stats.accuracy ?? 90],
                ["幸运", game.stats.luck ?? 0],
                ["冷却缩减", (game.stats.cooldown_reduction ?? 0) + "%"],
                ["拾取半径", Math.round(game.pickupRadius) + " px"],
                ["侦测距离", Math.round(game.detectionRange) + " px"],
                [
                  game.classId === "warrior" ? "物理伤害" : game.classId === "taoist" ? "道术伤害" : "魔法伤害",
                  "+" +
                    (game.stats[
                      game.classId === "warrior"
                        ? "dc_bonus_pct"
                        : game.classId === "taoist" ? "sc_bonus_pct"
                        : "mc_bonus_pct"
                    ] ?? 0) +
                    "%",
                ],
                ["生命回复", (game.stats.hp_regen ?? 0) + "/s"],
                ["击杀回复", (game.stats.hp_on_kill ?? 0) + " 点/次"],
                ["生命偷取", (game.stats.lifesteal ?? 0) + "% · 法术按1/3"],
              ].map(([n, v]) => (
                <div key={n}>
                  <span>{n}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            {(game.stats.hp_on_kill || game.stats.lifesteal) ? <p>
              本局实际战斗回复：击杀 {game.combatRecovery.healing.onKill.toFixed(2)} 点 ·
              生命偷取 {game.combatRecovery.healing.lifeSteal.toFixed(2)} 点。
              击杀回复共享0.1秒冷却，每秒最多5点；无奖励援军不提供回复。
            </p> : null}
            {game.classId === "taoist" && (
              <div className="taoist-status">
                <h3>道士修为</h3>
                <label className="taoist-status-row">
                  <span>毒素模式</span>
                  <select aria-label="毒素模式" value={game.tao.poisonMode}
                    onChange={(e) => game.setPoisonMode(e.target.value as "green" | "red")}>
                    <option value="green">绿毒 · 持续伤害</option>
                    <option value="red">红毒 · 减防</option>
                  </select>
                </label>
                <label className="taoist-status-row">
                  <span>治疗优先级</span>
                  <select aria-label="治疗优先级" value={game.tao.healPriority}
                    onChange={(e) => game.setHealPriority(e.target.value as "self" | "pet")}>
                    <option value="self">优先自身</option>
                    <option value="pet">优先宝宝</option>
                  </select>
                </label>
                <div className="taoist-status-row">
                  <span>召唤宝宝</span>
                  <b>
                    {game.pets.filter((p) => p.hp > 0 && p.source === "skeleton").length}
                    骷髅 /
                    {game.pets.filter((p) => p.hp > 0 && p.source === "beast").length}
                    神兽
                  </b>
                </div>
                <p className="muted fine-print">习得施毒术或治愈术后生效。切换设置不消耗技能槽。</p>
              </div>
            )}
            <h3>
              无格道具 <small>同类合并显示</small>
            </h3>
            <div className="passive-list">
              {Object.keys(game.passives).length ? (
                Object.entries(game.passives).map(([id, n]) => (
                  <span key={id} title={getItem(id).description}>
                    {getItem(id).name} <b>×{n}</b>
                  </span>
                ))
              ) : (
                <p className="muted">尚未购买被动道具。</p>
              )}
            </div>
            <p className="muted fine-print">
              装备数值为本游戏设计值；穿脱装备会完整重算属性。全局 CD 缩减
              ≤40%，移速加成 ≤35%，拾取加成 ≤150%。
            </p>
          </section>
        </div>
      )}
      {(game.phase === "won" || game.phase === "dead") && game.result && (game.phase!=="dead" || game.player.hp>0 || settledRun===game.runId) && (
        <div className="modal-backdrop settlement-backdrop">
          <section
            className="settlement modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <div className="eyebrow">
              {game.mode === "trial" ? "短局试玩结束" : "本次征途已结束"}
            </div>
            <h2 id="result-title">
              {game.phase === "won" ? game.mapId === "biche" ? "荒野生还" : game.mapId === "mine" ? "矿洞生还" : "神殿生还" : game.player.hp<=0 ? "魂归玛法" : "远征止步"}
            </h2>
            <p>
              {game.phase === "won"
                ? game.mapId === "biche" ? "你穿过怪潮，迎来了荒野的晨光。" : game.mapId === "mine" ? "尸王倒下，旧矿道重新透进了微光。" : `${bossName}倒下，祭坛重新归于沉寂。`
                : game.player.hp === 0
                  ? "这次倒下，下一次再战。"
                  : `本局结束，${bossName}仍未被击败。`}
            </p>
            <div className="result-stats">
              {(game.result.healing?.bloodPotion??0)>0 && <div><b>{Math.round(game.result.healing!.bloodPotion)}</b><span>血瓶实际回复</span></div>}
              <div>
                <b>{game.kills}</b>
                <span>击败怪物</span>
              </div>
              <div>
                <b>{time(game.clock)}</b>
                <span>战斗时间</span>
              </div>
              <div>
                <b>{game.wave}</b>
                <span>到达波次</span>
              </div>
              <div>
                <b>{game.level}</b>
                <span>修行等级</span>
              </div>
            </div>
            <div className="damage-list">
              <p className="muted">
                伤害构成 · 战斗 {game.clock.toFixed(1)} 秒
                {game.rerolls ? ` · 商店刷新 ${game.rerolls} 次` : ""}
              </p>
              {damageRows(game.damageDealt, game.clock).map((row) => (
                <div key={row.id}>
                  <span>{row.name}</span>
                  <div className="damage-track">
                    <i style={{ width: `${row.share}%` }} />
                  </div>
                  <b>{Math.round(row.damage)}</b>
                  <em>
                    {dpsText(row.dps)}/秒 · {row.share.toFixed(0)}%
                  </em>
                </div>
              ))}
            </div>
            {purchaseRows(game.purchases).length > 0 && (
              <div className="purchase-list" aria-label="本局商店购买">
                <p className="muted">本局购买</p>
                {purchaseRows(game.purchases).map((row) => (
                  <div key={row.itemId}>
                    <span>{row.name}</span>
                    <b>×{row.count}</b>
                  </div>
                ))}
              </div>
            )}
            {statRows(game.stats).length > 0 && (
              <div className="stat-chips" aria-label="本局属性">
                {statRows(game.stats).map((row) => (
                  <span key={row.key}>
                    {row.name} {row.prefix}{Number(row.value.toFixed(1))}
                    {row.unit}
                  </span>
                ))}
              </div>
            )}
            {(game.combatRecovery.healing.onKill || game.combatRecovery.healing.lifeSteal) ? <p className="muted">
              本局实际战斗回复：击杀 {game.combatRecovery.healing.onKill.toFixed(2)} 点 ·
              生命偷取 {game.combatRecovery.healing.lifeSteal.toFixed(2)} 点
            </p> : null}
            <div className="damage-list" aria-label="本局实际承伤">
              <p className="muted">实际承伤：物理 {game.damageTaken.physical.toFixed(1)} · 法术 {game.damageTaken.magic.toFixed(1)}（累计HP扣除，回复不抵消）</p>
              {Object.entries(game.damageTaken.sources).sort((a,b)=>b[1]-a[1]).map(([source,value])=>
                <div key={source}><span>{damageSourceName(source)}</span><b>{value.toFixed(1)}</b></div>)}
            </div>
            <p className="muted">
              种子 {game.seed} ·{" "}
              {game.mode === "trial"
                ? "试玩模式不发放结晶"
                : `获得 ${game.result.crystals} 玛法结晶`}{" "}
              · {saveStatus}
            </p>
            {saveError && <p className="inline-error">{saveError}</p>}
            <div className="result-actions">
              <button className="primary" disabled={progressBusy} onClick={() => start(game.mode)}>
                再战一次
              </button>
              <button className="secondary" onClick={() => game.lobby()}>
                返回营地
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
function Equipment({ sell = false }: { sell?: boolean }) {
  return (
    <div className="equipment-strip">
      {SLOT_KEYS.map((slot: Slot) => {
        const e = game.equipment[slot],
          item = e ? getItem(e.itemId) : null;
        return (
          <div
            className={"equipment-slot " + (item ? "filled" : "")}
            key={slot}
            title={item?.description ?? SLOT_NAMES[slot]}
          >
            <small>{SLOT_NAMES[slot]}</small>
            <Icon frame={item?.icon} />
            <span>{item?.name ?? "未装备"}</span>
            {e && sell && (
              <button onClick={() => game.sell(slot)}>
                出售 +{sellPrice(e.paid, item!.price)}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
