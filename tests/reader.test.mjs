// The reader's buttons on the Book of Mormon (Blake, 2026-10-10): no KJV
// button there (its text always shows), Notes still there, and Changes and
// JS Papers, which a Bible chapter doesn't have; Changes on shows what
// changed in a verse since 1830 (when content/changes/ has been built by
// tools/build-reading.mjs), and JS Papers links to the Joseph Smith Papers.
// Without the built chapters (a pull request's run), small stand-ins for
// them are served, so the buttons are still checked.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, check, device, note, txt, wait } from './lib.mjs';

const built = f => fs.existsSync(path.join(ROOT, f));
const lib = (ch, n) => `(window.TU_LIB = window.TU_LIB || {})[${JSON.stringify(ch)}] = ${JSON.stringify({ v: Array.from({ length: n }, (_, i) => `Verse ${i + 1} of ${ch}.`) })};`;

export default async function reader({ port }) {
  const files = {};
  if (!built('content/library.js')) files['content/library.js'] = 'window.TU_LIBRARY = ' + JSON.stringify([
    { name: 'Old Testament', books: [['Genesis', 50]] }, { name: 'Book of Mormon', books: [['1 Nephi', 22], ['Alma', 63]] },
    { name: 'Doctrine and Covenants', books: [['Doctrine and Covenants', 138]] }]) + ';';
  for (const [ch, n] of [['1 Nephi 11', 36], ['Genesis 1', 31], ['Doctrine and Covenants 4', 7]]) {
    const f = `content/lib/${ch.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.js`;
    if (!built(f)) files[f] = lib(ch, n);
  }
  if (Object.keys(files).length) note('NOTE', `reader: the chapters aren't built (node tools/build-reading.mjs), so stand-ins are served for ${Object.keys(files).length} files`);

  const dev = await device('phone', { url: `http://127.0.0.1:${port}/index.html`, files });
  const p = dev.page;
  // Open a chapter as the Scriptures tab does.
  const open = async ch => {
    await p.evaluate(ch => {
      const b = document.createElement('button');
      b.dataset.libCh = ch;
      document.getElementById('home').appendChild(b);
      b.click();
      b.remove();
    }, ch);
    await wait(900);
  };
  const buttons = () => p.$$eval('#viewBody .plain-bar [data-layer]', els => els.map(e => e.dataset.layer));
  const close = async () => { await p.click('#viewBack'); await wait(400); };

  await open('1 Nephi 11');
  let b = await buttons();
  check(!b.includes('kjv'), `1 Nephi 11 has no KJV button (${b.join(', ')})`);
  check(await p.locator('#viewBody .ls-vv p.lead').count() > 0, 'and its verses show');
  check(b.includes('notes'), 'Notes is still there');
  check(b.includes('changes') && b.includes('jsp'), 'Changes and JS Papers are there');
  const fits = await p.$eval('#viewBody .plain-bar', bar => { const r = [...bar.querySelectorAll('.lay')].map(x => x.getBoundingClientRect()); return r.every(x => Math.abs(x.top - r[0].top) < 2) && r.every(x => x.right <= bar.getBoundingClientRect().right + 1); });
  check(fits, 'the buttons are one row that fits');

  // Changes on: 1 Nephi 11:18, "the mother of God" became "the mother of the Son of God" in 1837.
  await p.click('#viewBody [data-layer="changes"]'); await wait(900);
  if (built('content/changes/1-nephi-11.js')) {
    const v18 = await txt(p, '#viewBody .ls-vv[data-v="18"]');
    check(/1837/.test(v18) && /the Son of God/.test(v18), 'Changes on: 1 Nephi 11:18 shows the 1837 change “of God” → “of the Son of God”');
    check(await p.$eval('#viewBody .ls-vv[data-v="18"]', e => e.classList.contains('chg')), 'and the verse is marked');
    check(/BYU Office of Digital Humanities \(OpenScripture\)/.test(await txt(p, '#viewBody')), 'the data is credited');
    // The small changes stay folded until asked for.
    const shown = await p.locator('#viewBody .ls-vv[data-v="18"] .chg-more[open]').count();
    check(shown === 0 && await p.locator('#viewBody .ls-vv[data-v="18"] .chg-more summary').count() === 1, 'its other changes are a tap away');
    // Verse 2 changed only in small ways ("saith" → "said"): nothing under it, until small changes are asked for.
    const small = () => p.locator('#viewBody .ls-vv[data-v="2"] .chg-more').count();
    const before = await small();
    await p.click('#viewBody [data-layer="chgAll"]'); await wait(400);
    check(before === 0 && await small() === 1, 'a verse changed only in small ways shows them once “Show small changes too” is on');
    await p.click('#viewBody [data-layer="chgAll"]'); await wait(300);
  } else note('NOTE', 'reader: content/changes/ isn\'t built, so the changes themselves weren\'t checked');
  await p.click('#viewBody [data-layer="changes"]'); await wait(300);

  // JS Papers on: links to josephsmithpapers.org, in a new tab.
  await p.click('#viewBody [data-layer="jsp"]'); await wait(900);
  if (built('content/jsp-bom.js')) {
    const links = await p.$$eval('#viewBody .ls-jspbox a', as => as.map(a => [a.href, a.target, a.textContent]));
    check(links.length >= 2 && links.every(([h, t]) => /^https:\/\/www\.josephsmithpapers\.org\/paper-summary\//.test(h) && t === '_blank'),
      `JS Papers on: ${links.length} links to the Joseph Smith Papers, each in a new tab`);
    check(links.some(([h, , t]) => /book-of-mormon-1830\/29$/.test(h) && /pp\. 23–26/.test(t)), 'the 1830 edition\'s pages for 1 Nephi 11 (pp. 23–26)');
  } else note('NOTE', 'reader: content/jsp-bom.js isn\'t built, so the links weren\'t checked');
  await p.click('#viewBody [data-layer="jsp"]'); await wait(300);
  await close();

  // A Bible chapter: the KJV button as before, and neither of the Book of Mormon's.
  await open('Genesis 1');
  b = await buttons();
  check(b.includes('kjv') && !b.includes('changes') && !b.includes('jsp'), `Genesis 1 keeps its KJV button and has no Changes or JS Papers (${b.join(', ')})`);
  await close();

  // The Doctrine and Covenants: no KJV button either; Notes stays.
  await open('Doctrine and Covenants 4');
  b = await buttons();
  check(!b.includes('kjv') && b.includes('notes') && !b.includes('changes'), `Doctrine and Covenants 4: Notes, no KJV (${b.join(', ')})`);
  check(await p.locator('#viewBody .ls-vv p.lead').count() > 0, 'and its verses show');
  await close();
  check(!p.errors.length, 'no errors');
  await dev.ctx.close();
}
