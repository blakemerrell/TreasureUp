// Wika: the alef-bet, a side quest like Baybayin. Hebrew is read right to
// left; its 22 letters are consonants, five of them with a different shape at
// the end of a word, and the vowels are points written under, over or beside
// a letter. Six short lessons: the letters a few at a time, a first lesson on
// the vowel points, then the final forms. Each lesson ends with words to
// read, from the weeks' treasure words where the letters taught allow, else
// from a few well-known Bible words (FIXED, each checked against STEPBible's
// Hebrew lexicon, TBESH, by tools/test-amigo.mjs where it has the file). A
// writer spells a name in Hebrew letters by its sound: an approximation, as
// Hebrew spells names from other languages.
// Fun fact: Javan's name is Hebrew, יָוָן (Genesis 10:2), and it's the Old
// Testament's name for Greece.
// Tested by tools/test-amigo.mjs.
(function (root) {
  'use strict';

  // Each letter: its glyph, name, sound, and its name in Hebrew (said by the recordings).
  const LETTERS = [
    ['alef', 'א', 'Alef', 'silent (holds a vowel)', 'אָלֶף'], ['bet', 'ב', 'Bet', 'b, or v without the dot', 'בֵּית'], ['gimel', 'ג', 'Gimel', 'g', 'גִּימֶל'],
    ['dalet', 'ד', 'Dalet', 'd', 'דָּלֶת'], ['he', 'ה', 'He', 'h', 'הֵא'], ['vav', 'ו', 'Vav', 'v (or a vowel: o, u)', 'וָו'],
    ['zayin', 'ז', 'Zayin', 'z', 'זַיִן'], ['chet', 'ח', 'Chet', 'kh (in your throat)', 'חֵית'], ['tet', 'ט', 'Tet', 't', 'טֵית'],
    ['yod', 'י', 'Yod', 'y (or a vowel: i, e)', 'יוֹד'], ['kaf', 'כ', 'Kaf', 'k, or kh without the dot', 'כַּף'], ['lamed', 'ל', 'Lamed', 'l', 'לָמֶד'],
    ['mem', 'מ', 'Mem', 'm', 'מֵם'], ['nun', 'נ', 'Nun', 'n', 'נוּן'], ['samekh', 'ס', 'Samekh', 's', 'סָמֶךְ'],
    ['ayin', 'ע', 'Ayin', 'silent (holds a vowel)', 'עַיִן'], ['pe', 'פ', 'Pe', 'p, or f without the dot', 'פֵּא'], ['tsadi', 'צ', 'Tsadi', 'ts', 'צָדִי'],
    ['qof', 'ק', 'Qof', 'k', 'קוֹף'], ['resh', 'ר', 'Resh', 'r', 'רֵישׁ'], ['shin', 'ש', 'Shin', 'sh (dot on the right), s (dot on the left)', 'שִׁין'],
    ['tav', 'ת', 'Tav', 't', 'תָּו'],
  ].map(([id, glyph, name, sound, he]) => ({ id, glyph, name, sound, he }));
  const FINALS = [
    ['kaf-final', 'ך', 'Final kaf', 'kh, at the end of a word', 'כַּף סוֹפִית', 'כ'], ['mem-final', 'ם', 'Final mem', 'm, at the end of a word', 'מֵם סוֹפִית', 'מ'],
    ['nun-final', 'ן', 'Final nun', 'n, at the end of a word', 'נוּן סוֹפִית', 'נ'], ['pe-final', 'ף', 'Final pe', 'f, at the end of a word', 'פֵּא סוֹפִית', 'פ'],
    ['tsadi-final', 'ץ', 'Final tsadi', 'ts, at the end of a word', 'צָדִי סוֹפִית', 'צ'],
  ].map(([id, glyph, name, sound, he, of]) => ({ id, glyph, name, sound, he, of, final: true }));
  const BY_GLYPH = new Map([...LETTERS, ...FINALS].map(l => [l.glyph, l]));

  // The vowel points (niqqud), on bet with its dot (bet, said b) to show them.
  const VOWELS = [
    { glyph: 'בַּ', sound: 'ba', name: 'Patach: a line under' }, { glyph: 'בָּ', sound: 'ba', name: 'Kamats: a T under (said a, like patach)' },
    { glyph: 'בֶּ', sound: 'be', name: 'Segol: three dots under' }, { glyph: 'בֵּ', sound: 'be', name: 'Tsere: two dots under (said e, like segol)' },
    { glyph: 'בִּ', sound: 'bi', name: 'Chirik: one dot under' }, { glyph: 'בֹּ', sound: 'bo', name: 'Cholam: a dot over' },
    { glyph: 'בּוֹ', sound: 'bo', name: 'Vav with a dot on top: o' }, { glyph: 'בֻּ', sound: 'bu', name: 'Kubuts: three slanted dots' },
    { glyph: 'בּוּ', sound: 'bu', name: 'Shuruk: vav with a dot in it, u' }, { glyph: 'בְּ', sound: 'b', name: 'Sheva: two dots, no vowel (or a quick e)' },
    { glyph: 'ב', sound: 'v', name: 'No dot in the bet: v' },
  ];
  // Marks: the vowel points, the dot in a letter (dagesh), the dots of shin
  // (U+05C1, U+05C2), and marks that don't change how it's read (taken off).
  const SHIN_DOTS = /[ׁׂ]/g;
  const IGNORED = /[֑-ֽֿ֯׀׃-ׇ־]/g;      // cantillation, meteg, rafe, maqaf, sof pasuq…
  const strip = w => String(w || '').normalize('NFC').replace(IGNORED, '');
  const letters = w => [...strip(w).replace(/[ְ-ׂ]/g, '')].filter(ch => /[א-ת]/.test(ch));
  const hasPoints = w => /[ְ-ּ]/.test(strip(w));

  const LESSONS = [
    { id: 'h1', title: 'Alef to Vav: א ב ג ד ה ו', letters: ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] },
    { id: 'h2', title: 'The vowel points', vowels: true },
    { id: 'h3', title: 'Zayin to Lamed: ז ח ט י כ ל', letters: ['ז', 'ח', 'ט', 'י', 'כ', 'ל'] },
    { id: 'h4', title: 'Mem to Tsadi: מ נ ס ע פ צ', letters: ['מ', 'נ', 'ס', 'ע', 'פ', 'צ'] },
    { id: 'h5', title: 'Qof to Tav: ק ר ש ת', letters: ['ק', 'ר', 'ש', 'ת'] },
    { id: 'h6', title: 'The five final forms: ך ם ן ף ץ', letters: ['ך', 'ם', 'ן', 'ף', 'ץ'] },
  ];
  function allowed(n) {
    const done = LESSONS.slice(0, n + 1);
    return { letters: new Set(done.flatMap(l => l.letters || [])), vowels: done.some(l => l.vowels) };
  }
  // A word can be read in lesson n once its letters and (if it has them) its points are taught.
  const fits = (word, a) => letters(word).every(c => a.letters.has(c)) && (a.vowels || !hasPoints(word)) && letters(word).length > 0;
  const firstLesson = word => LESSONS.findIndex((_, n) => fits(word, allowed(n)));

  // Well-known Bible words to read, each in STEPBible's TBESH under that
  // Strong's number, with that pointing (its accents aside). [word, say, meaning, strong]
  const FIXED = [
    ['אָב', 'AHV', 'father', 'H0001G'], ['דָּוִד', 'da-VEED', 'David (beloved)', 'H1732'], ['דָּג', 'DAG', 'fish', 'H1709H'],
    ['יְהוּדָה', 'ye-hoo-DAH', 'Judah', 'H3063G'], ['אֵל', 'EL', 'God', 'H0410'], ['יָד', 'YAD', 'hand', 'H3027G'], ['לֵב', 'LEV', 'heart', 'H3820A'],
    ['לֵוִי', 'le-VEE', 'Levi', 'H3878'], ['חַי', 'KHAI', 'alive', 'H2416A'], ['טוֹב', 'TOV', 'good', 'H2896A'], ['חַוָּה', 'khav-VAH', 'Eve', 'H2332'],
    ['נֹחַ', 'NO-akh', 'Noah', 'H5146'], ['תּוֹרָה', 'to-RAH', 'the law (teaching)', 'H8451'], ['מֹשֶׁה', 'mo-SHEH', 'Moses', 'H4872'],
    ['בְּרִית', 'be-REET', 'covenant', 'H1285'], ['שָׂרָה', 'sa-RAH', 'Sarah', 'H8283'], ['יִשְׂרָאֵל', 'yis-ra-EL', 'Israel', 'H3478'],
    ['שָׁלוֹם', 'sha-LOHM', 'peace', 'H7965G'], ['אָמֵן', 'ah-MEN', 'amen (it’s true)', 'H0543'], ['יָוָן', 'ya-VAHN', 'Javan, Greece (Genesis 10:2)', 'H3120G'],
    ['אָדָם', 'ah-DAHM', 'Adam, a man', 'H0121G'], ['עַם', 'AHM', 'people', 'H5971A'], ['מֶלֶךְ', 'MEH-lekh', 'king', 'H4428G'],
    ['לֶחֶם', 'LEH-khem', 'bread', 'H3899G'], ['אֶרֶץ', 'EH-rets', 'earth, land', 'H0776H'], ['גַּן', 'GAHN', 'garden', 'H1588M'],
    ['אֱלֹהִים', 'e-lo-HEEM', 'God', 'H0430G'], ['אַבְרָהָם', 'av-ra-HAHM', 'Abraham', 'H0085'],
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

  // The words to read: the treasure words ({ word, say, en }) first, then the
  // fixed ones; one of each word.
  function readingWords(treasure) {
    const seen = new Set(), out = [];
    for (const w of [...(treasure || []), ...FIXED]) { const k = strip(w.word); if (!seen.has(k) && letters(w.word).length) { seen.add(k); out.push(w); } }
    return out;
  }

  // Lesson n's steps: each new letter by sight (what is it?) and by name
  // (which one is it?), or the vowel points; then up to 4 words to read.
  function lessonSteps(n, words, seed) {
    const L = LESSONS[n], a = allowed(n), steps = [], s = (seed || '') + ':' + L.id;
    const known = [...a.letters].map(g => BY_GLYPH.get(g));
    if (L.letters) {
      for (const g of L.letters) {
        const l = BY_GLYPH.get(g), near = l.final ? [BY_GLYPH.get(l.of), ...known.filter(k => k.final && k !== l)] : known;
        steps.push({ type: 'bsound', glyph: g, right: label(l), voice: l.he, choices: shuffled([label(l), ...others(near.map(label), label(l), 2, s + g)], s + g + 's'), note: l.final ? `The end-of-word form of ${BY_GLYPH.get(l.of).name}: ${l.of} → ${g}` : null });
        if (!l.final) steps.push({ type: 'bglyph', sound: l.name + ' · ' + l.sound, right: g, voice: l.he, choices: shuffled([g, ...others(known.map(k => k.glyph), g, 2, s + g + 'g')], s + g + 'G') });
      }
    } else if (L.vowels) {
      for (const v of VOWELS) {
        steps.push({ type: 'bsound', glyph: v.glyph, right: v.sound, choices: shuffled([v.sound, ...others(VOWELS.map(x => x.sound), v.sound, 2, s + v.glyph)], s + v.glyph + 's'), note: v.name });
      }
    }
    const readable = words.filter(w => fits(w.word, a)), fresh = readable.filter(w => firstLesson(w.word) === n);
    const pick = shuffled(fresh.length >= 2 ? fresh : readable, s + 'read').slice(0, 4);
    const sayPool = readingWords(words).map(w => w.say);
    for (const w of pick) {
      steps.push({ type: 'bread', glyph: w.word, right: w.say, en: w.en, voice: w.word, choices: shuffled([w.say, ...others(sayPool, w.say, 2, s + w.word)], s + w.word + 'r') });
    }
    return steps;
  }

  // ------------------------------------------------------------ write your name
  // By sound, an approximation, the way Hebrew writes a name from another
  // language: a consonant letter with the vowel's point under it (or vav, yod
  // for o, u, i, ey), alef to hold a vowel at the start, j as ג׳, ch as צ׳,
  // and the final forms at the end. A name the Bible has is spelled its way.
  const BIBLE = {
    javan: ['יָוָן', 'Javan is a Bible name: Genesis 10:2 spells it יָוָן (ya-VAHN), and it’s the Old Testament’s name for Greece.'],
    david: ['דָּוִד', 'David is a Bible name: this is how the Bible spells it.'], sarah: ['שָׂרָה', 'Sarah is a Bible name: this is how the Bible spells it.'],
    adam: ['אָדָם', 'Adam is a Bible name: this is how the Bible spells it.'], noah: ['נֹחַ', 'Noah is a Bible name: this is how the Bible spells it.'],
    eve: ['חַוָּה', 'Eve is a Bible name: Chavah, this is how the Bible spells it.'], levi: ['לֵוִי', 'Levi is a Bible name: this is how the Bible spells it.'],
    moses: ['מֹשֶׁה', 'Moses is a Bible name: Moshe, this is how the Bible spells it.'], abraham: ['אַבְרָהָם', 'Abraham is a Bible name: this is how the Bible spells it.'],
    israel: ['יִשְׂרָאֵל', 'Israel is a Bible name: this is how the Bible spells it.'],
  };
  const CONS = { b: 'בּ', v: 'ו', g: 'ג', d: 'ד', h: 'ה', w: 'ו', z: 'ז', t: 'ט', y: 'י', k: 'ק', c: 'ק', q: 'ק', l: 'ל', m: 'מ', n: 'נ', s: 'ס', f: 'פ', p: 'פּ', r: 'ר',
    sh: 'שׁ', ch: 'צ׳', j: 'ג׳', th: 'ת', ts: 'צ', kh: 'ח', x: 'קס' };
  const FINAL_OF = { 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ', 'כ': 'ך' };
  const POINT = { a: 'ַ', e: 'ֶ', i: 'ִ', o: 'ֹ', u: 'ֻ' };
  // English spelling to sounds: "Blake" → b l ey k (a magic e), "Kim" → k i m.
  function sounds(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    w = w.replace(/a([^aeiouy])e$/, 'ey$1').replace(/i([^aeiouy])e$/, 'ay$1').replace(/o([^aeiouy])e$/, 'o$1').replace(/u([^aeiouy])e$/, 'u$1')
      .replace(/(ai|ay|ei)/g, 'ey').replace(/(ee|ea|ie)/g, 'i').replace(/oo/g, 'u').replace(/ou/g, 'u').replace(/ck/g, 'k').replace(/qu/g, 'kw').replace(/ph/g, 'f')
      .replace(/c(?=[eiy])/g, 's').replace(/([^aeiou])y$/, '$1i').replace(/e$/, (m, i) => /[aeiou]/.test(w.slice(0, -1)) ? '' : 'e');
    const out = [];
    for (let i = 0; i < w.length;) {
      if (w.startsWith('ey', i)) { out.push({ v: 'ey' }); i += 2; continue; }
      if (w.startsWith('ay', i) && !/[aeiou]/.test(w[i + 2] || '')) { out.push({ v: 'ay' }); i += 2; continue; }
      const two = w.slice(i, i + 2);
      if (['sh', 'ch', 'th', 'ts', 'kh'].includes(two)) { out.push({ c: two }); i += 2; continue; }
      if ('aeiou'.includes(w[i])) { out.push({ v: w[i] }); i++; continue; }
      if (w[i] === 'y' && i > 0 && !'aeiou'.includes(w[i + 1] || '')) { out.push({ v: 'i' }); i++; continue; }
      if (i > 0 && w[i] === w[i - 1]) { i++; continue; }                // a double letter is one sound
      out.push({ c: w[i] }); i++;
    }
    return out;
  }
  function spellWord(word) {
    const bible = BIBLE[word.toLowerCase()];
    if (bible) return { text: bible[0], parts: [bible[0]], note: bible[1] };
    const ss = sounds(word), text = [], parts = [];
    for (let i = 0; i < ss.length; i++) {
      const x = ss[i];
      if (x.v) {                                                         // a vowel with no consonant before it: on an alef
        text.push('א' + vowel(x.v)); parts.push(x.v); continue;
      }
      let letter = CONS[x.c] || '';
      if (!letter) continue;
      const nx = ss[i + 1], last = i === ss.length - 1;
      if (last && FINAL_OF[letter[0]] && letter.length === 1) letter = FINAL_OF[letter];
      if (nx && nx.v) { text.push(letter + vowel(nx.v)); parts.push(x.c + nx.v); i++; }
      else { text.push(letter + (i === 0 && nx ? 'ְ' : '')); parts.push(x.c); }   // a sheva starts a cluster (bl)
    }
    return { text: text.join(''), parts, note: null };
  }
  // A point goes on the letter's base, before a geresh (ג׳): ג + point + ׳.
  function vowel(v) {
    if (v === 'ey') return 'ֵי';
    if (v === 'ay') return 'ַי';
    if (v === 'o') return 'וֹ';
    if (v === 'u') return 'וּ';
    if (v === 'i') return 'ִי';
    return POINT[v];
  }
  function spell(raw) {
    const words = String(raw || '').split(/\s+/).filter(w => /[a-z]/i.test(w));
    const done = words.map(spellWord);
    const text = done.map(d => d.text.replace(/([א-ת])׳([ְ-ּ])/g, '$1$2׳')).join(' ');
    return { text, parts: done.flatMap(d => d.parts), note: done.map(d => d.note).filter(Boolean).join(' ') || null };
  }

  const API = { LETTERS, FINALS, VOWELS, LESSONS, FIXED, BY_GLYPH, allowed, fits, firstLesson, letters, strip, readingWords, lessonSteps, spell,
    name: 'Alef-bet', lang: 'he', dir: 'rtl',
    fact: 'Javan’s name is Hebrew: יָוָן (Genesis 10:2). He was a grandson of Noah, and his name became the Old Testament’s name for Greece.' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AMIGO_ALEFBET = API;
})(this);
