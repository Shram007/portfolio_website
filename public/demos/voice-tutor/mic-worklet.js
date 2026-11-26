// Captures the mic, resamples to 16 kHz mono int16 and posts ~100 ms chunks while recording.
// Also posts a peak level for the meter. On stop it flushes the tail, then posts {done: true}
// so the page knows every chunk was sent before it tells the server the turn ended.
const TARGET_RATE = 16000;
const CHUNK = 1600;

class MicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = false;
    this.ratio = sampleRate / TARGET_RATE;
    this.pos = 0;
    this.acc = 0;
    this.accN = 0;
    this.out = [];
    this.frames = 0;
    this.port.onmessage = (e) => {
      if (e.data.on) {
        this.on = true; this.pos = 0; this.acc = 0; this.accN = 0; this.out = [];
      } else if (this.on) {
        this.on = false;
        this.flush();
        this.port.postMessage({ done: true });
      }
    };
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let peak = 0;
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      if (this.on) {
        // Box-filter downsample: average the input samples that fall into each output sample.
        this.acc += v; this.accN++;
        this.pos += 1;
        if (this.pos >= this.ratio) {
          this.out.push(this.acc / this.accN);
          this.pos -= this.ratio; this.acc = 0; this.accN = 0;
        }
      }
    }
    if (this.on && this.out.length >= CHUNK) this.flush();
    if (++this.frames % 6 === 0) this.port.postMessage({ level: peak });
    return true;
  }

  flush() {
    if (!this.out.length) return;
    const pcm = new Int16Array(this.out.length);
    for (let i = 0; i < this.out.length; i++) {
      const s = Math.max(-1, Math.min(1, this.out[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.out = [];
    this.port.postMessage({ pcm: pcm.buffer }, [pcm.buffer]);
  }
}

registerProcessor("mic-capture", MicCapture);
