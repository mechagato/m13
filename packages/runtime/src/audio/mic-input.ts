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
}
