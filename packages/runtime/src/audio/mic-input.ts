/**
 * MicAudioInput — captura amplitud del micrófono para alimentar
 * el uniform audioAmp del shader. Es opcional.
 */
export class MicAudioInput {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private smoothed = 0;
  private active = false;

  isActive(): boolean {
    return this.active;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioCtx = new Ctx();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.active = true;
  }

  async stop(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
    this.data = null;
    this.smoothed = 0;
    this.active = false;
  }

  async toggle(): Promise<void> {
    if (this.active) {
      await this.stop();
    } else {
      await this.start();
    }
  }

  sample(): number {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) sum += this.data[i] ?? 0;
    const avg = sum / this.data.length / 255;
    this.smoothed += (avg - this.smoothed) * 0.15;
    return this.smoothed;
  }

  private bands: [number, number, number] = [0, 0, 0];

  /**
   * P4/T-241 — descompone el espectro en 3 bandas normalizadas con smoothing:
   * graves / medios / agudos. fftSize 256 (bin ≈ 172 Hz a 44.1 kHz):
   * bass ≈ <520 Hz, mid ≈ 520 Hz–2.4 kHz, treble ≈ >2.4 kHz.
   */
  getBands(): [number, number, number] {
    if (!this.analyser || !this.data) return [0, 0, 0];
    this.analyser.getByteFrequencyData(this.data);
    const avg = (lo: number, hi: number): number => {
      let s = 0;
      for (let i = lo; i < hi; i++) s += this.data![i] ?? 0;
      return s / Math.max(hi - lo, 1) / 255;
    };
    const target = [avg(1, 3), avg(3, 14), avg(14, 64)];
    for (let i = 0; i < 3; i++) this.bands[i] += ((target[i] ?? 0) - (this.bands[i] ?? 0)) * 0.2;
    return [this.bands[0] ?? 0, this.bands[1] ?? 0, this.bands[2] ?? 0];
  }
}
