import { useEffect, useRef, useState } from "react";
import { MAPS } from "./content";
import { MAX_BACKUP_BYTES } from "./save-format";
import { exportSave, exportRawSave, prepareRestore, restoreSave, hasRestorePoint, type RestorePreview, type Progress } from "./save";

function download(text: string, suffix: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `mafa-save-${suffix}-${Date.now()}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const mapNames = (progress: Progress) => progress.unlockedMaps.map(id => MAPS[id].name).join("、");
export function SaveManager({ onRestored, onBusyChange }: {
  onRestored: (progress: Progress) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [text, setText] = useState(""), [preview, setPreview] = useState<RestorePreview | null>(null);
  const [previous, setPrevious] = useState(false), [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false), previewHeading = useRef<HTMLHeadingElement>(null), editor = useRef<HTMLDetailsElement>(null);
  useEffect(() => { void hasRestorePoint().then(setPrevious).catch(() => {}); }, []);
  useEffect(() => {
    if (!preview) return;
    if (editor.current) editor.current.open = false;
    previewHeading.current?.focus();
    previewHeading.current?.scrollIntoView({ block: "start" });
  }, [preview]);
  const work = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError(""); setMessage("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "浏览器存储不可用，请重试。"); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  };
  const inspect = async (value?: string) => {
    setPreview(null); setConfirmed(false);
    const next = await prepareRestore(value); setPreview(next);
  };
  return <section className="save-manager" aria-label="存档备份与恢复" aria-busy={busy}>
    <h2>存档备份</h2>
    <p>保存全部战绩、玛法结晶、章节解锁与玛法天赋。备份不含续玩检查点；刷新后会回到本波起点，可从主菜单继续。</p>
    <div className="save-actions">
      <button disabled={busy} onClick={() => void work(async () => {
        const value = await exportSave(); setText(value); download(value, "backup");
        setMessage("已发起备份下载；也可展开下方内容复制保存。");
      })}>导出完整备份</button>
      <label className="save-file">选择备份文件<input type="file" accept=".json,application/json" disabled={busy}
        onChange={event => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (file) void work(async () => {
            setPreview(null); setConfirmed(false);
            if (file.size > MAX_BACKUP_BYTES) throw new Error("备份超过5MB，未修改本机存档。");
            const value = await file.text(); setText(value); await inspect(value);
          });
        }} /></label>
    </div>
    <details ref={editor} className="save-json"><summary>查看或粘贴备份JSON</summary>
      <label>备份内容<textarea value={text} disabled={busy} spellCheck={false} onChange={e => {
        setText(e.target.value); setPreview(null); setConfirmed(false);
      }} /></label>
      <button disabled={busy || !text.trim()} onClick={() => void work(() => inspect(text))}>预览备份内容</button>
    </details>
    {previous && <div className="save-actions">
      <button disabled={busy} onClick={() => void work(() => inspect())}>预览恢复前备份</button>
      <button disabled={busy} onClick={() => void work(async () => {
        download(await exportRawSave(true), "before-restore-raw"); setMessage("已发起恢复前原始数据下载；异常数据仅供保留排查。");
      })}>下载恢复前原始数据</button>
    </div>}
    {preview && <div className="save-preview">
      <h3 ref={previewHeading} tabIndex={-1}>确认恢复内容</h3>
      <p>备份时间：{new Date(preview.backup.exportedAt).toLocaleString()}</p>
      <table><thead><tr><th>项目</th><th>本机现在</th><th>恢复后</th></tr></thead><tbody>
        <tr><th>结晶</th><td>{preview.before.progress?.crystals ?? "异常／未初始化"}</td><td>{preview.backup.progress.crystals}</td></tr>
        <tr><th>战绩</th><td>{preview.before.runs} 条</td><td>{preview.backup.runs.length} 条</td></tr>
        <tr><th>章节</th><td>{preview.before.progress ? mapNames(preview.before.progress) : "异常／未初始化"}</td><td>{mapNames(preview.backup.progress)}</td></tr>
      </tbody></table>
      <p>完整替换本机存档，结晶不叠加。写入时自动保留一份恢复前数据；再次恢复会更新这份备份。</p>
      <label className="save-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />我确认替换本机存档</label>
      <div className="save-actions">
        <button disabled={busy || !confirmed} onClick={() => void work(async () => {
          const progress = await restoreSave(preview);
          setPreview(null); setConfirmed(false); setPrevious(true);
          await onRestored(progress); setMessage("存档已恢复，恢复前数据已保留。战绩和章节已更新。");
        })}>确认恢复存档</button>
        <button disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); }}>取消恢复</button>
      </div>
    </div>}
    {message && <p role="status">{message}</p>}
    {error && <><p className="inline-error" role="alert">{error}</p>
      <button disabled={busy} onClick={() => void work(async () => {
        download(await exportRawSave(), "rescue-raw"); setMessage("已发起本机原始数据下载；异常数据仅供保留排查。");
      })}>下载本机原始数据</button></>}
  </section>;
}
