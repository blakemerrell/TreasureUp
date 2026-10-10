// Title of Liberty: Procedural Web Audio Engine
// Generates authentic RTS sound effects using native Web Audio oscillators and envelopes.
// 0 KB download, zero external dependencies, 100% offline, zero latency on mobile.

const LIB_AUDIO = (() => {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem('liberty_muted') === '1';
  } catch (e) {}

  function wake() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  let ambientNoiseNode = null;
  let ambientGain = null;
  let ambientFilter = null;
  let ambientRunning = false;

  function startAmbience() {
    if (muted || ambientRunning || typeof window === 'undefined') return;
    wake();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.05;
        b2 = 0.85 * b2 + white * 0.05;
        output[i] = (b0 + b1 + b2) * 0.35;
      }

      ambientNoiseNode = ctx.createBufferSource();
      ambientNoiseNode.buffer = noiseBuffer;
      ambientNoiseNode.loop = true;

      ambientFilter = ctx.createBiquadFilter();
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(280, ctx.currentTime);
      ambientFilter.Q.setValueAtTime(1.4, ctx.currentTime);

      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
      ambientGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.2);

      ambientNoiseNode.connect(ambientFilter).connect(ambientGain).connect(ctx.destination);
      ambientNoiseNode.start(0);
      ambientRunning = true;
    } catch (e) {}
  }

  function stopAmbience() {
    if (!ambientRunning) return;
    try {
      if (ambientGain && ctx) {
        ambientGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        setTimeout(() => {
          if (ambientNoiseNode) {
            try { ambientNoiseNode.stop(); ambientNoiseNode.disconnect(); } catch (e) {}
            ambientNoiseNode = null;
          }
          ambientRunning = false;
        }, 450);
      } else {
        if (ambientNoiseNode) {
          try { ambientNoiseNode.stop(); ambientNoiseNode.disconnect(); } catch (e) {}
          ambientNoiseNode = null;
        }
        ambientRunning = false;
      }
    } catch (e) {
      ambientRunning = false;
    }
  }

  function setMuted(val) {
    muted = !!val;
    if (muted) stopAmbience();
    else startAmbience();
    try {
      localStorage.setItem('liberty_muted', muted ? '1' : '0');
    } catch (e) {}
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function haptic(ms = 12) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  // Play a procedural sound effect by name
  function play(name) {
    if (muted) return;
    wake();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    switch (name) {
      case 'tap': {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.045);
        break;
      }
      case 'select': {
        haptic(8);
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.065);
        break;
      }
      case 'orderMove': {
        haptic(10);
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.09);
        break;
      }
      case 'orderAttack': {
        haptic(15);
        [330, 495].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, t + i * 0.02);
          osc.frequency.exponentialRampToValueAtTime(f * 1.2, t + i * 0.02 + 0.08);
          g.gain.setValueAtTime(0.07, t + i * 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.02 + 0.09);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.02); osc.stop(t + i * 0.02 + 0.1);
        });
        break;
      }
      case 'orderRetreat': {
        haptic(12);
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.13);
        break;
      }
      case 'build': {
        haptic(15);
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.07);
        break;
      }
      case 'constructComplete': {
        haptic(20);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t + i * 0.06);
          g.gain.setValueAtTime(0.08, t + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.14);
        });
        break;
      }
      case 'unitReady': {
        haptic(14);
        [440, 554.37, 659.25].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, t + i * 0.05);
          g.gain.setValueAtTime(0.06, t + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.12);
        });
        break;
      }
      case 'warHorn': {
        haptic(35);
        const o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sawtooth';
        o1.frequency.setValueAtTime(196, t);
        o1.frequency.linearRampToValueAtTime(220, t + 0.15);
        o1.frequency.linearRampToValueAtTime(196, t + 0.45);
        g1.gain.setValueAtTime(0.001, t);
        g1.gain.linearRampToValueAtTime(0.14, t + 0.08);
        g1.gain.linearRampToValueAtTime(0.12, t + 0.35);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o1.connect(g1).connect(ctx.destination);
        o1.start(t); o1.stop(t + 0.52);

        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(98, t);
        g2.gain.setValueAtTime(0.001, t);
        g2.gain.linearRampToValueAtTime(0.15, t + 0.08);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o2.connect(g2).connect(ctx.destination);
        o2.start(t); o2.stop(t + 0.52);
        break;
      }
      case 'baseAttack': {
        haptic(25);
        [0, 0.12].forEach(dt => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, t + dt);
          osc.frequency.exponentialRampToValueAtTime(440, t + dt + 0.09);
          g.gain.setValueAtTime(0.12, t + dt);
          g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.1);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + dt); osc.stop(t + dt + 0.11);
        });
        break;
      }
      case 'combatHit': {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.05);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.055);
        break;
      }
      case 'miracle': {
        haptic(30);
        [523.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + i * 0.04);
          g.gain.setValueAtTime(0.001, t + i * 0.04);
          g.gain.linearRampToValueAtTime(0.07, t + i * 0.04 + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.45);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.5);
        });
        break;
      }
      case 'plantStandard': {
        haptic(45);
        // Sacred Moroni Fanfare: Alma 46:12 Title of Liberty
        // Dual brass horns (C4, G4, C5, E5, G5, C6) with golden temple chimes
        const chord = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.5];
        chord.forEach((f, i) => {
          // Brass horn tone
          const o1 = ctx.createOscillator(), g1 = ctx.createGain();
          o1.type = 'sawtooth';
          o1.frequency.setValueAtTime(f, t + i * 0.07);
          o1.frequency.linearRampToValueAtTime(f * 1.01, t + i * 0.07 + 0.35);
          g1.gain.setValueAtTime(0.001, t + i * 0.07);
          g1.gain.linearRampToValueAtTime(0.09, t + i * 0.07 + 0.05);
          g1.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.65);
          o1.connect(g1).connect(ctx.destination);
          o1.start(t + i * 0.07); o1.stop(t + i * 0.07 + 0.7);

          // Golden bell chime
          const o2 = ctx.createOscillator(), g2 = ctx.createGain();
          o2.type = 'sine';
          o2.frequency.setValueAtTime(f * 2, t + i * 0.07);
          g2.gain.setValueAtTime(0.001, t + i * 0.07);
          g2.gain.linearRampToValueAtTime(0.06, t + i * 0.07 + 0.02);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.5);
          o2.connect(g2).connect(ctx.destination);
          o2.start(t + i * 0.07); o2.stop(t + i * 0.07 + 0.55);
        });
        break;
      }
      case 'cartStakes': {
        haptic(16);
        // Wooden stakes splintering and impaling ground
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(340, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.08);
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.095);
        break;
      }
      case 'cartFlingStone': {
        haptic(14);
        // Whoosh of stone thrown from wagon
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.linearRampToValueAtTime(320, t + 0.06);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.16);
        break;
      }
      case 'cartSpeedBurst': {
        haptic(15);
        // Whip crack and gallop rush
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.07);
        g.gain.setValueAtTime(0.11, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.085);
        break;
      }
      case 'scytheSlash': {
        haptic(10);
        // Whistling curved blade slice
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(720, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.09);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.095);
        break;
      }
      case 'industrySaw': {
        // Sawmill timber cutting hum
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.linearRampToValueAtTime(125, t + 0.12);
        osc.frequency.linearRampToValueAtTime(105, t + 0.25);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'industryChisel': {
        // Quarry limestone stone clink
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.075);
        break;
      }
      case 'industryAnvil': {
        // Blacksmith iron forge ping
        [1174.66, 2349.32].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.06 / (i + 1), t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.connect(g).connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.25);
        });
        break;
      }
      case 'upgradeCheer': {
        haptic(25);
        // Triumphant stronghold upgrade fanfare
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t + i * 0.06);
          g.gain.setValueAtTime(0.08, t + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.28);
        });
        break;
      }
      case 'cartDock': {
        haptic(16);
        // Heavy wooden cart braking and creaking into the depot dock
        const o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sawtooth';
        o1.frequency.setValueAtTime(95, t);
        o1.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g1.gain.setValueAtTime(0.12, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        o1.connect(g1).connect(ctx.destination);
        o1.start(t); o1.stop(t + 0.14);

        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(150, t);
        o2.frequency.linearRampToValueAtTime(180, t + 0.04);
        o2.frequency.exponentialRampToValueAtTime(60, t + 0.15);
        g2.gain.setValueAtTime(0.08, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o2.connect(g2).connect(ctx.destination);
        o2.start(t); o2.stop(t + 0.16);
        break;
      }
      case 'cartUnload': {
        haptic(22);
        // Tumbling cargo sliding down chute into storehouse with rewarding ding
        [160, 130, 100, 80].forEach((f, i) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, t + i * 0.04);
          osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + i * 0.04 + 0.06);
          g.gain.setValueAtTime(0.07, t + i * 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.07);
          osc.connect(g).connect(ctx.destination);
          osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.08);
        });
        // Resource treasure ping
        const p1 = ctx.createOscillator(), pg = ctx.createGain();
        p1.type = 'sine';
        p1.frequency.setValueAtTime(987.77, t + 0.18); // B5
        p1.frequency.setValueAtTime(1318.51, t + 0.24); // E6
        pg.gain.setValueAtTime(0.001, t + 0.18);
        pg.gain.linearRampToValueAtTime(0.09, t + 0.24);
        pg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        p1.connect(pg).connect(ctx.destination);
        p1.start(t + 0.18); p1.stop(t + 0.46);
        break;
      }
      case 'harvestScythe': {
        // Soft rustle of scythe slicing wheat
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.07);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.075);
        break;
      }
      case 'harvestChop': {
        // Axe chopping timber
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.085);
        break;
      }
      case 'harvestPick': {
        // Chisel / pickaxe striking limestone
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1864, t);
        osc.frequency.exponentialRampToValueAtTime(740, t + 0.05);
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.065);
        break;
      }
      case 'cohortHorn': {
        haptic(35);
        // Ancient Nephite War Trumpet / Shofar rally call (Alma 43)
        [220, 277.18, 329.63, 440].forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f, t + i * 0.09);
          o.frequency.linearRampToValueAtTime(f * 1.02, t + i * 0.09 + 0.2);
          g.gain.setValueAtTime(0.001, t + i * 0.09);
          g.gain.linearRampToValueAtTime(0.12, t + i * 0.09 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.35);
          o.connect(g).connect(ctx.destination);
          o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.38);
        });
        break;
      }
    }
  }

  // Native speech synthesis tactical RTS voice announcer & unit callouts
  let speechVoice = null;
  let voiceReady = false;

  function initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        speechVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Siri') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))) ||
                      voices.find(v => v.lang.startsWith('en')) || voices[0];
        voiceReady = true;
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    initVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = initVoices;
    }
  }

  let lastSpokenText = '';
  let lastSpokenTime = 0;

  function speak(text, pitch = 1.0, rate = 1.05) {
    if (muted || typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = Date.now();
    if (text === lastSpokenText && now - lastSpokenTime < 3500) return;
    lastSpokenText = text;
    lastSpokenTime = now;

    try {
      if (!voiceReady) initVoices();
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      if (speechVoice) utt.voice = speechVoice;
      utt.pitch = pitch;
      utt.rate = rate;
      utt.volume = 0.85;
      window.speechSynthesis.speak(utt);
    } catch (e) {}
  }

  function announce(event, detail) {
    if (muted) return;
    switch (event) {
      case 'buildDone':
        play('constructComplete');
        speak('Construction complete.');
        break;
      case 'unitReady':
        play('unitReady');
        speak((detail || 'Unit') + ' ready.');
        break;
      case 'baseAttack':
        play('warHorn');
        speak('Our people are under attack!');
        break;
      case 'valor':
        play('miracle');
        speak('A soldier has earned valor.');
        break;
      case 'deploy':
        play('constructComplete');
        speak('The standard of liberty is planted.');
        break;
      case 'fallback':
        play('orderRetreat');
        speak('Fall back! Retreat to the city.');
        break;
      case 'miracle':
        play('miracle');
        speak('Holy power invoked.');
        break;
    }
  }

  function unitAcknowledge(u, orderType) {
    if (muted || !u) return;
    const def = u.def || {};
    if (def.hero) {
      const phrases = ['In memory of our God and our freedom!', 'Stand firm!', 'For the title of liberty!', 'Advance!'];
      const text = phrases[Math.floor(Math.random() * phrases.length)];
      speak(text, 0.95, 1.0);
      return;
    }
    if (def.ranged) {
      if (orderType === 'attack') {
        const phrases = ['Bows drawn!', 'Aim true!', 'Releasing!'];
        speak(phrases[Math.floor(Math.random() * phrases.length)], 1.1, 1.1);
      } else {
        const phrases = ['Moving out.', 'Taking position.', 'Bows ready.'];
        speak(phrases[Math.floor(Math.random() * phrases.length)], 1.05, 1.05);
      }
      return;
    }
    if (def.soldier) {
      if (orderType === 'attack') {
        const phrases = ['Charge!', 'To the standard!', 'Strike!'];
        speak(phrases[Math.floor(Math.random() * phrases.length)], 1.0, 1.1);
      } else {
        const phrases = ['Understood.', 'Hold the line.', 'Advancing.'];
        speak(phrases[Math.floor(Math.random() * phrases.length)], 0.98, 1.05);
      }
      return;
    }
    if (def.builds || def.gathers) {
      const phrases = ['Right away.', 'At once.', 'On it.'];
      speak(phrases[Math.floor(Math.random() * phrases.length)], 1.05, 1.1);
      return;
    }
  }

  return {
    wake,
    play,
    speak,
    announce,
    unitAcknowledge,
    setMuted,
    toggleMute,
    isMuted,
    startAmbience,
    stopAmbience,
    haptic
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LIB_AUDIO;
