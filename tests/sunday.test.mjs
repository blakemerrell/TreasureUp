// Sunday's Today opens with the morning routine, like every other day (2026-10-11: "Add them on
// Sundays"): Be still and the Morning Council at the top of Sunday's own list, the Council saved once and
// paid once, its to-dos in Goal Achievements and Return & Report under the list; neither holds the day back
// (a family game still keeps it); a youth's and a grown-up's titles; not in Family Study or on another day's
// view of Sunday, as on the other days; and the family's merge keeps a Sunday Council.
// Then the Sunday study cards' new parts (2026-10-11), with the test's own content/sunday.js: see cards() below.
import { check, device, setDay, state, txt, wait, liveWeek, dayAdd } from './lib.mjs';
import { qaHash as fingerprint } from '../tools/questions.mjs';

export default async function sunday({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const w = liveWeek(), sun = dayAdd(w.start, 6), sat = dayAdd(w.start, 5);
  const dev = await device('sunday', { url, day: sun + 'T09:00:00' });
  const p = dev.page;
  check(/SUNDAY/i.test(await txt(p, '#home .fl-date')), 'Sunday opens: ' + (await txt(p, '#home .fl-date')));

  // The two rows lead Sunday's list; Sunday's own rows are still there under them.
  const top = await p.$$eval('#home .fl-list > *', els => els.slice(0, 2).map(e => ({ still: e.hasAttribute('data-still'), bp: e.hasAttribute('data-open-blueprint'), t: e.innerText })));
  check(top.length === 2 && top[0].still && /Be still/.test(top[0].t), 'Be still is the first row of Sunday’s list: ' + (top[0] && top[0].t.split('\n')[0]));
  check(top.length === 2 && top[1].bp && /🌟 Morning Council/.test(top[1].t), 'the Morning Council is the second, a youth’s: ' + (top[1] && top[1].t.split('\n')[0]));
  check(await p.locator('#home .fl-list [data-still]').count() === 1, 'Be still is listed once');
  check(await p.locator(`#home .fl-list [data-played="${sun}"]`).count() === 1, 'Sunday keeps its own rows (a family game)');
  check(!/Be still|Morning Council/.test(await txt(p, '#home .fl-next, #home .fl-done')), 'neither is the green button: ' + (await txt(p, '#home .fl-next, #home .fl-done')).slice(0, 50));

  // Be still opens from its row.
  await p.click('#home .fl-list [data-still]'); await wait(400);
  check(!(await p.$eval('#stillLayer', e => e.hidden)), 'the Be still row opens Be still');
  await p.click('#stillClose').catch(() => p.keyboard.press('Escape')); await wait(400);

  // The Morning Council: opened, saved, paid once.
  const xp0 = (await state(p)).xp || 0;
  await p.click('#home .fl-list [data-open-blueprint]'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)) && /Morning Council/.test(await txt(p, '#appBody')), 'the Morning Council opens on Sunday');
  await p.fill('#bpOneThing', 'Listen in sacrament meeting');
  await p.fill('#bpUplift', 'Visit Grandma');
  await p.click('[data-bp-save]'); await wait(500);
  let s = await state(p);
  const bps = Object.values(s.impressions || {}).filter(x => x && x.kind === 'blueprint' && x.day === sun);
  check(bps.length === 1 && bps[0].oneThing === 'Listen in sacrament meeting', 'saved with his impressions, for Sunday');
  check((s.xp || 0) - xp0 === 15 && ((s.pathDone || {})[sun] || {}).blueprintXp, `paid 15 XP (${(s.xp || 0) - xp0})`);
  const row = await txt(p, '#home .fl-list [data-open-blueprint]');
  check(/✓/.test(row) && /Listen in sacrament meeting/.test(row), 'its row is ticked and shows the One Thing: ' + row.slice(0, 70));
  check(await p.locator('#home .goals-section .bp-check-item').count() === 2, 'its to-dos are in Goal Achievements');
  check(await p.locator('#home .evening-card [data-open-evening]').count() === 1, 'Return & Report shows under them');
  check(!(s.days || {})[sun], 'saving it doesn’t keep the day by itself (the streak works as before)');

  await p.click('#home .goals-section [data-bp-check="uplift"]'); await wait(300);
  check(await p.locator('#home .goals-section .bp-check-item.done').count() === 1, 'a to-do ticks in Goal Achievements');

  // Saved again: changed, not paid twice.
  await p.click('#home .fl-list [data-open-blueprint]'); await wait(400);
  await p.fill('#bpOneThing', 'Listen in sacrament meeting, and take notes');
  await p.click('[data-bp-save]'); await wait(500);
  s = await state(p);
  check((s.xp || 0) - xp0 === 15 && Object.values(s.impressions || {}).filter(x => x && x.kind === 'blueprint' && x.day === sun).length === 1, `saved again: still one, still 15 XP (${(s.xp || 0) - xp0})`);

  // Be still and the Council left undone don't hold Sunday back: a family game keeps it.
  await p.click(`#home [data-played="${sun}"]`); await wait(500);
  check(((await state(p)).days || {})[sun] === 1, 'with Be still not done, “We played!” still keeps Sunday');

  // A grown-up's title, after a reload (it's kept).
  await p.evaluate(() => { const k = Object.keys(localStorage).find(x => /v1$/.test(x) && !x.includes('@')); const s = JSON.parse(localStorage.getItem(k)); s.seasonWho = 'adult'; localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload(); await wait(1500);
  const bpRow = await txt(p, '#home .fl-list [data-open-blueprint]');
  check(/🌅 Morning Council/.test(bpRow) && /✓/.test(bpRow), 'a grown-up’s: 🌅 Morning Council, still ticked after a reload');

  // Family Study has neither, as on the other days.
  await p.click('[data-study-mode="family"]'); await wait(400);
  check(await p.locator('#home .flow [data-open-blueprint], #home .flow .fl-list [data-still]').count() === 0, 'Family Study on Sunday: neither row, as on the other days');
  await p.click('[data-study-mode="personal"]'); await wait(400);

  // Sunday looked at from another day: its own rows, no morning routine (that's today's).
  await setDay(dev, sat + 'T09:00:00');
  await p.click(`#home .strip [data-day="${sun}"]`); await wait(500);
  check(/SUNDAY/i.test(await txt(p, '#home .fl-date')) && await p.locator('#home .fl-list [data-open-blueprint], #home .fl-list [data-still]').count() === 0, 'Sunday seen from Saturday: no morning routine rows');

  // Two devices: the family's copy without the Council, this one with it: merged, it's kept.
  const imp = { kind: 'blueprint', day: sun, oneThing: 'Visit Grandma', at: 1, upd: 2 };
  const merged = await p.evaluate(([imp]) => TreasureUp.mergeProgress({ xp: 100, impressions: {} }, { xp: 115, impressions: { bpX: imp } }, { xp: 100, impressions: {} }), [imp]);
  check(merged.impressions && merged.impressions.bpX && merged.impressions.bpX.oneThing === 'Visit Grandma', 'merged with the family’s copy, a Sunday Council is kept');

  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();
  await cards({ port, sun });
}

// The Sunday study cards' new parts (2026-10-11), every one optional, with the test's own content/sunday.js
// (never the committed one): a talk's 📖 The story, 🙋 The invitation and ✨ The promise (the speaker's own
// words, shown as its quotes are) and ✅ Try this week, each there when present and not when absent; a youth
// card's kind as a label on its question, and the lesson's ✅ Try this week and 💭 Think about it at its end;
// the approval fingerprint covers all of them; content without them renders exactly as before (the same
// HTML, and the committed content/sunday.js with none of the new blocks); developer mode previews them, and its
// form keeps a promise of null.
const approve = x => Object.assign(x, { approved: fingerprint(x) });
const TALK = {
  speaker: 'Elder Fixture Speaker', title: 'A Fixture Talk on Prayer', session: 'Sunday Morning',
  url: 'https://www.churchofjesuschrist.org/study/general-conference/2026/10/fixture?lang=eng',
  quotes: ['When we pray with real intent, the heavens are closer than we suppose, and help comes in the Lord’s own time.'],
  scriptures: ['Moroni 10:4'],
  quick: 'Prayer can be more than words at bedtime: offered with real intent, it becomes a conversation that changes the one who prays, and it opens the way for help the Lord has been ready to give all along.',
  points: ['Real intent means being willing to act on the answer.', 'Small and simple prayers count, said often.', 'Answers can come through other people.'],
  discuss: ['When has a prayer of yours been answered through someone else?', 'What could make our family prayer feel less rushed?']
};
const NEW_TALK = {
  story: { title: 'A note left on the kitchen table', text: 'A young mother who had just moved felt alone and prayed one morning for a friend. That afternoon she found a note on her kitchen table from a neighbor she had barely met, inviting her to walk together each evening. The neighbor had felt a prompting and almost ignored it. The speaker tells it to show that the Lord often answers one person’s prayer through another person’s small act.' },
  invite: [
    { ask: 'I invite you to pray tonight with real intent, and then to sit quietly for a minute before you rise.', promise: 'As you do, I promise you will begin to recognize His answers in the ordinary hours of your day.' },
    { ask: 'Please pray for one person by name this week, and then do one thing for them.', promise: null }
  ],
  try: 'Tonight, pray for one person by name, then sit quietly for one minute before you get up.'
};
const card = (id, kind, q, right, wrong) => Object.assign({ id, hook: 'Fixture card ' + id, body: 'A fixture card’s body: the idea first, in plain words a youth can read in a few seconds, with the point the question asks about.',
  find: 'a short line found on the page', q, right, wrong, why: 'Because the fixture says so, plainly.' }, kind ? { kind } : {});
function cardsFile(sun) {
  const month = sun.slice(0, 7), other = dayAdd(sun, dayAdd(sun, -7).startsWith(month) ? -7 : 7);
  const lesson = (id, sunday, cards, more = {}) => Object.assign({ id, sunday, title: 'Fixture lesson ' + id, read: 'https://www.churchofjesuschrist.org/study/manual/for-the-strength-of-youth/fixture?lang=eng',
    intro: 'A fixture lesson: read the page, then try these cards on what it teaches.', cards }, more);
  const fxNew = approve(lesson('fx-new', sun, [
    card('fx-new-a', 'scenario', 'A friend says reading scriptures is boring. Which idea could help?', 'Ask what they have read lately', ['Tell them it never is', 'Change the subject']),
    card('fx-new-b', 'verse', 'In the fixture verses, what kept people on the path?', 'Holding to the rod', ['Walking faster', 'Following the crowd']),
    card('fx-new-c', 'recall', 'What is the fixture lesson about?', 'Choosing the right', ['Sports', 'Cooking'])],
    { try: 'Memorize Moroni 10:4 and say it when you start your day.', reflect: 'When have you felt close to Heavenly Father this week?' }));
  const fxOld = approve(lesson('fx-old', other, [card('fx-old-a', null, 'What does the old card ask?', 'The old answer', ['Wrong one', 'Wrong two']), card('fx-old-b', null, 'And its second?', 'The second answer', ['Wrong three', 'Wrong four'])]));
  // Approved, then its `reflect` changed: the fingerprint covers it, so it's hidden until approved again.
  const fxChanged = Object.assign(approve(lesson('fx-changed', other, [card('fx-ch-a', 'scenario', 'Changed lesson question?', 'Yes', ['No', 'Maybe'])], { reflect: 'The question as approved?' })), { reflect: 'The question changed after approval?' });
  const talk = (id, extra, ok = true) => { const t = Object.assign({ id }, TALK, extra); return ok ? approve(t) : t; };
  const talks = [talk('fx-talk-new', NEW_TALK), talk('fx-talk-old', {}), talk('fx-talk-draft', NEW_TALK, false),
    Object.assign(talk('fx-talk-changed', NEW_TALK), { try: 'A try changed after the talk was approved, so it waits for approval again.' })];
  return '// The Sunday test\'s own content/sunday.js.\nwindow.TU_SUNDAY = ' + JSON.stringify({
    youth: [{ month, chapter: 10, title: 'Fixture chapter', guide: 'https://www.churchofjesuschrist.org/study/manual/for-the-strength-of-youth/fixture?lang=eng', lessons: [fxNew, fxOld, fxChanged] }],
    conference: [{ id: '2026-10', title: 'October 2026 General Conference', from: dayAdd(sun, -3), talks }]
  }, null, 2) + ';\n';
}
export const cardsFixture = cardsFile;

async function closeSheet(p) { if (!(await p.$eval('#appSheet', e => e.hidden))) { await p.click('#appClose'); await wait(300); } }
async function openTalkSheet(p, id) {
  await closeSheet(p);
  await p.click('#tabs [data-tab="study"]'); await wait(700);
  await p.locator(`#home [data-talk="${id}"]`).first().click(); await wait(400);
}
const sheetHtml = (p, id) => p.$eval('#appBody', (e, id) => e.innerHTML.split(id).join('ID'), id);
// The youth's lesson from Study, every card answered right; `at(kind, step)` sees each step.
async function playLesson(p, id, at) {
  await closeSheet(p);
  await p.click('#tabs [data-tab="study"]'); await wait(700);
  await p.locator(`#home [data-sunlesson="${id}"]`).first().click(); await wait(500);
  for (let i = 0; i < 30; i++) {
    const k = await p.$eval('#lessonBody', b => b.dataset.step);
    await at(k);
    if (k === 'end') return;
    if (k === 'sunq') {
      const q = (await p.locator('#lessonBody .ls-prompt').first().innerText()).trim();
      const right = await p.evaluate(q => { for (const m of window.TU_SUNDAY.youth) for (const l of m.lessons) for (const c of l.cards) if (c.q === q) return c.right; }, q);
      await p.locator(`#lessonBody [data-ls="pick"][data-v="${right}"]`).first().click(); await wait(100);
      await p.click('#lessonFoot [data-ls="check"]'); await wait(450);
    }
    await p.click('#lessonFoot [data-ls="next"]'); await wait(450);
  }
}

async function cards({ port, sun }) {
  const live = `http://127.0.0.1:${port}/index.html`, test = `http://127.0.0.1:${port}/TreasureUp-test/index.html`;
  const files = { 'content/sunday.js': cardsFile(sun) };
  const dev = await device('cards', { url: live, day: sun + 'T09:00:00', files });
  const p = dev.page;

  // A talk with all three: the story after the quick summary, the invitation and its promise as quotes, Try this week by the questions.
  await openTalkSheet(p, 'fx-talk-new');
  const t = await p.evaluate(() => {
    const b = document.getElementById('appBody'), q = (s, el = b) => el.querySelector(s), all = s => [...b.querySelectorAll(s)];
    const after = (a, z) => !!(a && z && (a.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING));
    const quick = [...b.querySelectorAll('p.reel-body')].find(e => /Prayer can be more than words/.test(e.textContent));
    const talkOver = all('.talk-h').find(e => e.textContent === 'To talk over'), story = q('.talk-story'), inv = all('.talk-invite'), tr = q('.talk-try');
    return {
      story: story && story.textContent, storyAfterQuick: after(quick, story) && after(story, q('blockquote.ins-quote:not(.talk-invite *)')) && after(q('blockquote.ins-quote:not(.talk-invite *)'), inv[0]) && after(inv[inv.length - 1], talkOver),
      invites: inv.map(x => ({ head: q('.talk-h', x).textContent, ask: q('blockquote.ins-quote', x).textContent, promise: x.querySelector('.talk-promise') ? q('.talk-promise', x).textContent : null })),
      tryText: tr && tr.textContent, tryAfterTalkOver: after(talkOver, tr) };
  });
  check(/📖 The story/.test(t.story) && /A note left on the kitchen table/.test(t.story) && /A young mother who had just moved/.test(t.story) && t.storyAfterQuick,
    'cards: a talk’s 📖 The story shows after the quick summary, its title and text; the invitation comes after the talk’s quotes');
  check(t.invites.length === 2 && t.invites.every(x => x.head === '🙋 The invitation') && t.invites[0].ask === '“I invite you to pray tonight with real intent, and then to sit quietly for a minute before you rise.”',
    'cards: 🙋 The invitation shows each ask in the quotes’ style, in quote marks: ' + t.invites.map(x => x.ask.slice(0, 30)).join(' | '));
  check(/✨ The promise/.test(t.invites[0] && t.invites[0].promise || '') && /I promise you will begin to recognize/.test(t.invites[0].promise) && t.invites[1] && t.invites[1].promise === null,
    'cards: ✨ The promise shows under its invitation, and not for an invitation whose promise is null');
  check(/✅ Try this week/.test(t.tryText || '') && /pray for one person by name/.test(t.tryText) && t.tryAfterTalkOver, 'cards: ✅ Try this week shows after To talk over');
  const withNew = await sheetHtml(p, 'fx-talk-new');

  // Without them: none of the blocks, and the very same HTML as the talk with them, less its new blocks.
  await openTalkSheet(p, 'fx-talk-old');
  check(await p.locator('#appBody .talk-story, #appBody .talk-invite, #appBody .talk-try').count() === 0 && !/The story|The invitation|The promise|Try this week/.test(await txt(p, '#appBody')),
    'cards: a talk without them has no story, invitation, promise or Try this week');
  const without = await sheetHtml(p, 'fx-talk-old');
  const stripped = await p.evaluate(html => { const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('.talk-story, .talk-invite, .talk-try').forEach(e => e.remove()); return d.innerHTML; }, withNew);
  check(stripped === without, 'cards: a talk without the new fields renders exactly as before (the same HTML as one with them, less their blocks)');

  // Not approved: the speaker's invitation and promise show, as quotes do; our story and Try this week wait.
  await openTalkSheet(p, 'fx-talk-draft');
  check(await p.locator('#appBody .talk-invite').count() === 2 && await p.locator('#appBody .talk-story, #appBody .talk-try').count() === 0,
    'cards: a talk not yet approved shows the speaker’s invitation and promise, but not our story or Try this week');
  // Approved, then its `try` changed: the fingerprint covers it, so our words wait for approval again.
  await openTalkSheet(p, 'fx-talk-changed');
  check(await p.locator('#appBody .talk-story, #appBody .talk-try').count() === 0 && !/Prayer can be more than words/.test(await txt(p, '#appBody')),
    'cards: changing a talk’s Try this week after approval hides our words until it’s approved again (the fingerprint covers it)');

  // The youth's lesson: each card's kind on its question, then Try this week and Think about it at the end.
  const labels = [];
  let end = null;
  await playLesson(p, 'fx-new', async k => {
    if (k === 'sunq') labels.push(await p.$$eval('#lessonBody .sun-kind', els => els.map(e => e.textContent).join('|')));
    if (k === 'sunread' && await p.locator('#lessonBody .sun-kind').count()) labels.push('on a read step');
    if (k === 'end') end = await p.evaluate(() => {
      const a = document.querySelector('#lessonBody .sun-after');
      return a && { tryText: a.querySelector('.sun-try').textContent, reflect: a.querySelector('.sun-reflect').textContent, inputs: a.querySelectorAll('input, textarea, button').length,
        afterTitle: !!(document.querySelector('#lessonBody .ls-done .reel-body').compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
  });
  check(labels.join(',') === 'Real life,In the verses,', 'cards: the youth player labels a scenario “Real life”, a verse “In the verses”, a recall nothing: ' + JSON.stringify(labels));
  check(!!end && /✅ Try this week/.test(end.tryText) && /Memorize Moroni 10:4/.test(end.tryText) && /💭 Think about it/.test(end.reflect) && /When have you felt close/.test(end.reflect) && end.afterTitle,
    'cards: after the last card, the lesson’s end shows ✅ Try this week and 💭 Think about it');
  check(!!end && end.inputs === 0, 'cards: Think about it is just the question, with nothing to answer');
  await p.click('#lessonFoot [data-ls="close"]'); await wait(400);
  const s = await state(p);
  check(['fx-new-a', 'fx-new-b', 'fx-new-c'].every(id => (s.sunday || {})[id] && s.sunday[id].right), 'cards: the quiz works as before: each card answered and kept');

  // A lesson without them: no labels, nothing extra at the end.
  let oldLabels = 0, oldEnd = -1;
  await playLesson(p, 'fx-old', async k => {
    oldLabels += await p.locator('#lessonBody .sun-kind').count();
    if (k === 'end') oldEnd = await p.locator('#lessonBody .sun-after').count();
  });
  check(oldLabels === 0 && oldEnd === 0, 'cards: a lesson without kinds, try or reflect has no labels and no end blocks');
  await p.click('#lessonFoot [data-ls="close"]'); await wait(400);
  await p.click('#tabs [data-tab="study"]'); await wait(600);
  check(await p.locator('#home [data-sunlesson="fx-new"]').count() === 1 && await p.locator('#home [data-sunlesson="fx-changed"]').count() === 0,
    'cards: a lesson whose reflect changed after approval waits for approval again (the fingerprint covers it)');

  // The Shorts deck of the same lesson: the label on its question, and the end blocks on its last card.
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.shortDeck = 'sunday'; b.id = 'fxDeck'; document.getElementById('home').appendChild(b); b.click(); b.remove(); }); await wait(400);
  check(/Real life/i.test(await txt(p, '#appBody .sun-kind')) && await p.locator('#appBody .sun-after').count() === 0, 'cards: the Shorts deck labels its first card, with no end blocks yet');
  await p.locator('#appBody .sp-story-bar[data-sunday-step="2"]').click(); await wait(300);
  check(await p.locator('#appBody .sun-kind').count() === 0 && /Try this week/i.test(await txt(p, '#appBody .sun-after')) && /Think about it/i.test(await txt(p, '#appBody .sun-after')),
    'cards: the Shorts deck’s last card (a recall: no label) ends with Try this week and Think about it');
  check(!p.errors.length, 'cards: no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();

  // The committed content (no new fields yet): none of the new blocks anywhere.
  {
    const d = await device('cards-committed', { url: live, day: sun + 'T09:00:00' });
    const q = d.page;
    await q.click('#tabs [data-tab="study"]'); await wait(700);
    const talks = await q.$$eval('#home [data-talk]', els => els.map(e => e.dataset.talk));
    let extra = 0;
    for (const id of talks.slice(0, 5)) { await openTalkSheet(q, id); extra += await q.locator('#appBody .talk-story, #appBody .talk-invite, #appBody .talk-try').count(); }
    await closeSheet(q);
    const lesson = await q.$$eval('#home [data-sunlesson]', els => els.map(e => e.dataset.sunlesson)[0]);
    if (lesson) await playLesson(q, lesson, async () => { extra += await q.locator('#lessonBody .sun-kind, #lessonBody .sun-after').count(); });
    check(talks.length > 0 && extra === 0, `cards: the committed content/sunday.js shows none of the new blocks (${Math.min(5, talks.length)} talks, ${lesson ? 'a lesson' : 'no lesson'})`);
    await d.ctx.close();
  }

  // Developer mode, with a stand-in for GitHub: the previews show the new parts; Edit, Done keeps a null promise null.
  const repos = { 'blakemerrell/TreasureUp-test': { 'content/weeks.js': '// test\nwindow.TU_WEEKS = [];\n', 'content/sunday.js': files['content/sunday.js'] }, 'blakemerrell/TreasureUp': { 'content/weeks.js': '// live\nwindow.TU_WEEKS = [];\n' } };
  const gd = await device('cards-dev', { url: test, day: sun + 'T09:00:00', files });
  const g = gd.page;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' };
  let commits = 0;
  await g.route('https://api.github.com/**', async r => {
    const req = r.request(), u = new URL(req.url()), json = (status, body) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const m = /^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/.exec(u.pathname);
    if (m && req.method() === 'GET') { const text = (repos[m[1]] || {})[m[2]]; return text == null ? json(404, { message: 'Not Found' }) : json(200, { sha: 'sha-' + m[2], content: Buffer.from(text).toString('base64') }); }
    if (m && req.method() === 'PUT') { repos[m[1]][m[2]] = Buffer.from(JSON.parse(req.postData()).content, 'base64').toString('utf8'); return json(200, { commit: { sha: 'c' + (++commits) }, content: { sha: 'sha-' + commits } }); }
    if (/\/check-runs$/.test(u.pathname)) return json(200, { check_runs: [{ id: 1, status: 'completed', conclusion: 'success' }] });
    return json(404, { message: 'Not Found' });
  });
  await g.evaluate(() => { window.TU_DEV_TEST = { token: 'test-token', poll: 50 }; location.hash = '#dev/sunday/' + encodeURIComponent('talk:fx-talk-draft'); });
  await wait(1500);
  await g.click('#devBody [data-dev="cancel"]').catch(() => {}); await wait(300);
  const openItem = async key => { if (!(await g.locator(`#devBody .dv-item[data-item="${key}"]`).count())) { const more = g.locator('#devBody button.dv-row[data-dev="group"]'); if (await more.count()) { await more.first().click(); await wait(300); } await g.locator(`#devBody button.dv-row[data-item="${key}"]`).first().click(); await wait(300); } return g.locator(`#devBody .dv-item[data-item="${key}"]`).innerText(); };
  const talkPv = await openItem('talk:fx-talk-draft');
  check(/📖 The story: A note left on the kitchen table/.test(talkPv) && /🙋 “I invite you to pray tonight/.test(talkPv) && /✨ “As you do, I promise/.test(talkPv) && /✅ Try this week/.test(talkPv) && /the invitation · found word for word/.test(talkPv),
    'cards: developer mode previews a talk’s story, invitation, promise and Try this week');
  const lessonPv = await openItem('sunl:fx-changed');
  check(/Kind: scenario · labelled “Real life”/.test(lessonPv) && /💭 Think about it \(at the end, no answer\)/.test(lessonPv) && /The question changed after approval/.test(lessonPv),
    'cards: developer mode previews a youth card’s kind and the lesson’s Think about it');
  // Edit the draft talk's Try this week, Done, Approve, Save: the promise that was null is still null, and the fingerprint is the app's.
  await openItem('talk:fx-talk-draft');
  await g.click('#devBody [data-dev="edit"][data-key="talk:fx-talk-draft"]'); await wait(300);
  const tryBox = g.locator('#devBody .dv-editor [data-path="try"]');
  check(/Try this week/.test(await g.locator('#devBody .dv-editor label', { has: g.locator('[data-path="try"]') }).innerText()) && /The invitation \(the speaker’s exact words\)/.test(await txt(g, '#devBody .dv-editor')), 'cards: developer mode’s form names the new fields');
  await tryBox.fill('Tonight, pray for one person by name.');
  await g.click('#devBody [data-dev="done"]'); await wait(300);
  await g.click('#devBody [data-dev="approve"][data-key="talk:fx-talk-draft"]'); await wait(300);
  await g.click('#devBar [data-dev="save"]'); await wait(1500);
  const saved = (() => { const box = {}; new Function('window', repos['blakemerrell/TreasureUp-test']['content/sunday.js'])(box); return box.TU_SUNDAY.conference[0].talks.find(x => x.id === 'fx-talk-draft'); })();
  check(!!saved && saved.try === 'Tonight, pray for one person by name.' && saved.invite[1].promise === null && saved.approved === fingerprint(saved),
    'cards: Edit and Save keep a null promise null, and Approve fingerprints the talk with its new fields');
  check(!g.errors.length, 'cards: no errors in developer mode' + (g.errors.length ? ': ' + g.errors.join(' | ') : ''));
  await gd.ctx.close();
}
