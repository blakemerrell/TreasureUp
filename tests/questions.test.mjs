// Questions friends ask (content/questions.js), a shelf under the Standard
// Works in the Scriptures tab, with the test's own questions (never the
// committed ones): no shelf with none approved, or with only a draft; with
// one approved, the card, the four areas, a question's short answer, Go
// deeper, Learn more from Scripture Central (a podcast in a new tab; none
// without `more`), its sources in a new tab, the Talk with Mom or Dad note, and the
// back gesture a step at a time. The test site shows a draft, marked. Then
// developer mode (with a stand-in for GitHub): a draft's notes to look at,
// Approve and save (the fingerprint tools/verify.mjs checks), and Publish
// copies the file to the live app.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, check, device, note, txt, wait } from './lib.mjs';
import { qaHash } from '../tools/questions.mjs';

const filler = (what, n) => Array.from({ length: n }, (_, i) => i ? 'word' : what).join(' ') + '.';
// A question in the shape content/README.md describes, approved or a draft.
function q(id, area, where, heard, { parent = false, approve = true, review, more } = {}) {
  const x = {
    id, area, heard, where,
    kid: [filler(`Short answer for ${id}`, 40), filler('Second short paragraph', 30)],
    deeper: [filler(`Deeper reading for ${id}`, 120), filler('More of the deeper reading', 100)],
    parent,
    sources: [{ t: 'Fixture page one', by: 'Fixture Source', u: 'https://example.org/one' }, { t: 'Fixture page two', by: 'Another Source', u: 'https://example.org/two', checked: 'search' }]
  };
  if (more) x.more = more;
  if (review) x.review = review;
  if (approve) x.approved = qaHash(x);
  return x;
}
const file = questions => '// The questions test\'s own content/questions.js.\nwindow.TU_QUESTIONS = ' + JSON.stringify({ questions }, null, 2) + ';\n';
const APPROVED = [
  q('fx-god', 'god', 'online', 'Fixture question about God?', { parent: true }),
  q('fx-bible', 'bible', 'school', 'Fixture question about the Bible?', { more: [
    { t: 'Fixture podcast episode', kind: 'podcast', u: 'https://podcasts.apple.com/us/podcast/fixture-episode/id1' },
    { t: 'Fixture KnoWhy', kind: 'knowhy', u: 'https://scripturecentral.org/knowhy/fixture' }] }),
  q('fx-bom', 'bom', 'friend', 'Fixture question about the Book of Mormon?'),
  q('fx-history', 'history', 'school', 'Fixture question about Church history?', { more: [] })
];
const DRAFT = q('fx-draft', 'bom', 'online', 'Fixture draft nobody approved?', { approve: false, review: ['Fixture note for Blake: check the second source.'],
  more: [{ t: 'Fixture Church History Matters episode', kind: 'podcast', u: 'https://scripturecentral.org/podcast/fixture' }] });

const built = f => fs.existsSync(path.join(ROOT, f));
// The Scriptures tab's shelf needs content/library.js, which only the deploy builds: a stand-in otherwise.
const LIBRARY = built('content/library.js') ? {} : { 'content/library.js': 'window.TU_LIBRARY = ' + JSON.stringify([{ name: 'Old Testament', books: [['Genesis', 50]] }, { name: 'Book of Mormon', books: [['1 Nephi', 22]] }]) + ';' };

async function scriptures(p) {
  await p.click('#tabs [data-tab="scriptures"]'); await wait(900);
}

export default async function questions({ port }) {
  const live = `http://127.0.0.1:${port}/index.html`, test = `http://127.0.0.1:${port}/TreasureUp-test/index.html`;
  if (!Object.keys(LIBRARY).length) note('NOTE', 'questions: content/library.js is built, so the real shelf is used');

  // No questions approved: no shelf. A draft alone: still none, outside the test site and developer mode.
  {
    const d = await device('none', { url: live, files: Object.assign({ 'content/questions.js': file([]) }, LIBRARY) });
    await scriptures(d.page);
    check(await d.page.locator('#home .lib-vols-shelf').count() === 1 && await d.page.locator('#home .qa-card').count() === 0, 'questions: with no approved questions the Scriptures tab has no Questions friends ask');
    await d.ctx.close();
    const e = await device('draft-only', { url: live, files: Object.assign({ 'content/questions.js': file([DRAFT]) }, LIBRARY) });
    await scriptures(e.page);
    check(await e.page.locator('#home .lib-vols-shelf').count() === 1 && await e.page.locator('#home .qa-card').count() === 0, 'questions: an unapproved draft alone shows no shelf on the live app');
    await e.ctx.close();
  }

  // Four approved, one draft, on the live app.
  const dev = await device('phone', { url: live, files: Object.assign({ 'content/questions.js': file([...APPROVED, DRAFT]) }, LIBRARY) });
  const p = dev.page;
  await scriptures(p);
  const card = p.locator('#home .qa-card');
  check(await card.count() === 1, 'questions: with approved questions the shelf shows, under the Standard Works');
  const cardText = await txt(p, '#home .qa-card');
  check(/Heard it at school or on TikTok\?/.test(cardText) && /4 questions/.test(cardText) && !/draft/i.test(cardText), `questions: the card has its hook and counts only the approved (${cardText})`);
  const order = await p.evaluate(() => { const s = document.querySelector('#home .lib-vols-shelf'), c = document.querySelector('#home .qa-card'); return !!(s && c && (s.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  check(order, 'questions: the card comes after the volumes');

  await card.click(); await wait(500);
  const areas = await p.$$eval('#home [data-qa-area] .eyebrow', els => els.map(e => e.textContent.trim()));
  check(areas.length === 4 && ['God & Jesus', 'The Bible', 'The Book of Mormon', 'Church history'].every((t, i) => (areas[i] || '').endsWith(t)), `questions: the page has the four areas in order (${areas.join(' · ')})`);
  const rows = await p.$$eval('#home .qa-row', els => els.map(e => ({ id: e.dataset.qaOpen, where: e.querySelector('.qa-where').textContent.trim(), heard: e.querySelector('.qa-heard').textContent.trim() })));
  check(rows.length === 4 && !rows.some(r => r.id === 'fx-draft'), `questions: each area lists its approved questions, and the draft isn't there (${rows.map(r => r.id).join(', ')})`);
  const icon = id => (rows.find(r => r.id === id) || {}).where;
  check(icon('fx-bible') === '🏫' && icon('fx-god') === '📱' && icon('fx-bom') === '💬', 'questions: each row has its where-icon (🏫 school, 📱 online, 💬 a friend)');
  check(!(await p.content()).includes('Fixture draft nobody approved'), 'questions: the draft is nowhere on the live app');

  // A question: its title, the short answer, Go deeper folded until tapped.
  await p.click('#home [data-qa-open="fx-bible"]'); await wait(500);
  check((await txt(p, '#home .qa-h')).startsWith('Fixture question about the Bible?'), 'questions: a question opens with what he heard as its title');
  check(/Short answer for fx-bible/.test(await txt(p, '#home .qa-kid')), 'questions: the short answer shows');
  check(await p.locator('#home .qa-parent').count() === 0, 'questions: no Talk with Mom or Dad note when parent is false');
  const deeper = p.locator('#home .qa-deeper');
  check(await deeper.isHidden(), 'questions: Go deeper starts folded');
  await p.click('#home [data-qa-deeper]'); await wait(200);
  check(await deeper.isVisible() && /Deeper reading for fx-bible/.test(await deeper.innerText()) && await p.getAttribute('#home [data-qa-deeper]', 'aria-expanded') === 'true', 'questions: Go deeper opens the longer answer');

  // Learn more from Scripture Central: after Go deeper and before the sources, each with its kind; a podcast opens in a new tab.
  const learn = await p.evaluate(() => {
    const sec = document.querySelector('#home .qa-learn'), d = document.querySelector('#home .qa-deeper'), src = [...document.querySelectorAll('#home .eyebrow')].find(e => /Where this comes from/.test(e.textContent));
    return { order: !!(sec && d && src && (d.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING) && (sec.compareDocumentPosition(src) & Node.DOCUMENT_POSITION_FOLLOWING)),
      head: sec ? sec.querySelector('.eyebrow').textContent : '', rows: sec ? [...sec.querySelectorAll('a')].map(a => ({ kind: a.dataset.kind, text: a.textContent, target: a.target })) : [] };
  });
  check(learn.order && /Learn more from Scripture Central/.test(learn.head), 'questions: Learn more from Scripture Central comes after Go deeper and before the sources');
  check(learn.rows.length === 2 && /🎧/.test(learn.rows[0].text) && /Podcast/.test(learn.rows[0].text) && /Fixture podcast episode/.test(learn.rows[0].text) && /💡/.test(learn.rows[1].text) && /KnoWhy/.test(learn.rows[1].text) && learn.rows.every(r => r.target === '_blank'),
    `questions: each Learn more row has its kind's icon and label and its title (${learn.rows.map(r => r.text.replace(/\s+/g, ' ').trim()).join(' · ')})`);
  {
    const asked = dev.ctx.waitForEvent('request', { predicate: r => r.url().startsWith('https://podcasts.apple.com/us/podcast/fixture-episode'), timeout: 5000 }).catch(() => null);
    const [tab] = await Promise.all([dev.ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('#home .qa-learn a[data-kind="podcast"]')]);
    const req = await asked;
    check(!!tab && tab !== p && !!req && req.frame().page() === tab && await p.locator('#home .qa-h').count() === 1, 'questions: a podcast row opens the episode in a new tab');
    if (tab) await tab.close();
  }

  // Sources: each its publisher and title, opening in a new tab.
  const links = await p.$$eval('#home .qa-src:not(.qa-more-link)', els => els.map(a => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent })));
  check(links.length === 2 && links.every(l => l.target === '_blank' && /noopener/.test(l.rel)) && /Fixture Source/.test(links[0].text) && /Fixture page one/.test(links[0].text), 'questions: the sources show who and what, as links to a new tab');
  // (The stand-in browser reaches no other site, so the new tab asks for the page and stops there.)
  const asked = dev.ctx.waitForEvent('request', { predicate: r => r.url().startsWith('https://example.org/one'), timeout: 5000 }).catch(() => null);
  const [tab] = await Promise.all([dev.ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('#home .qa-src:not(.qa-more-link) >> nth=0')]);
  const req = await asked;
  check(!!tab && tab !== p && !!req && req.frame().page() === tab, 'questions: tapping a source opens it in a new tab');
  if (tab) await tab.close();
  check(await p.locator('#home .qa-h').count() === 1, 'questions: the question is still open behind it');

  // The back gesture: the question, then the questions, then the shelf.
  await p.goBack(); await wait(500);
  check(await p.locator('#home [data-qa-area]').count() === 4 && await p.locator('#home .qa-h').count() === 0, 'questions: back from a question goes to the questions');
  await p.goBack(); await wait(500);
  check(await p.locator('#home .qa-card').count() === 1 && await p.locator('#home [data-qa-area]').count() === 0, 'questions: back again goes to the shelf');

  // Parent: true shows the note at the top, before the answer.
  await p.click('#home .qa-card'); await wait(400);
  await p.click('#home [data-qa-open="fx-god"]'); await wait(400);
  const parentFirst = await p.evaluate(() => { const n = document.querySelector('#home .qa-parent'), k = document.querySelector('#home .qa-kid'); return !!(n && k && (n.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  check(parentFirst && /Talk with Mom or Dad/.test(await txt(p, '#home .qa-parent')), 'questions: parent: true shows Talk with Mom or Dad above the answer');
  check(await p.locator('#home .qa-learn').count() === 0, 'questions: no Learn more section for a question without `more`');
  await p.click('#home [data-qa-back]'); await wait(400);
  await p.click('#home [data-qa-open="fx-history"]'); await wait(400);
  check(await p.locator('#home .qa-h').count() === 1 && await p.locator('#home .qa-learn').count() === 0, 'questions: no Learn more section when `more` is empty');
  check(!p.errors.length, `questions: no errors on the live app (${p.errors.join(' | ') || 'none'})`);
  await dev.ctx.close();

  // The test site shows the draft too, marked as other drafts are.
  const t = await device('test-site', { url: test, files: Object.assign({ 'content/questions.js': file([...APPROVED, DRAFT]) }, LIBRARY) });
  await scriptures(t.page);
  check(/1 draft/.test(await txt(t.page, '#home .qa-card')), 'questions: on the test site the card counts the draft');
  await t.page.click('#home .qa-card'); await wait(400);
  const draftRow = t.page.locator('#home [data-qa-open="fx-draft"]');
  check(await draftRow.count() === 1 && /Draft: not approved yet/.test(await draftRow.innerText()), 'questions: on the test site the draft is listed with the draft mark');
  await t.ctx.close();

  // Developer mode, with a stand-in for GitHub: the draft's notes, Approve, Save and Publish.
  const repos = {
    'blakemerrell/TreasureUp-test': { 'content/weeks.js': '// test\nwindow.TU_WEEKS = [];\n', 'content/questions.js': file([...APPROVED, DRAFT]) },
    'blakemerrell/TreasureUp': { 'content/weeks.js': '// live\nwindow.TU_WEEKS = [];\n' }
  };
  const gd = await device('developer', { url: test, files: Object.assign({ 'content/questions.js': file([...APPROVED, DRAFT]) }, LIBRARY) });
  const g = gd.page;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' };
  let commits = 0;
  await g.route('https://api.github.com/**', async r => {
    const req = r.request(), u = new URL(req.url()), json = (status, body) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const m = /^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/.exec(u.pathname);
    if (m && req.method() === 'GET') {
      const text = (repos[m[1]] || {})[m[2]];
      return text == null ? json(404, { message: 'Not Found' }) : json(200, { sha: 'sha-' + m[2], content: Buffer.from(text).toString('base64') });
    }
    if (m && req.method() === 'PUT') {
      const body = JSON.parse(req.postData());
      repos[m[1]][m[2]] = Buffer.from(body.content, 'base64').toString('utf8');
      return json(200, { commit: { sha: 'c' + (++commits) }, content: { sha: 'sha-' + commits } });
    }
    if (/\/check-runs$/.test(u.pathname)) return json(200, { check_runs: [{ id: 1, status: 'completed', conclusion: 'success' }] });
    return json(404, { message: 'Not Found' });
  });
  await g.evaluate(() => { window.TU_DEV_TEST = { token: 'test-token', poll: 50 }; location.hash = '#dev/questions/' + encodeURIComponent('qa:fx-draft'); });
  await wait(1500);
  check(await g.locator('#dev:not([hidden])').count() === 1 && /Questions friends ask/.test(await txt(g, '#devTitle')), 'questions: developer mode opens on Questions friends ask from its link');
  await g.click('#devBody [data-dev="cancel"]').catch(() => {}); await wait(300);
  const item = g.locator('#devBody .dv-item[data-item="qa:fx-draft"]');
  const itemText = await item.innerText().catch(() => '');
  check(/Look at these first/.test(itemText) && /check the second source/.test(itemText) && /Fixture draft nobody approved/.test(itemText) && /Draft/.test(itemText), 'questions: developer mode shows a draft with its notes to look at first');
  check(/Learn more from Scripture Central/.test(itemText) && /Fixture Church History Matters episode/.test(itemText), 'questions: developer mode shows its Learn more links');
  await g.click('#devBody [data-dev="approve"][data-key="qa:fx-draft"]'); await wait(300);
  await g.click('#devBar [data-dev="save"]'); await wait(1500);
  const saved = (() => { const box = {}; new Function('window', repos['blakemerrell/TreasureUp-test']['content/questions.js'])(box); return box.TU_QUESTIONS.questions; })();
  const x = saved.find(y => y.id === 'fx-draft');
  check(!!x && x.approved === qaHash(x) && saved.length === 5, 'questions: Approve and Save puts its fingerprint on the test site (the one tools/verify.mjs checks)');
  check(!!x && (x.more || []).length === 1 && qaHash(Object.assign({}, x, { more: [] })) !== x.approved, 'questions: the fingerprint covers `more`, so changing its links needs approving again');
  check(/Checked, and on the test site/.test(await txt(g, '#devBar')), 'questions: developer mode says it was checked and is on the test site');
  await g.click('#devBar [data-dev="publish"]'); await wait(1500);
  const read = text => { const box = {}; new Function('window', text || '')(box); return box.TU_QUESTIONS; };
  const pub = read(repos['blakemerrell/TreasureUp']['content/questions.js']);
  check(!!pub && JSON.stringify(pub) === JSON.stringify(read(repos['blakemerrell/TreasureUp-test']['content/questions.js'])), 'questions: Publish copies content/questions.js to the live app');
  check(/on the live app, exactly as they are here/.test(await txt(g, '#devBar')), 'questions: then developer mode says the questions are on the live app');
  check(!g.errors.length, `questions: no errors in developer mode (${g.errors.join(' | ') || 'none'})`);
  await gd.ctx.close();
}
