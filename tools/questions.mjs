// Questions friends ask (content/questions.js): the rules each answer keeps,
// shared by tools/verify.mjs (every deploy) and tools/add-questions.mjs
// (loading drafts). content/README.md says what each field means.
//
//   { id, area, heard, where, kid: [...], deeper: [...], parent, sources: [{ t, by, u, checked? }],
//     more?: [{ t, kind, u }], review?: [...], approved? }
// `sources` back up the answer; `more` is "go learn more" from Scripture
// Central (its KnoWhys, Evidences, videos and the Church History Matters podcast).

export const QA_AREAS = { god: 'God & Jesus', bible: 'The Bible', bom: 'The Book of Mormon', history: 'Church history' };
export const QA_WHERE = ['school', 'online', 'friend'];
export const QA_LIMITS = { kid: [60, 130], deeper: [180, 450], sources: [2, 4], more: 4, review: 3, quoteWords: 25 };
export const QA_MORE_KINDS = ['podcast', 'knowhy', 'evidence', 'video', 'article'];
// Where a `more` link may go: Scripture Central, or where its videos and podcast episodes live.
export const QA_MORE_HOSTS = ['scripturecentral.org', 'youtube.com', 'youtu.be', 'podcasts.apple.com'];
const FIELDS = new Set(['id', 'area', 'heard', 'where', 'kid', 'deeper', 'parent', 'sources', 'more', 'review', 'approved']);
export const QA_MARK = 'window.TU_QUESTIONS = ';

const words = t => (String(t || '').match(/\S+/g) || []).length;
// The fingerprint developer mode puts in `approved` (the app's approvalHash, and tools/verify.mjs's).
const canonJson = v => Array.isArray(v) ? '[' + v.map(canonJson).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonJson(v[k])).join(',') + '}'
  : JSON.stringify(v === undefined ? null : v);
export function approvalHash(v) {
  const c = canonJson(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < c.length; i++) { h ^= c.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export const qaHash = x => { const c = Object.assign({}, x); delete c.approved; return approvalHash(c); };

// Words in quotation marks are someone's exact words: short ones only.
function quotes(where, label, text, fail) {
  const t = String(text || '');
  if ((t.match(/“/g) || []).length !== (t.match(/”/g) || []).length) fail(where, `${label} has unbalanced “quotes”`);
  if ((t.match(/"/g) || []).length % 2) fail(where, `${label} has a " quote that isn't closed`);
  for (const m of [...t.matchAll(/“([^”]*)”/g), ...t.matchAll(/"([^"]*)"/g)]) {
    const n = words(m[1]);
    if (n > QA_LIMITS.quoteWords) fail(where, `${label} quotes ${n} words (“${m[1].slice(0, 40)}…”): ${QA_LIMITS.quoteWords} at most, or say it in your own words`);
  }
}

// Every problem with the file's questions, and notes that don't stop a deploy.
export function checkQuestions(data) {
  const failures = [], notes = [];
  const fail = (where, msg) => failures.push(`${where}: ${msg}`);
  if (!data || typeof data !== 'object' || !Array.isArray(data.questions)) {
    failures.push('content/questions.js must set window.TU_QUESTIONS = { questions: [...] }');
    return { failures, notes, count: 0, approved: 0 };
  }
  const ids = new Set();
  let approved = 0;
  data.questions.forEach((x, n) => {
    const where = 'question ' + ((x && x.id) || '#' + (n + 1));
    if (!x || typeof x !== 'object' || Array.isArray(x)) { fail(where, 'must be an object'); return; }
    if (typeof x.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.id)) fail(where, 'id: lowercase letters, numbers and dashes, like "bom-horses"');
    else if (ids.has(x.id)) fail(where, `id "${x.id}" is used twice`);
    ids.add(x.id);
    if (!Object.hasOwn(QA_AREAS, x.area)) fail(where, `area "${x.area}" must be one of ${Object.keys(QA_AREAS).join(', ')}`);
    if (typeof x.heard !== 'string' || !x.heard.trim()) fail(where, 'heard: the question, as he hears it');
    if (!QA_WHERE.includes(x.where)) fail(where, `where "${x.where}" must be one of ${QA_WHERE.join(', ')}`);
    for (const f of ['kid', 'deeper']) {
      const list = x[f], [lo, hi] = QA_LIMITS[f];
      if (!Array.isArray(list) || !list.length || list.some(p => typeof p !== 'string' || !p.trim())) { fail(where, `${f}: a list of paragraphs`); continue; }
      const n = words(list.join(' '));
      if (n < lo || n > hi) fail(where, `${f} is ${n} words (${lo} to ${hi})`);
      list.forEach((p, i) => quotes(where, `${f} paragraph ${i + 1}`, p, fail));
    }
    quotes(where, 'heard', x.heard, fail);
    if (typeof x.parent !== 'boolean') fail(where, 'parent: true or false (true shows “Talk with Mom or Dad”)');
    const src = x.sources, [smin, smax] = QA_LIMITS.sources;
    if (!Array.isArray(src) || src.length < smin || src.length > smax) fail(where, `sources: ${smin} to ${smax} (it has ${Array.isArray(src) ? src.length : 0})`);
    (Array.isArray(src) ? src : []).forEach((s, i) => {
      const sw = `${where} · source ${i + 1}`;
      if (!s || typeof s !== 'object') { fail(sw, 'must be { t, by, u }'); return; }
      if (typeof s.t !== 'string' || !s.t.trim()) fail(sw, 't: the page’s title');
      if (typeof s.by !== 'string' || !s.by.trim()) fail(sw, 'by: who published it (Gospel Topics Essay, Joseph Smith Papers…)');
      let ok = typeof s.u === 'string' && /^https:\/\/\S+$/.test(s.u);
      if (ok) { try { new URL(s.u); } catch (e) { ok = false; } }
      if (!ok) fail(sw, `u "${s.u}" must be an https:// link`);
      if (s.checked !== undefined && (typeof s.checked !== 'string' || !s.checked.trim())) fail(sw, 'checked: how it was checked, like "search"');
      for (const k of Object.keys(s)) if (!['t', 'by', 'u', 'checked'].includes(k)) notes.push(`${sw}: "${k}" isn't a field the app uses`);
    });
    if (x.more !== undefined) {
      if (!Array.isArray(x.more)) fail(where, 'more: a list of { t, kind, u }');
      else if (x.more.length > QA_LIMITS.more) fail(where, `more has ${x.more.length} links (${QA_LIMITS.more} at most)`);
      const seen = new Set();
      (Array.isArray(x.more) ? x.more : []).forEach((m, i) => {
        const mw = `${where} · more ${i + 1}`;
        if (!m || typeof m !== 'object' || Array.isArray(m)) { fail(mw, 'must be { t, kind, u }'); return; }
        if (typeof m.t !== 'string' || !m.t.trim()) fail(mw, 't: the title');
        if (!QA_MORE_KINDS.includes(m.kind)) fail(mw, `kind "${m.kind}" must be one of ${QA_MORE_KINDS.join(', ')}`);
        let host = null;
        if (typeof m.u === 'string' && /^https:\/\/\S+$/.test(m.u)) { try { host = new URL(m.u).hostname.toLowerCase(); } catch (e) { host = null; } }
        if (!host) fail(mw, `u "${m.u}" must be an https:// link`);
        else if (!QA_MORE_HOSTS.some(h => host === h || host.endsWith('.' + h))) fail(mw, `u "${m.u}" must be on scripturecentral.org, youtube.com, youtu.be or podcasts.apple.com`);
        if (typeof m.u === 'string') { if (seen.has(m.u)) fail(mw, `${m.u} is linked twice`); seen.add(m.u); }
        for (const k of Object.keys(m)) if (!['t', 'kind', 'u'].includes(k)) notes.push(`${mw}: "${k}" isn't a field the app uses`);
      });
    }
    if (x.review !== undefined) {
      if (!Array.isArray(x.review) || x.review.some(r => typeof r !== 'string' || !r.trim())) fail(where, 'review: a list of notes for the owner');
      else if (x.review.length > QA_LIMITS.review) fail(where, `review has ${x.review.length} notes (${QA_LIMITS.review} at most)`);
    }
    for (const k of Object.keys(x)) if (!FIELDS.has(k)) notes.push(`${where}: "${k}" isn't a field the app uses`);
    if (x.approved !== undefined) {
      if (typeof x.approved !== 'string') fail(where, 'approved: the fingerprint developer mode sets (approve it there)');
      else if (x.approved === qaHash(x)) approved++;
      else notes.push(`${where}: changed since it was approved, so the live app hides it until it's approved again`);
    }
  });
  return { failures, notes, count: data.questions.length, approved };
}
