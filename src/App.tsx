import { useEffect, useReducer, useState, useRef } from "react";
import { game, type Mode, type RunResult } from "./game";
import {
  SKILLS,
  SLOT_KEYS,
  SLOT_NAMES,
  STAT_NAMES,
  getItem,
  getSkill,
  type Slot,
} from "./content";
import {
  assets,
  isReady,
  readyListeners,
  frameMS,
  setAssetManifest,
} from "./renderer";
import { CLASSES, CLASS_IDS } from "./classes";
import { expNeeded, sellPrice } from "./rules";
import { saveRun, history } from "./save";
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
        backgroundImage: `url(/assets/mir/${assets.pages.find((p) => p.key === f.texture)!.image})`,
        backgroundPosition: `-${atlasPosition(frame!).x}px -${atlasPosition(frame!).y}px`,
      }}
    />
  );
}
let framePositions: Record<string, { x: number; y: number }> = {};
export async function loadArtPositions() {
  const r = await fetch("/assets/mir/manifest.json");
  if (!r.ok) throw new Error("无法读取素材清单");
  const manifest = await r.json();
  setAssetManifest(manifest);
  framePositions = {};
  await Promise.all(
    manifest.pages.map(async (page: { data: string }) => {
      const response = await fetch("/assets/mir/" + page.data);
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
              href={"/assets/mir/" + page.image}
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
  const [tab, setTab] = useState<"play" | "guide" | "records" | "skills">(
    "play",
  );
  const [inventory, setInventory] = useState(false);
  const [seed, setSeed] = useState("176");
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const inventoryResumes = useRef(false);
  useEffect(() => game.subscribe(refresh), []);
  useEffect(() => {
    const f = () => {
      setReady(true);
    };
    readyListeners.add(f);
    const fail = () => setAssetError(true);
    document.addEventListener("asset-error", fail);
    history()
      .then(setRecords)
      .catch(() => setSaveError("无法读取本地记录，当前仍可正常试玩。"));
    return () => {
      readyListeners.delete(f);
      document.removeEventListener("asset-error", fail);
    };
  }, []);
  useEffect(() => {
    if (!game.result) return;
    setSaveStatus("正在保存…");
    saveRun(game.result)
      .then(() => {
        setSaveStatus("战绩已保存到本机");
        return history();
      })
      .then(setRecords)
      .catch(() => {
        setSaveStatus("保存未成功");
        setSaveError("浏览器存储不可用，本次战绩尚未保存。");
      });
  }, [game.result]);
  const start = (mode: Mode) => {
    setInventory(false);
    setSaveError("");
    setSaveStatus("");
    game.start(mode, Number(seed) >>> 0);
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
  return (
    <main>
      <div className="vignette" />
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
            开发预览 <span>02 / 法师与战士</span>
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
              {(["play", "guide", "records", "skills"] as const).map((t, i) => (
                <button
                  key={t}
                  className={tab === t ? "selected" : ""}
                  onClick={() => setTab(t)}
                >
                  {["踏入荒野", "行前须知", "征战记录", "技能图鉴"][i]}
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
                <div className="chapter">
                  <span>第一章</span>
                  <h2>比奇荒野</h2>
                  <p>
                    稻草人游荡在旧路旁。带上熟悉的招式，
                    <br />
                    在怪潮中收集经验，找回熟悉的力量。
                  </p>
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
                <div className="mode-buttons">
                  <button
                    className="primary"
                    disabled={!ready || assetError}
                    onClick={() => start("normal")}
                  >
                    {ready ? "进入荒野" : "正在载入原版素材…"}
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
                  法师 14 项、战士 6 项技能已开放，单局最多装备 6
                  项。普通攻击独立于技能槽；空格可触发瞬移或冲撞。道士仍在开发。
                </p>
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
                {records.length ? (
                  records.map((r) => (
                    <article key={r.runId}>
                      <div>
                        <strong>
                          {r.won ? "生还" : "陨落"} ·{" "}
                          {r.mode === "trial" ? "短局试玩" : "比奇荒野"}
                        </strong>
                        <span>
                          {CLASSES[r.classId ?? "wizard"].name} · 第 {r.wave} 波
                          · 击败 {r.kills} · Lv.{r.level}
                        </span>
                      </div>
                      <b>{time(r.seconds)}</b>
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
            <span>比奇省 · 荒野边境</span>
            <small>经典资源 / 幸存者玩法</small>
          </div>
          <footer className="lobby-footer">
            <span>原版素材来自 mir2x_res · 来源与版本已登记</span>
            <span>本地研究预览 · 素材分发授权待核验</span>
          </footer>
        </>
      )}
      {active && (
        <>
          <header className="hud">
            <div className="vitals">
              <span className="class-seal">{game.classInfo.seal}</span>
              <div className="life-info">
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
                <div className="bar xp">
                  <i
                    style={{
                      width: `${Math.min(1, game.exp / expNeeded(game.level)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="wave-info">
              <span>
                {game.mode === "trial" ? "短局试玩" : "比奇荒野"}{" "}
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
            <div className="hud-right">
              <span className="wallet">◈ {game.gold}</span>
              <span className="kills">击败 {game.kills}</span>
              <button aria-label="查看装备与属性" onClick={toggleInventory}>
                装备
              </button>
              <button
                aria-label={game.phase === "paused" ? "继续战斗" : "暂停战斗"}
                onClick={() => game.pause()}
              >
                {game.phase === "paused" ? "继续" : "暂停"}
              </button>
            </div>
          </header>
          {boss && (
            <div className="boss-bar">
              <span>
                骷髅精灵{" "}
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
            <span>比奇荒野</span>
            <small>
              {time(game.clock)} / {game.mode === "trial" ? "01:45" : "15:00"}
            </small>
          </div>
          <div className="skill-dock">
            {Array.from({ length: 6 }, (_, i) => {
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
                      ) : (
                        <Icon frame={def.asset} />
                      )}
                      <div>
                        <strong>{def.name}</strong>
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
            <span>WASD 移动 · 自动施法</span>
            <span>
              {game.enemies.length} 怪物 · {frameMS.toFixed(1)} ms
            </span>
          </div>
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
              <p>锁定商品可跨刷新与波次保留；购买装备会自动穿戴。</p>
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
                        disabled={o.sold}
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
      {game.phase === "paused" && !inventory && (
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
                [
                  game.classId === "warrior" ? "物理伤害" : "魔法伤害",
                  "+" +
                    (game.stats[
                      game.classId === "warrior"
                        ? "dc_bonus_pct"
                        : "mc_bonus_pct"
                    ] ?? 0) +
                    "%",
                ],
                ["生命回复", (game.stats.hp_regen ?? 0) + "/s"],
              ].map(([n, v]) => (
                <div key={n}>
                  <span>{n}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
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
      {(game.phase === "won" || game.phase === "dead") && game.result && (
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
              {game.phase === "won" ? "荒野生还" : "魂归玛法"}
            </h2>
            <p>
              {game.phase === "won"
                ? "你穿过怪潮，迎来了荒野的晨光。"
                : game.player.hp === 0
                  ? "这次倒下，下一次再战。"
                  : "时间已尽，骷髅精灵仍在荒野徘徊。"}
            </p>
            <div className="result-stats">
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
              {Object.entries(game.damageDealt).map(([id, value]) => (
                <div key={id}>
                  <span>
                    {SKILLS.find((s) => s.id === id)?.name ??
                      (id === "basic" ? "普通攻击" : id)}
                  </span>
                  <div className="damage-track">
                    <i
                      style={{
                        width: `${(value / Math.max(1, ...Object.values(game.damageDealt))) * 100}%`,
                      }}
                    />
                  </div>
                  <b>{Math.round(value)}</b>
                </div>
              ))}
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
              <button className="primary" onClick={() => start(game.mode)}>
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
