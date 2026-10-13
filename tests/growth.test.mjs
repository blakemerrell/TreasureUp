// The Growth Coach (2026-10-11): a birthday instead of an age, so the stage
// moves on by itself (Primary until January of the year he turns 12, then
// Youth); no interests picked for him; and the ones he types in and his
// superpower show up as ideas, with the turning-12 ideas in the year he turns 12.
import { check, device, state, txt, wait } from './lib.mjs';

export default async function growth({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const dev = await device('growth', { url, day: '2026-10-12T16:30:00' });
  const p = dev.page;
  const sheet = () => txt(p, '#appBody');
  await p.click('#setBtn'); await wait(300);
  await p.click('#appSheet [data-set-go="profile"]'); await wait(400);
  check(!(await p.locator('#appSheet [data-coach-age]').count()) && await p.locator('#coachBornM').count() === 1, 'step 1 asks for a birthday (month and year), not an age');
  await p.fill('#coachName', 'Sam');
  await p.selectOption('#coachBornM', '4'); await wait(300);
  await p.selectOption('#coachBornY', '2015'); await wait(400);
  const s1 = await sheet();
  check(/Age 11 · Primary until January 2027, then Youth/.test(s1), 'born April 2015, in October 2026: ' + (/Age[^|]*/.exec(s1) || [''])[0]);
  check(await p.locator('#appSheet .coach-chip.on[data-coach-who="child"]').count() === 1, 'so the profile is for a child (Primary)');
  check(/Turning 12 this year/i.test(s1), 'with the turning-12 note');
  check(await p.inputValue('#coachName') === 'Sam', 'and the name typed before the birthday is kept');

  await p.click('#appSheet [data-coach-goto="2"]'); await wait(300);
  check(/\(0 selected\)/i.test(await sheet()) && !(await p.locator('#appSheet [data-coach-toggle-int].on').count()), 'no interests are picked for him');
  await p.click('#appSheet [data-coach-toggle-int="Basketball"]'); await wait(200);
  await p.fill('#coachCustomInt', 'Fishing'); await p.click('#appSheet [data-coach-add-custom]'); await wait(200);
  await p.click('#appSheet [data-coach-goto="3"]'); await wait(300);
  await p.click('#appSheet [data-coach-sp="Loyal Friend"]'); await wait(200);
  await p.click('#appSheet [data-coach-finish]'); await wait(600);
  const prof = (await state(p)).profile || {};
  check(prof.born === '2015-04' && prof.who === 'child' && JSON.stringify(prof.interests) === '["Basketball","Fishing"]' && prof.superpower === 'Loyal Friend',
    `saved: born ${prof.born}, ${prof.who}, ${JSON.stringify(prof.interests)}, ${prof.superpower}`);

  // The Season's ideas, area by area.
  const ideas = async area => {
    await p.click('#tabs [data-tab="season"]'); await wait(500);
    if (await p.locator('[data-season="discover"]').count()) { await p.locator('[data-season="discover"]').first().click(); await wait(400); }
    await p.click(`[data-season-area="${area}"]`); await wait(300);
    const t = await p.$$eval('.sea-ideas .sea-idea b', bs => bs.map(b => b.textContent));
    await p.click('#appClose').catch(() => {}); await wait(300);
    return t;
  };
  const sp = await ideas('spiritual'), so = await ideas('social'), it = await ideas('intellectual');
  check(sp.some(t => /Getting ready for 12/.test(t)) && sp.some(t => /Temple prep/.test(t)), 'the year he turns 12, the spiritual ideas get him ready for 12: ' + sp.join(', '));
  check(!sp.some(t => /For the Strength of Youth|Seminary ready/.test(t)), 'but not the youth ones yet');
  check(it.some(t => /Get better at Fishing/.test(t)), 'one he typed in becomes an idea: ' + it.join(', '));
  check(so.some(t => /My strength: Loyal Friend/.test(t)), 'and his superpower: ' + so.join(', '));

  // January 2027: Youth, by itself.
  await p.evaluate(() => localStorage.setItem('fakeNow', '2027-01-11T16:30:00')); await p.reload(); await wait(1800);
  const sp2 = await ideas('spiritual');
  check(sp2.some(t => /For the Strength of Youth/.test(t)) && !sp2.some(t => /Getting ready for 12/.test(t)), 'in January 2027 he is a youth without anyone changing it: ' + sp2.join(', '));
  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();
}
