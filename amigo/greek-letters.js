// Wika: the Greek letters, a side quest like Baybayin and the alef-bet. The
// New Testament was written in Greek; its 24 letters are in five short
// lessons, each letter by sight and by name, then words to read: the weeks'
// Greek treasure words where the letters taught allow, else a few well-known
// Bible words (FIXED, each checked against STEPBible's Greek lexicon, TBESG,
// by tools/test-amigo.mjs where it has the file). A writer spells a name in
// Greek letters by its sound.
// Tested by tools/test-amigo.mjs.
(function (root) {
  'use strict';

  // Each letter: capital, small, name, sound (the way it's taught for Bible
  // Greek), and its name in Greek as Greeks say it today (the recordings).
  const LETTERS = [
    ['alpha', 'Α', 'α', 'Alpha', 'a', 'άλφα'], ['beta', 'Β', 'β', 'Beta', 'b (v in Greek today)', 'βήτα'], ['gamma', 'Γ', 'γ', 'Gamma', 'g', 'γάμμα'],
    ['delta', 'Δ', 'δ', 'Delta', 'd', 'δέλτα'], ['epsilon', 'Ε', 'ε', 'Epsilon', 'e (short, as in pet)', 'έψιλον'],
    ['zeta', 'Ζ', 'ζ', 'Zeta', 'z', 'ζήτα'], ['eta', 'Η', 'η', 'Eta', 'ē (long, as in they)', 'ήτα'], ['theta', 'Θ', 'θ', 'Theta', 'th', 'θήτα'],
    ['iota', 'Ι', 'ι', 'Iota', 'i', 'γιώτα'], ['kappa', 'Κ', 'κ', 'Kappa', 'k', 'κάπα'],
    ['lambda', 'Λ', 'λ', 'Lambda', 'l', 'λάμδα'], ['mu', 'Μ', 'μ', 'Mu', 'm', 'μι'], ['nu', 'Ν', 'ν', 'Nu', 'n', 'νι'], ['xi', 'Ξ', 'ξ', 'Xi', 'x (ks)', 'ξι'],
    ['omicron', 'Ο', 'ο', 'Omicron', 'o (short, as in pot)', 'όμικρον'],
    ['pi', 'Π', 'π', 'Pi', 'p', 'πι'], ['rho', 'Ρ', 'ρ', 'Rho', 'r', 'ρο'], ['sigma', 'Σ', 'σ', 'Sigma', 's (ς at the end of a word)', 'σίγμα'],
    ['tau', 'Τ', 'τ', 'Tau', 't', 'ταυ'], ['upsilon', 'Υ', 'υ', 'Upsilon', 'u (or y)', 'ύψιλον'],
    ['phi', 'Φ', 'φ', 'Phi', 'ph (f)', 'φι'], ['chi', 'Χ', 'χ', 'Chi', 'ch (kh)', 'χι'], ['psi', 'Ψ', 'ψ', 'Psi', 'ps', 'ψι'], ['omega', 'Ω', 'ω', 'Omega', 'ō (long, as in go)', 'ωμέγα'],
  ].map(([id, cap, small, name, sound, el]) => ({ id, cap, small, glyph: cap + small, name, sound, el }));
  const BY_SMALL = new Map(LETTERS.map(l => [l.small, l]));

  const LESSONS = [
    { id: 'g1', title: 'Alpha to Epsilon: Α Β Γ Δ Ε', letters: ['α', 'β', 'γ', 'δ', 'ε'] },
    { id: 'g2', title: 'Zeta to Kappa: Ζ Η Θ Ι Κ', letters: ['ζ', 'η', 'θ', 'ι', 'κ'] },
    { id: 'g3', title: 'Lambda to Omicron: Λ Μ Ν Ξ Ο', letters: ['λ', 'μ', 'ν', 'ξ', 'ο'] },
    { id: 'g4', title: 'Pi to Upsilon: Π Ρ Σ Τ Υ', letters: ['π', 'ρ', 'σ', 'τ', 'υ'] },
    { id: 'g5', title: 'Phi to Omega: Φ Χ Ψ Ω', letters: ['φ', 'χ', 'ψ', 'ω'], marks: true },
  ];
  // A word's letters, small, without its accents and breathing marks (ς is a σ).
  const bare = w => String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ');
  const letters = w => [...bare(w)].filter(ch => BY_SMALL.has(ch));
  function allowed(n) { return { letters: new Set(LESSONS.slice(0, n + 1).flatMap(l => l.letters)) }; }
  const fits = (word, a) => letters(word).length > 0 && letters(word).every(c => a.letters.has(c)) && [...bare(word)].every(ch => BY_SMALL.has(ch) || /\s/.test(ch));
  const firstLesson = word => LESSONS.findIndex((_, n) => fits(word, allowed(n)));

  // Well-known Bible words to read, each in STEPBible's TBESG under that
  // Strong's number, spelled as it has them. [word, say, meaning, strong]
  // (say: the way Greeks say it today, like the treasure words and the voice.)
  const FIXED = [
    ['ἀμήν', 'a-MEEN', 'amen (it’s true)', 'G0281'], ['δόξα', 'DOK-sa', 'glory', 'G1391'], ['ἀλήθεια', 'a-LEE-thee-a', 'truth', 'G0225'],
    ['ἀγάπη', 'a-GA-pee', 'love', 'G0026'], ['λόγος', 'LO-gos', 'word', 'G3056'], ['θεός', 'the-OS', 'God', 'G2316'], ['Ἰησοῦς', 'ee-ee-SOOS', 'Jesus', 'G2424G'],
    ['ἐλπίς', 'el-PEES', 'hope', 'G1680'], ['πίστις', 'PEES-tees', 'faith', 'G4102G'], ['ἄγγελος', 'AN-ge-los', 'angel, messenger', 'G0032G'],
    ['εἰρήνη', 'ee-REE-nee', 'peace', 'G1515'], ['κόσμος', 'KOS-mos', 'world', 'G2889'],
    ['φῶς', 'FOS', 'light', 'G5457'], ['ζωή', 'zo-EE', 'life', 'G2222'], ['Χριστός', 'khree-STOS', 'Christ (the anointed one)', 'G2424G'], ['χάρις', 'KHA-rees', 'grace', 'G5485'],
    ['ψυχή', 'psee-KHEE', 'soul', 'G5590G'], ['ἰχθύς', 'eekh-THEES', 'fish', 'G2486'],
  ].map(([word, say, en, strong]) => ({ word, say, en, strong }));

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
  const others = (list, not, k, seed) => shuffled([...new Set(list)].filter(x => x !== not), seed).slice(0, k);
  const label = l => l.name + ' · ' + l.sound;

  function readingWords(treasure) {
    const seen = new Set(), out = [];
    for (const w of [...(treasure || []), ...FIXED]) { const k = w.word.normalize('NFC'); if (!seen.has(k) && letters(w.word).length) { seen.add(k); out.push(w); } }
    return out;
  }

  // Lesson n: each new letter by sight and by name; in the last, the marks
  // over a vowel; then up to 4 words to read.
  function lessonSteps(n, words, seed) {
    const L = LESSONS[n], a = allowed(n), steps = [], s = (seed || '') + ':' + L.id;
    const known = [...a.letters].map(c => BY_SMALL.get(c));
    for (const c of L.letters) {
      const l = BY_SMALL.get(c);
      steps.push({ type: 'bsound', glyph: l.glyph, right: label(l), voice: l.el, choices: shuffled([label(l), ...others(known.map(label), label(l), 2, s + c)], s + c + 's') });
      steps.push({ type: 'bglyph', sound: l.name + ' · ' + l.sound, right: l.glyph, voice: l.el, choices: shuffled([l.glyph, ...others(known.map(k => k.glyph), l.glyph, 2, s + c + 'g')], s + c + 'G') });
    }
    if (L.marks) {
      steps.push({ type: 'bsound', glyph: 'ἁ', right: 'ha', choices: shuffled(['ha', 'a', 'ah'], s + 'rough'), note: 'A backward comma over a first vowel (ἁ) is an h sound. Greeks today don’t say it.' });
      steps.push({ type: 'bsound', glyph: 'ἀ', right: 'a', choices: shuffled(['ha', 'a', 'ah'], s + 'smooth'), note: 'A comma over a first vowel (ἀ) means no h. A slanted mark (ά) shows where the word is said loudest.' });
    }
    const readable = words.filter(w => fits(w.word, a)), fresh = readable.filter(w => firstLesson(w.word) === n);
    const pick = shuffled(fresh.length >= 2 ? fresh : readable, s + 'read').slice(0, 4);
    const sayPool = readingWords(words).map(w => w.say);
    for (const w of pick) steps.push({ type: 'bread', glyph: w.word, right: w.say, en: w.en, voice: w.word, choices: shuffled([w.say, ...others(sayPool, w.say, 2, s + w.word)], s + w.word + 'r') });
    return steps;
  }

  // ------------------------------------------------------------ write your name
  // By sound: th θ, ph and f φ, ch and kh χ, ps ψ, x ξ, a long o ω, ee η…
  // Greek has no j: a name with J starts with iota, the way Jesus (Ἰησοῦς) and
  // John (Ἰωάννης) do. h has no letter of its own (it was a mark), and is left out.
  const MAP = [['th', 'θ'], ['ph', 'φ'], ['ch', 'χ'], ['kh', 'χ'], ['ps', 'ψ'], ['ks', 'ξ'], ['ck', 'κ'], ['qu', 'κου'], ['ee', 'η'], ['ea', 'η'], ['oo', 'ου'], ['ou', 'ου'],
    ['ey', 'ει'], ['ay', 'ει'], ['ai', 'αι'], ['oa', 'ω'],
    ['a', 'α'], ['b', 'β'], ['c', 'κ'], ['d', 'δ'], ['e', 'ε'], ['f', 'φ'], ['g', 'γ'], ['h', ''], ['i', 'ι'], ['j', 'ι'], ['k', 'κ'], ['l', 'λ'], ['m', 'μ'], ['n', 'ν'],
    ['o', 'ο'], ['p', 'π'], ['q', 'κ'], ['r', 'ρ'], ['s', 'σ'], ['t', 'τ'], ['u', 'ου'], ['v', 'β'], ['w', 'ου'], ['x', 'ξ'], ['y', 'ι'], ['z', 'ζ']];
  function spellWord(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    w = w.replace(/a([^aeiouy])e$/, 'ey$1').replace(/o([^aeiouy])e$/, 'oa$1').replace(/([^aeiou])e$/, (m, c) => /[aeiou]/.test(w.slice(0, -2)) ? c : m);
    const out = [], parts = [];
    for (let i = 0; i < w.length;) {
      if (i > 0 && w[i] === w[i - 1] && !'aeiou'.includes(w[i])) { i++; continue; }
      const [en, gr] = MAP.find(([e]) => w.startsWith(e, i));
      if (gr) { out.push(gr); parts.push(en); }
      i += en.length;
    }
    let text = out.join('').replace(/σ$/, 'ς');
    if (text) text = text[0].toUpperCase() + text.slice(1);
    return { text, parts, note: /^j/i.test(word) ? 'Greek has no j: a name with J starts with Iota, like Jesus, Ἰησοῦς.' : null };
  }
  function spell(raw) {
    const done = String(raw || '').split(/\s+/).filter(w => /[a-z]/i.test(w)).map(spellWord);
    return { text: done.map(d => d.text).join(' '), parts: done.flatMap(d => d.parts), note: done.map(d => d.note).filter(Boolean)[0] || null };
  }

  const API = { LETTERS, LESSONS, FIXED, BY_SMALL, allowed, fits, firstLesson, letters, bare, readingWords, lessonSteps, spell,
    name: 'Greek letters', lang: 'el', dir: 'ltr',
    fact: 'Javan’s name is Hebrew, יָוָן (Genesis 10:2), and it’s the Old Testament’s name for Greece: his name means the land these letters come from.' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AMIGO_GREEK = API;
})(this);
