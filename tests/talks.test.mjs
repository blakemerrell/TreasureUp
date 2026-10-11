// A conference talk as cards to swipe (2026-10-11: "Slide decks or something. Easier to digest"),
// with the test's own copy of content/sunday.js: without its own cards, the talk's points, quotes and
// questions as cards; to the end, studied and 20 XP once; with its own cards approved, Grown-ups and
// Kids, the quote that goes with a card, Back, the question (25 XP once), and the whole talk on one page.
import fs from 'node:fs';
import path from 'node:path';
import { check, device, state, txt, wait, ROOT } from './lib.mjs';

const MARK = 'window.TU_SUNDAY = ';
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object'
  ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v);
const fingerprint = v => { const c = canon(v); let h = 0x811c9dc5; for (let i = 0; i < c.length; i++) { h ^= c.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };

export default async function talks({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const text = fs.readFileSync(path.join(ROOT, 'content', 'sunday.js'), 'utf8');
  const sun = JSON.parse(text.slice(text.indexOf(MARK) + MARK.length, text.lastIndexOf(';')));
  const conf = sun.conference.slice().sort((a, b) => a.id.localeCompare(b.id)).pop();
  // The talk: one approved, with points and quotes (the app shows its points once it's approved).
  const t = conf.talks.find(x => x.approved && (x.points || []).length && (x.quotes || []).length);
  if (!check(!!t, 'content/sunday.js has an approved talk with points and quotes')) return;
  const file = slides => {
    const s = JSON.parse(JSON.stringify(sun)), c = s.conference.find(x => x.id === conf.id);
    c.slides = slides ? [slides] : [];
    return text.slice(0, text.indexOf(MARK)) + MARK + JSON.stringify(s) + ';\n';
  };
  const day = conf.from + 'T19:00:00';
  const open = async p => {
    await p.click('[data-tab="study"]'); await wait(400);
    await p.click(`[data-talk="${t.id}"]`); await wait(500);
  };
  const step = p => p.$eval('#lessonBody', b => b.dataset.step);
  const next = async p => { await p.click('#lessonFoot [data-ls="next"]'); await wait(450); };

  // 1. No cards of its own: a card a point, the speaker's words, the questions; to the end, studied once.
  let dev = await device('talks', { url, day, files: { 'content/sunday.js': file(null) } });
  let p = dev.page;
  await open(p);
  check(!(await p.$eval('#lesson', e => e.hidden)) && /General Conference/i.test(await txt(p, '#lessonBody .tk-eye')), 'a talk opens as cards in the lesson player: ' + (await txt(p, '#lessonBody .tk-title')));
  const kinds = [];
  for (let i = 0; i < 12 && await step(p) === 'talkcard'; i++) { kinds.push(await txt(p, '#lessonBody .tk-n, #lessonBody .tk-eye')); await next(p); }
  const want = 1 + t.points.length + 1 + ((t.discuss || []).length || (t.scriptures || []).length ? 1 : 0);
  check(kinds.length === want, `its cards: the title, ${t.points.length} points, its words and the questions (${kinds.length} of ${want})`);
  check(kinds.some(k => /’s words/i.test(k)), 'one card is the speaker’s own words');
  const xp0 = (await state(p)).xp || 0;
  check(await step(p) === 'end' && /Talk studied/.test(await txt(p, '#lessonBody')), 'the end says the talk is studied');
  let s = await state(p);
  check(s.talks && s.talks[t.id] && s.talks[t.id].xp === 20, 'studied, for 20 XP');
  await p.click('#lessonFoot [data-ls="close"]'); await wait(400);
  await p.click(`[data-talk="${t.id}"]`); await wait(500);
  for (let i = 0; i < 12 && await step(p) === 'talkcard'; i++) await next(p);
  check(((await state(p)).xp || 0) === xp0, 'played again, no more XP');
  check(!p.errors.length, 'no page errors (' + p.errors.length + ')');
  await dev.ctx.close();

  // 2. Its own cards, approved: Grown-ups and Kids, the quote with a card, Back, the question.
  const slides = {
    id: t.id,
    cards: t.points.slice(0, 3).map((x, i) => Object.assign({ h: 'Idea ' + (i + 1), text: x }, i === 0 ? { quote: 0 } : {})),
    ask: 'What will we try this week?',
    kids: [1, 2, 3].map(i => ({ h: 'Kids idea ' + i, text: 'A short, plain line for a child to read, number ' + i + '.' })),
    askKids: 'What could you do this week?',
    quiz: { q: 'Which of these is the right answer?', right: 'The right one', wrong: ['A wrong one', 'Another wrong one'], why: 'The cards on both levels say so.' }
  };
  slides.approved = fingerprint(Object.assign({}, slides, { approved: undefined }));
  dev = await device('talks-own', { url, day, files: { 'content/sunday.js': file(slides) } });
  p = dev.page;
  await open(p);
  check(await p.locator('#lessonBody .tk-level button').count() === 2, 'the first card has Grown-ups and Kids');
  await p.click('#lessonBody [data-level="adult"]'); await wait(400);
  await next(p);
  check(await txt(p, '#lessonBody .ls-prompt') === 'Idea 1', 'Grown-ups: its own first card');
  check((await txt(p, '#lessonBody .tk-quote')).includes(t.quotes[0].slice(0, 30)), 'with the talk’s quote that goes with it');
  await next(p);
  await p.click('#lessonFoot [data-ls="prev"]'); await wait(450);
  check(await txt(p, '#lessonBody .ls-prompt') === 'Idea 1', 'Back goes to the card before');
  for (let i = 0; i < 8 && await step(p) === 'talkcard'; i++) await next(p);
  check(await step(p) === 'talkq', 'then the question');
  const before = (await state(p)).xp || 0;
  await p.click('#lessonBody .ls-opt:has-text("The right one")'); await p.click('#lessonFoot [data-ls="check"]'); await wait(450);
  s = await state(p);
  check((s.xp || 0) - before === 25 && s.talks['q:' + t.id] && s.talks['q:' + t.id].right, `right the first time: 25 XP (${(s.xp || 0) - before})`);
  await next(p);
  await p.click('#lessonFoot [data-ls="close"]'); await wait(400);
  await p.click(`[data-talk="${t.id}"]`); await wait(500);
  await p.click('#lessonBody [data-level="kids"]'); await wait(400);
  await next(p);
  check(await txt(p, '#lessonBody .ls-prompt') === 'Kids idea 1', 'Kids: the kids’ cards');
  for (let i = 0; i < 8; i++) { if (await p.locator('#lessonBody .tk-all').count()) break; await next(p); }
  await p.click('#lessonBody .tk-all'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)) && (await txt(p, '#appBody')).includes(t.title), 'the last card opens the whole talk on one page');
  check(!p.errors.length, 'no page errors (' + p.errors.length + ')');
  await dev.ctx.close();
}
