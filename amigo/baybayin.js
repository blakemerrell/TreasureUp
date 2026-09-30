// Amigo · Kaibigan: Baybayin, the script Tagalog was written in before the
// Spanish came (often called alibata). Seventeen characters, each a
// consonant with "a", or a vowel on its own. A mark above (kudlit) makes it
// e or i, a mark below makes it o or u, and the cross (krus-kudlit) drops
// the vowel. Words are spelled the way they sound: letters Baybayin never
// had become the nearest sound it did (Blake → Bleyk).
// Tested by tools/test-amigo.mjs.
(function (root) {
  'use strict';

  const CHARS = { a: 'ᜀ', i: 'ᜁ', u: 'ᜂ', k: 'ᜃ', g: 'ᜄ', ng: 'ᜅ', t: 'ᜆ', d: 'ᜇ', n: 'ᜈ', p: 'ᜉ', b: 'ᜊ', m: 'ᜋ', y: 'ᜌ', l: 'ᜎ', w: 'ᜏ', s: 'ᜐ', h: 'ᜑ' };
  const KUDLIT_I = 'ᜒ', KUDLIT_U = 'ᜓ', KRUS = '᜔';
  const VOWEL = { a: 'a', e: 'i', i: 'i', o: 'u', u: 'u' };
  // Two short words are written the old way, not letter by letter.
  const WHOLE = { ng: [CHARS.n + CHARS.ng, ['na', 'nga']], mga: [CHARS.m + CHARS.ng, ['ma', 'nga']] };
  // How each character sounds, for the chart and the lessons.
  const SOUND = { a: 'a', i: 'e/i', u: 'o/u', k: 'ka', g: 'ga', ng: 'nga', t: 'ta', d: 'da/ra', n: 'na', p: 'pa', b: 'ba', m: 'ma', y: 'ya', l: 'la', w: 'wa', s: 'sa', h: 'ha' };
  const ORDER = ['a', 'i', 'u', 'k', 'g', 'ng', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'l', 'w', 's', 'h'];

  // "Kaibigan" -> { text: 'ᜃᜁᜊᜒᜄᜈ᜔', parts: ['ka', 'i', 'bi', 'ga', 'n'], used: … }
  function spell(raw) {
    const words = String(raw || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
    const text = [], parts = [], used = { chars: new Set(), kudlit: false, krus: false };
    words.forEach((word, w) => {
      if (w) text.push(' ');
      if (WHOLE[word]) { text.push(WHOLE[word][0]); parts.push(...WHOLE[word][1]); used.chars.add(word === 'ng' ? 'n' : 'm'); used.chars.add('ng'); return; }
      const s = word.replace(/ñ/g, 'ny').replace(/ch/g, 'ts').replace(/c(?=[ei])/g, 's').replace(/qu/g, 'k').replace(/[cq]/g, 'k').replace(/x/g, 'ks')
        .replace(/f/g, 'p').replace(/v/g, 'b').replace(/z/g, 's').replace(/j/g, 'h').replace(/r/g, 'd').replace(/[^a-z]/g, '');
      for (let i = 0; i < s.length;) {
        const ch = s[i];
        if (VOWEL[ch]) { const v = VOWEL[ch]; text.push(CHARS[v]); parts.push(ch); used.chars.add(v); i++; continue; }
        const c = s.startsWith('ng', i) ? 'ng' : ch, len = c.length;
        if (!CHARS[c]) { i += len; continue; }                // a letter with no sound of its own
        const v = s[i + len];
        used.chars.add(c);
        if (v && VOWEL[v]) {
          const mark = VOWEL[v] === 'i' ? KUDLIT_I : VOWEL[v] === 'u' ? KUDLIT_U : '';
          if (mark) used.kudlit = true;
          text.push(CHARS[c] + mark); parts.push(c + v); i += len + 1;
        } else {
          used.krus = true;
          text.push(CHARS[c] + KRUS); parts.push(c); i += len;
        }
      }
    });
    return { text: text.join(''), parts, used };
  }

  // The lessons: a few characters at a time, then the marks. Each one's
  // reading words use only what has been learned by then.
  const LESSONS = [
    { id: 'b1', title: 'A, E/I, O/U, Ka, Ma', chars: ['a', 'i', 'u', 'k', 'm'] },
    { id: 'b2', title: 'Ta, Na, Ba', chars: ['t', 'n', 'b'] },
    { id: 'b3', title: 'Sa, La, Ga', chars: ['s', 'l', 'g'] },
    { id: 'b4', title: 'Pa, Ya, Ha, Da, Wa, Nga', chars: ['p', 'y', 'h', 'd', 'w', 'ng'] },
    { id: 'b5', title: 'The marks for e/i and o/u', kudlit: true },
    { id: 'b6', title: 'The cross: no vowel', krus: true },
  ];
  // What lesson n allows: every character up to it, and the marks once taught.
  function allowed(n) {
    const chars = new Set(LESSONS.slice(0, n + 1).flatMap(l => l.chars || []));
    return { chars, kudlit: LESSONS.slice(0, n + 1).some(l => l.kudlit), krus: LESSONS.slice(0, n + 1).some(l => l.krus) };
  }
  const fits = (word, a) => { const u = spell(word).used; return [...u.chars].every(c => a.chars.has(c)) && (!u.kudlit || a.kudlit) && (!u.krus || a.krus); };
  // The first lesson a word can be read in.
  const firstLesson = word => LESSONS.findIndex((_, n) => fits(word, allowed(n)));

  function rng(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function shuffled(list, seed) {
    const r = rng(seed), out = list.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const others = (list, not, k, seed) => shuffled(list.filter(x => x !== not), seed).slice(0, k);

  // Lesson n's steps. words: [[tagalog, english]] that Blake has checked.
  function lessonSteps(n, words, seed) {
    const L = LESSONS[n], a = allowed(n), steps = [], s = (seed || '') + ':' + L.id;
    const known = [...a.chars];
    if (L.chars) {
      for (const c of L.chars) {
        steps.push({ type: 'bsound', glyph: CHARS[c], right: SOUND[c], choices: shuffled([SOUND[c], ...others(known.map(k => SOUND[k]), SOUND[c], 2, s + c)], s + c + 's') });
        steps.push({ type: 'bglyph', sound: SOUND[c], right: CHARS[c], choices: shuffled([CHARS[c], ...others(known.map(k => CHARS[k]), CHARS[c], 2, s + c + 'g')], s + c + 'G') });
      }
    } else if (L.kudlit) {
      for (const [c, v] of [['k', 'i'], ['k', 'u'], ['b', 'i'], ['m', 'u'], ['l', 'u']]) {
        const glyph = CHARS[c] + (v === 'i' ? KUDLIT_I : KUDLIT_U), sound = c + (v === 'i' ? 'e/' + c + 'i' : 'o/' + c + 'u');
        const near = [c + 'a', c + (v === 'i' ? 'o/' + c + 'u' : 'e/' + c + 'i')];
        steps.push({ type: 'bsound', glyph, right: sound, choices: shuffled([sound, ...near], s + glyph) });
      }
    } else if (L.krus) {
      for (const c of ['k', 't', 'n', 'y']) {
        const glyph = CHARS[c] + KRUS;
        steps.push({ type: 'bsound', glyph, right: c, choices: shuffled([c, c + 'a', c + 'i'], s + glyph) });
      }
    }
    // Reading: words that need what this lesson taught, then any that fit.
    const readable = words.filter(([w]) => fits(w, a));
    const fresh = readable.filter(([w]) => firstLesson(w) === n), pool = fresh.length >= 3 ? fresh : readable;
    // With few words yet, the other choices are near misses made of what's
    // been taught (ama: ima, aka…), so each character still has to be read.
    const syllables = [...a.chars].map(c => VOWEL[c] ? c : c + 'a');
    const nearMisses = w => {
      const parts = spell(w).parts, out = new Set();
      parts.forEach((p, i) => syllables.forEach(x => { if (x !== p) out.add(parts.map((q, j) => j === i ? x : q).join('')); }));
      out.delete(w);
      return [...out];
    };
    for (const [w, en] of shuffled(pool, s + 'read').slice(0, 4)) {
      const real = readable.map(x => x[0]).filter(x => x !== w);
      const wrong = others(real.length >= 2 ? real : real.concat(nearMisses(w).filter(x => !real.includes(x))), w, 2, s + w);
      steps.push({ type: 'bread', glyph: spell(w).text, right: w, en, choices: shuffled([w, ...wrong], s + w + 'r') });
    }
    return steps;
  }

  const API = { CHARS, SOUND, ORDER, LESSONS, KRUS, KUDLIT_I, KUDLIT_U, spell, allowed, fits, firstLesson, lessonSteps };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AMIGO_BAYBAYIN = API;
})(this);
