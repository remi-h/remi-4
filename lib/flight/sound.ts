import { LANDING, T } from './timeline';

/**
 * The cabin, synthesised with Web Audio so there are no files to load: flap clatter on the
 * board, the engines spooling up for takeoff and settling into a hum, and the seatbelt chime
 * as you take your seat. On by default; M or the sound button mutes it.
 */
export class CabinSound {
  private ctx?: AudioContext;
  private master?: GainNode;
  private engine?: GainNode;
  private filter?: BiquadFilterNode;
  private noise?: AudioBuffer;
  // On by default: it only ever starts from the visitor's click on board, and the board says how to mute.
  private on = true;

  get enabled() {
    return this.on;
  }

  setEnabled(on: boolean) {
    this.on = on;
    const ctx = this.ensure();
    void ctx.resume();
    this.master!.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.05);
  }

  /** Schedules the whole boarding soundtrack; `offset` skips into it (seconds). */
  board(offset = 0) {
    const ctx = this.ensure();
    void ctx.resume();
    const t0 = ctx.currentTime - offset;
    const at = (s: number) => Math.max(ctx.currentTime, t0 + s);

    if (offset < T.back) {
      for (let i = 0; i < 70; i++) this.click(at(0.1 + Math.random() * 1.6));
      for (let i = 0; i < 40; i++) this.click(at(T.back + Math.random() * 0.8));
    }
    const g = this.engine!.gain;
    const f = this.filter!.frequency;
    g.cancelScheduledValues(ctx.currentTime);
    f.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(offset < T.taxi ? 0 : 0.3, ctx.currentTime);
    f.setValueAtTime(380, ctx.currentTime);
    g.linearRampToValueAtTime(0.25, at(T.taxi + 0.8));
    g.linearRampToValueAtTime(0.5, at(T.lift + 0.5));
    f.linearRampToValueAtTime(900, at(T.vanish));
    g.linearRampToValueAtTime(0.9, at(T.vanish));
    // Inside the cabin: quieter and duller.
    g.linearRampToValueAtTime(0.3, at(T.introEnd));
    f.linearRampToValueAtTime(260, at(T.introEnd));
    this.chime(at(T.introEnd - 0.2));
  }

  /** Landing: the engines spool down, the chime, and the board clattering back to the page. */
  arrive() {
    const ctx = this.ensure();
    void ctx.resume();
    const t0 = ctx.currentTime;
    this.engine!.gain.cancelScheduledValues(t0);
    this.engine!.gain.setTargetAtTime(0, t0, 0.35);
    this.chime(t0 + 0.1);
    for (let i = 0; i < 60; i++) this.click(t0 + 0.6 + Math.random() * 1.4);
    for (let i = 0; i < 40; i++) this.click(t0 + 0.5 + LANDING.back + Math.random() * 0.7);
  }

  /** Straight to cruise: the hum only. */
  cruise() {
    const ctx = this.ensure();
    this.engine!.gain.cancelScheduledValues(ctx.currentTime);
    this.engine!.gain.setTargetAtTime(0.3, ctx.currentTime, 0.3);
    this.filter!.frequency.setTargetAtTime(260, ctx.currentTime, 0.3);
  }

  dispose() {
    void this.ctx?.close();
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.7 : 0;
    this.master.connect(ctx.destination);

    // Brown noise, looped: the engine.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 380;
    this.engine = ctx.createGain();
    this.engine.gain.value = 0;
    src.connect(this.filter).connect(this.engine).connect(this.master);
    src.start();
    return ctx;
  }

  private click(when: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200 + Math.random() * 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.5, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    src.connect(band).connect(g).connect(this.master!);
    src.start(when, Math.random(), 0.05);
  }

  private chime(when: number) {
    const ctx = this.ctx!;
    [1318.5, 1046.5].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = hz;
      const g = ctx.createGain();
      const t = when + i * 0.55;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(g).connect(this.master!);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  }
}
