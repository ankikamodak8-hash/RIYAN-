class FlightAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private muted = false;
  private initialized = false;
  private lastWarningTime = 0;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Continuous turbine / prop base oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 65;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 260;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.filterNode);
      this.filterNode.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Jet exhaust / airflow noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 420;
      noiseFilter.Q.value = 0.8;

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = 0;

      this.noiseNode.connect(noiseFilter);
      noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.ctx.destination);
      this.noiseNode.start();

      this.initialized = true;
    } catch {
      // Audio blocked or unavailable
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.ctx && this.engineGain && this.noiseGain) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  isMuted() {
    return this.muted;
  }

  update(throttle: number, afterburner: boolean, isProp: boolean, stallWarning: boolean, active: boolean) {
    if (!this.initialized || !this.ctx || !this.engineGain || !this.noiseGain || !this.engineOsc || !this.filterNode) {
      return;
    }
    if (this.ctx.state === 'suspended' && active && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.noiseGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const baseFreq = isProp ? 48 + throttle * 75 : 70 + throttle * 110;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.filterNode.frequency.setTargetAtTime(180 + throttle * (afterburner ? 900 : 480), now, 0.08);

    this.engineGain.gain.setTargetAtTime(0.015 + throttle * 0.035, now, 0.08);
    this.noiseGain.gain.setTargetAtTime(0.008 + throttle * (afterburner ? 0.095 : 0.045), now, 0.08);

    if (stallWarning && performance.now() - this.lastWarningTime > 700) {
      this.lastWarningTime = performance.now();
      this.playBeep(680, 0.09, 0.06);
    }
  }

  playBeep(freq = 520, duration = 0.08, volume = 0.05) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const flightAudio = new FlightAudioEngine();
