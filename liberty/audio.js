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

  function setMuted(val) {
    muted = !!val;
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
    haptic
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LIB_AUDIO;
