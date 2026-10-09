// The app opens on today's date with no errors; every tab, Be still and the
// settings sheet open; the TV page, Wika and Title of Liberty load.
import { check, device, txt, wait } from './lib.mjs';

export default async function smoke({ port }) {
  const base = `http://127.0.0.1:${port}/`;
  const dev = await device('phone', { url: base + 'index.html' });
  const p = dev.page;
  check(/\w/.test(await txt(p, '#home .fl-date')) || /\w/.test(await txt(p, '#home')), 'Today opens: ' + (await txt(p, '#home .fl-date')).slice(0, 60));
  for (const tab of ['study', 'scriptures', 'games', 'season', 'today']) {
    await p.click(`#tabs [data-tab="${tab}"]`); await wait(500);
    check((await txt(p, '#home')).length > 20, `the ${tab} tab shows something`);
  }
  // Family Study toggle on Today
  await p.click('[data-study-mode="family"]'); await wait(400);
  check(/Family Study/i.test(await txt(p, '#home .fl-date')), 'Family Study switches on');
  check(await p.locator('.video-hero-card').count() > 0, 'Family video hero card renders');
  await p.click('[data-pass-turn]'); await wait(300);
  check((await txt(p, '#home')).includes('Tonight’s reader:'), 'Family turn rotation works');
  await p.click('[data-study-mode="personal"]'); await wait(400);
  check(/(Personal|My) Study/i.test(await txt(p, '[data-study-mode="personal"]')), 'Personal Study switches back');

  // The Way: Morning Blueprint
  check(await p.locator('[data-open-blueprint]').count() > 0, 'Morning Blueprint card renders');
  await p.click('[data-open-blueprint]'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)), 'Morning Blueprint sheet opens');
  await p.fill('#bpOneThing', 'Be patient and listen to Javan');
  await p.fill('#bpUplift', 'Send an encouraging note to Chantel');
  await p.click('[data-bp-save]'); await wait(400);
  check((await txt(p, '#home')).includes('Be patient and listen to Javan'), 'Blueprint saved and renders on Today');
  await p.click('[data-bp-check="oneThing"]'); await wait(300);
  check(await p.locator('.bp-check-item.done').count() > 0, 'Blueprint item checkoff works');

  // The Way: Book of Mormon Living Water Micro-Dose
  check(await p.locator('[data-bom-open]').count() > 0, 'Book of Mormon row renders in path');
  await p.click('[data-bom-open]'); await wait(400);
  check((await txt(p, '#appBody')).includes('Book of Mormon · Living Water'), 'Book of Mormon sheet opens');
  await p.click('[data-bom-sheet-mark]'); await wait(400);
  check((await txt(p, '#home')).includes('📜 Book of Mormon'), 'Book of Mormon marked read');

  // The Way: Evening Accounting
  check(await p.locator('[data-open-evening]').count() > 0, 'Evening Accounting card renders');
  await p.click('[data-open-evening]'); await wait(400);
  check((await txt(p, '#appBody')).includes('Evening Accounting'), 'Evening Accounting sheet opens');
  await p.fill('#evMercies', 'Felt peace during our morning study');
  await p.click('[data-ev-save]'); await wait(400);
  const cardTxt = await txt(p, '.evening-card');
  check(/Evening Report Completed/i.test(cardTxt), 'Evening Accounting saved and reports back');

  await p.click('#stillBtn'); await wait(400);
  check(!(await p.$eval('#stillLayer', e => e.hidden)), 'Be still opens');
  await p.click('#stillClose').catch(() => p.keyboard.press('Escape')); await wait(400);
  check(await p.$eval('#stillLayer', e => e.hidden), 'and closes');
  await p.click('#setBtn'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)), 'the settings sheet opens');
  check(!p.errors.length, 'no page errors in the app' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();

  for (const [name, url] of [['the TV page', 'tv/'], ['Wika', 'amigo/index.html'], ['Title of Liberty', 'liberty/index.html']]) {
    const d = await device(name, { url: base + url });
    await wait(500);
    check(!d.page.errors.length && (await d.page.evaluate(() => document.body.innerText.trim().length)) > 0, `${name} loads with no errors` + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
    await d.ctx.close();
  }
}
