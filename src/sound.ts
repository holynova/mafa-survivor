import { assetUrl, isGraybox } from "./release";
type AudioManifest = {
  mapping: Record<string, string>;
  files: Record<string, unknown>;
};
export class OriginalSounds {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private manifest: AudioManifest | null = null;
  private loading: Promise<void> | null = null;
  private voices = 0;
  private feedback:AudioBufferSourceNode|null=null;
  playedByKey:Record<string,number>={};
  muted = false;
  volume = 0.35;
  played = 0;
  error = "";
  private last = new Map<string, number>();
  get status() {
    if (isGraybox) return "灰盒版不包含原版音效";
    return (
      this.error ||
      (this.context?.state === "running"
        ? "原版音效已解锁"
        : "等待点击解锁音效")
    );
  }
  async unlock() {
    if (isGraybox) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.context.destination);
      }
      await this.context.resume();
      this.loading ??= this.load();
      await this.loading;
    } catch {
      this.error = "音效加载失败，请刷新重试";
    }
  }
  private async load() {
    const r = await fetch(assetUrl("audio/manifest.json"));
    if (!r.ok) throw new Error("audio manifest");
    this.manifest = await r.json();
    await Promise.all(
      Object.keys(this.manifest!.files).map(async (file) => {
        const r = await fetch(assetUrl("audio/" + file));
        if (!r.ok) throw new Error(file);
        this.buffers.set(
          file,
          await this.context!.decodeAudioData(await r.arrayBuffer()),
        );
      }),
    );
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.gain) this.gain.gain.value = value ? 0 : this.volume;
  }
  play(key: string) {
    const critical=key==="hurt" || key==="death";
    if (
      !this.context ||
      this.context.state !== "running" ||
      this.muted ||
      (!critical && this.voices >= 8)
    )
      return;
    const file = this.manifest?.mapping[key],
      buffer = file ? this.buffers.get(file) : undefined;
    if (!buffer) return;
    const now = this.context.currentTime;
    if (now - (this.last.get(key) ?? -10) < 0.09) return;
    this.last.set(key, now);
    if(critical)this.feedback?.stop();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain!);
    this.voices++;
    this.played++;
    this.playedByKey[key]=(this.playedByKey[key]??0)+1;
    if(critical)this.feedback=source;
    source.onended = () => {
      this.voices--;
      if(this.feedback===source)this.feedback=null;
      source.disconnect();
    };
    source.start();
  }
}
export const sounds = new OriginalSounds();
