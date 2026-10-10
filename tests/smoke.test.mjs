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
  const readerBefore = await p.$eval('[data-pass-turn]', e => e.closest('div').querySelector('b').textContent.trim());
  await p.click('[data-pass-turn]'); await wait(300);
  const readerAfter = await p.$eval('[data-pass-turn]', e => e.closest('div').querySelector('b').textContent.trim());
  check(readerBefore && readerAfter && readerBefore !== readerAfter, `Family turn rotation advances reader (${readerBefore} → ${readerAfter})`);
  check(await p.locator('.flow [data-familynight], .flow [data-short-deck="family"]').count() > 0, 'Family Night card/hero renders in Family Study');
  await p.click('[data-study-mode="personal"]'); await wait(400);
  check(/(Personal|My) Study/i.test(await txt(p, '[data-study-mode="personal"]')), 'Personal Study switches back');
  check(await p.locator('.flow [data-familynight]').count() === 0, 'No Family Night card in Personal Study');

  // The Way: Morning Blueprint
  check(await p.locator('[data-open-blueprint]').count() > 0, 'Morning Blueprint card renders');
  await p.click('[data-open-blueprint]'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)), 'Morning Blueprint sheet opens');
  await p.fill('#bpOneThing', 'Be patient and listen to Javan');
  await p.fill('#bpUplift', 'Send an encouraging note to Chantel');
  await p.fill('#bpGratitude', '- Morning sunlight\n- Peaceful prayer\n- Good health\n- Excess fourth line');
  if (await p.locator('[data-bp-share]').count() > 0) {
    await p.click('[data-bp-share]'); await wait(200);
    const typed = await p.$eval('#bpOneThing', e => e.value);
    check(typed === 'Be patient and listen to Javan', 'Toggling share preserves typed input in place');
  }
  await p.click('[data-bp-save]'); await wait(400);
  const homeTxt = await txt(p, '#home');
  check(homeTxt.includes('Be patient and listen to Javan'), 'Blueprint saved and renders on Today');
  check(homeTxt.includes('Morning sunlight') && homeTxt.includes('Good health'), 'Morning gratitude items saved with Blueprint');
  check(!homeTxt.includes('Excess fourth line'), 'Gratitude capped at 3 items max');
  check(await p.locator('.flow > .blueprint-card').count() === 0, 'No blueprint box at the top of Today');
  check(await p.locator('.goals-section .bp-check-item').count() >= 2, 'To-dos piped into Goal Achievements section');
  await p.click('.goals-section [data-bp-check="oneThing"]'); await wait(300);
  check(await p.locator('.goals-section .bp-check-item.done').count() > 0, 'To-do item checkoff works in Goal Achievements');

  // The Way: Book of Mormon Living Water Micro-Dose
  check(await p.locator('[data-bom-open]').count() > 0, 'Book of Mormon row renders in path');
  await p.click('[data-bom-open]'); await wait(400);
  check((await txt(p, '#appBody')).includes('Book of Mormon · Living Water'), 'Book of Mormon sheet opens');
  await p.click('[data-bom-sheet-mark]'); await wait(400);
  check((await txt(p, '#home')).includes('📜 Book of Mormon'), 'Book of Mormon marked read');

  // The Way: Evening Accounting (Return & Report)
  check(await p.locator('[data-open-evening]').count() > 0, 'Evening Accounting card renders');
  await p.click('[data-open-evening]'); await wait(400);
  check(/Return & Report/i.test(await txt(p, '#appBody')), 'Evening Accounting sheet opens');
  await p.fill('#evMercies', 'Felt peace during our morning study');
  await p.click('[data-ev-save]'); await wait(400);
  const cardTxt = await txt(p, '.evening-card');
  check(/Return & Report Completed/i.test(cardTxt), 'Evening Accounting saved and reports back');
  const flowOrder = await p.$$eval('#home .flow > *', els => els.map(e => e.className.split(' ')[0]));
  const phaseIdx = ['daily-walk', 'fl-list', 'goals-section', 'evening-card'].map(c => flowOrder.indexOf(c));
  check(phaseIdx.every((v, i) => v >= 0 && (i === 0 || v > phaseIdx[i - 1])), 'Today flow order: Walk → Keep going → Goals → Return & Report');

  await p.click('#stillBtn'); await wait(400);
  check(!(await p.$eval('#stillLayer', e => e.hidden)), 'Be still opens');
  await p.click('#stillClose').catch(() => p.keyboard.press('Escape')); await wait(400);
  check(await p.$eval('#stillLayer', e => e.hidden), 'and closes');
  await p.click('#setBtn'); await wait(400);
  check(!(await p.$eval('#appSheet', e => e.hidden)), 'the settings sheet opens');
  await p.click('[data-set-go="profile"]'); await wait(400);
  check((await txt(p, '#appBody')).includes('Growth Coach Setup'), 'Growth Coach Profile walkthrough opens from Settings');
  await p.click('[data-coach-goto="2"]'); await wait(300);
  check((await txt(p, '#appBody')).includes('What do you love to do?'), 'Growth Coach interests step opens');
  await p.click('[data-coach-toggle-int="Basketball"]'); await wait(200);
  await p.click('[data-coach-goto="3"]'); await wait(300);
  check((await txt(p, '#appBody')).includes('Your Superpower & Focus'), 'Growth Coach superpower step opens');
  await p.click('[data-coach-finish]'); await wait(400);
  check(await p.$eval('#appSheet', e => e.hidden), 'Growth Profile saved and sheet closes');

  // Verify Coach Suggestions in Discover tab
  await p.click('#tabs [data-tab="season"]'); await wait(400);
  if (await p.locator('[data-season="discover"]').count() > 0) {
    await p.click('[data-season="discover"]'); await wait(400);
    await p.click('[data-season-area="spiritual"]'); await wait(300);
    const discTxt = await txt(p, '#appBody');
    check(/Coach Suggestions/i.test(discTxt), 'Coach suggestions render in Discover');
    check(!discTxt.includes('1 times a week'), 'Coach suggestions use proper frequency phrasing (not 1 times a week)');
    const cip = p.locator('[data-coach-idea-pick]').first();
    if (await cip.count() > 0) {
      await cip.click(); await wait(300);
      check((await txt(p, '#appBody')).includes('Plan'), 'Picking Coach suggestion opens Plan draft');
    }
    await p.click('[data-season="home"]'); await wait(300);
  }
  check(!p.errors.length, 'no page errors in the app' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();

  for (const [name, url] of [['the TV page', 'tv/'], ['Wika', 'amigo/index.html'], ['Title of Liberty', 'liberty/index.html']]) {
    const d = await device(name, { url: base + url });
    await wait(500);
    check(!d.page.errors.length && (await d.page.evaluate(() => document.body.innerText.trim().length)) > 0, `${name} loads with no errors` + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
    await d.ctx.close();
  }
}
