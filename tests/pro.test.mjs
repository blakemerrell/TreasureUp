// Pro Mode in the Season notebook (Blake, 2026-10-08): Simple as it was;
// ✨ Pro on, roles and a mission, a goal for the year and a 90-day goal under
// it, Sunday's plan for the week, Monday's top 3 (from the plan and typed)
// ticked in the notebook and on Today, the month's review; Simple again is
// the notebook exactly as before, and Pro again still has it all. Then two
// devices' Pro data merged by the app's own mergeProgress.
import { check, device, setDay, state, wait } from './lib.mjs';

const SUNDAY = '2026-10-11', MONDAY = '2026-10-12';

export default async function pro({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const dev = await device('pro', { url, day: SUNDAY + 'T19:00:00' });
  const p = dev.page;
  // A grown-up with one Simple goal this Season, as the Season's planning would leave it.
  await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => /^treasureup.*v1$/.test(x)) || 'treasureup.v1', S = JSON.parse(localStorage.getItem(k) || '{}');
    S.seasonWho = 'adult';
    S.seasons = { '2026-Q4': { goals: [{ id: 'gS', area: 'spiritual', text: 'Talk with Heavenly Father every day', why: 'I want to know Him', steps: [{ id: 'tS', text: 'Pray morning and night', n: 7 }], status: 'on', made: '2026-10-05', upd: Date.now() }],
      ticks: { tS: { '2026-10-05': Date.now(), '2026-10-06': Date.now() } }, checks: {}, reflect: {} } };
    localStorage.setItem(k, JSON.stringify(S));
  });
  await p.reload(); await wait(1500);
  const season = async () => { await p.click('#tabs [data-tab="season"]'); await wait(500); };
  const tab = async t => { await p.click(`#home .nb-tabs [data-nb-tab="${t}"]`); await wait(400); };
  const notebook = () => p.evaluate(() => { const c = document.querySelector('#home .sea-tab').cloneNode(true); c.querySelectorAll('.shop-msg').forEach(e => e.remove()); return c.innerHTML; });
  const pro = async () => (await state(p)).pro || {};
  const live = m => Object.entries(m || {}).filter(([, x]) => x && !x.gone);
  const add = async (sel, text) => { await p.fill(sel, text); await p.press(sel, 'Enter'); await wait(350); };

  await season();
  const simple = await notebook();
  check((await p.locator('#home .nb-tabs button').count()) === 5 && (await p.getAttribute('#home [data-pro-mode]', 'aria-checked')) === 'false',
    'Simple: the notebook’s five pages, and ✨ Pro off');

  // ✨ Pro on: with no roles yet it opens on 🧭 Mission.
  await p.click('#home [data-pro-mode]'); await wait(500);
  check((await p.locator('#home .nb-tabs button').count()) === 10 && (await p.getAttribute('#home [data-nb-tab="pmission"]', 'aria-selected')) === 'true',
    'Pro on: five planner pages in front, opened on Mission');
  await p.click('#home [data-pro-role-idea="Father"]'); await wait(350);
  await p.click('#home [data-pro-role-idea="Disciple of Christ"]'); await wait(350);
  await add('#proRole', 'Business owner');
  await p.fill('#proMission', 'Love God, lift my family, do honest work.');
  await p.click('#home [data-pro-mission]'); await wait(400);
  let P = await pro();
  const roles = Object.fromEntries(live(P.roles).map(([id, r]) => [r.name, id]));
  check(Object.keys(roles).join('|') === 'Father|Disciple of Christ|Business owner' && /honest work/.test((P.mission || {}).text || ''),
    `roles and a mission saved (${Object.keys(roles).join(', ')})`);

  // 🎯 Year: a goal as a father, and a 90-day goal under it.
  await tab('pyear');
  await add(`#proY-${roles.Father}`, 'Be present with my kids');
  P = await pro();
  const yg = live(P.goals).find(([, g]) => g.lvl === 'year');
  await add(`#proQ-${yg[0]}`, 'A one-on-one with each child every week');
  P = await pro();
  const qg = live(P.goals).find(([, g]) => g.lvl === 'q');
  check(yg[1].role === roles.Father && yg[1].year === 2026 && qg && qg[1].up === yg[0] && qg[1].sid === '2026-Q4',
    'a year goal for Father, and a 90-day goal under it for this Season');

  // 🗓️ Sunday: the week is next week's plan, and a card says so on the other pages.
  await tab('ptoday');
  check(await p.locator('#home .nb-due[data-pro-tab="pweek"]').count() === 1, 'Sunday: “Plan next week” is due');
  await p.click('#home .nb-due[data-pro-tab="pweek"]'); await wait(400);
  check(/Plan next week/.test(await p.innerText('#home .nb-page .nb-h')), 'it opens Plan next week');
  await p.fill(`#proRk-${roles.Father}`, 'Breakfast date with Sam');
  await p.selectOption(`#proRkG-${roles.Father}`, qg[0]);
  await p.selectOption(`#proRkD-${roles.Father}`, MONDAY);
  await p.click(`#home [data-pro-rock-add="${roles.Father}"]`); await wait(350);
  await p.fill(`#proRk-${roles['Disciple of Christ']}`, 'Temple trip');
  await p.selectOption(`#proRkD-${roles['Disciple of Christ']}`, '2026-10-15');
  await p.click(`#home [data-pro-rock-add="${roles['Disciple of Christ']}"]`); await wait(350);
  await add(`#proRk-${roles['Business owner']}`, 'Finish the quote tool');
  P = await pro();
  let rocks = live(P.rocks).map(([id, r]) => Object.assign({ id }, r));
  const temple = rocks.find(r => r.text === 'Temple trip');
  await p.selectOption(`#home [data-pro-rock-day="${temple.id}"]`, '2026-10-14'); await wait(400);
  P = await pro(); rocks = live(P.rocks).map(([id, r]) => Object.assign({ id }, r));
  const by = t => rocks.find(r => r.text === t) || {};
  check(rocks.length === 3 && rocks.every(r => r.wk === MONDAY) && by('Breakfast date with Sam').day === MONDAY && by('Breakfast date with Sam').goal === qg[0]
    && by('Temple trip').day === '2026-10-14' && by('Finish the quote tool').day === '',
    'three big rocks for next week, on their days (one moved), one toward the 90-day goal');

  // Simple again: the notebook exactly as it was; Pro again: everything still there.
  await p.click('#home [data-pro-mode]'); await wait(500);
  check((await p.locator('#home .nb-tabs button').count()) === 5, 'Simple again: the planner pages are gone');
  await p.reload(); await wait(1500); await season();
  check(await notebook() === simple, 'and the notebook is exactly as it was before Pro');
  check(!!(await pro()).roles && live((await pro()).rocks).length === 3, 'with the Pro data kept');
  await p.click('#home [data-pro-mode]'); await wait(500);
  check(/Today’s top 3/.test(await p.innerText('#home .nb-page .nb-h')) && live((await pro()).roles).length === 3, 'Pro again: it opens on Today, the roles still there');

  // ⭐ Monday: the top 3, from the day's plan and typed, ticked here and on Today.
  await setDay(dev, MONDAY + 'T07:00:00'); await season();
  check(/Today’s top 3/.test(await p.innerText('#home .nb-page .nb-h')), 'Monday: Pro opens on Today’s top 3');
  const picks = await p.locator('#home [data-pro-top-rock]').allInnerTexts();
  check(/Breakfast date/.test(picks[0] || '') && /today/.test(picks[0] || '') && picks.some(x => /quote tool/.test(x)) && !picks.some(x => /Temple/.test(x)),
    `the plan offers today’s big rock first, then any-day ones (${picks.map(x => x.replace(/\s+/g, ' ')).join(' / ')})`);
  await p.click(`#home [data-pro-top-rock="${by('Breakfast date with Sam').id}"]`); await wait(350);
  await p.click(`#home [data-pro-top-rock="${by('Finish the quote tool').id}"]`); await wait(350);
  await add('#proTop', 'Call Mom');
  P = await pro();
  const top = ((P.tops || {})[MONDAY] || {}).items || [];
  check(top.length === 3 && !(await p.locator('#proTop').count()), 'three picked, and no room for a fourth');
  await p.click('#home [data-pro-top="0"]'); await wait(350);
  check(!!(((await pro()).rocks || {})[by('Breakfast date with Sam').id] || {}).done, 'ticking a big rock in the top 3 ticks it on the week too');
  await p.click('#tabs [data-tab="today"]'); await wait(600);
  const rows = await p.locator('#home .pth-btn[data-pro-top]').allInnerTexts();
  check(rows.length === 3 && /Breakfast date/.test(rows[0]), `Today lists the top 3 (${rows.length})`);
  await p.click('#home .pth-btn[data-pro-top="2"]'); await wait(500);
  check(!!(((await pro()).tops[MONDAY].items[2]) || {}).done && (await p.getAttribute('#home .pth-btn[data-pro-top="2"]', 'aria-pressed')) === 'true', 'and ticks one there');
  await season(); await tab('pweek');
  check(/This week/.test(await p.innerText('#home .nb-page .nb-h')) && /Breakfast date/.test(await p.innerText('#home .pro-day.now')), 'the week shows today’s big rocks first');

  // 📅 The month's review: what got done, and three questions.
  await tab('pmonth');
  const tiles = await p.innerText('#home .nb-tiles');
  check(/1 of 3\s*big rocks done/.test(tiles) && /2 of 3\s*top-3 things done/.test(tiles), 'October: 1 of 3 big rocks and 2 of 3 top-3 things done');
  await p.fill('#proMo-worked', 'Planning on Sunday night.');
  await p.fill('#proMo-didnt', 'Too many rocks for work.');
  await p.fill('#proMo-change', 'Two rocks a role, no more.');
  await p.click('#home [data-pro-month]'); await wait(400);
  const mo = ((await pro()).months || {})['2026-10'] || {};
  check(mo.worked === 'Planning on Sunday night.' && mo.change === 'Two rocks a role, no more.' && mo.got && mo.got.rocks === 1 && mo.got.of === 3, 'the review is saved with what got done');

  // Simple: Today is as it was; Pro again: it's all there.
  await p.click('#home [data-pro-mode]'); await wait(500);
  await p.click('#tabs [data-tab="today"]'); await wait(600);
  check(!(await p.locator('#home [data-pro-top], #home [data-pro-tab]').count()), 'Simple: no top 3 on Today');
  await season(); await p.click('#home [data-pro-mode]'); await wait(500);
  await tab('pmonth');
  check((await p.inputValue('#proMo-worked')) === 'Planning on Sunday night.', 'Pro again: the review is still there');
  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));

  // Two devices: the family's copy added a role, this one a role and a later mission, and ticked a rock.
  const [m] = await p.evaluate(cases => cases.map(([R, L, B]) => TreasureUp.mergeProgress(R, L, B)), [[
    { xp: 0, proMode: true, pro: { mission: { text: 'old', upd: 1 }, roles: { a: { name: 'Father', at: 1, upd: 1 } }, rocks: { k: { wk: MONDAY, text: 'Run', done: '', upd: 5 } } } },
    { xp: 0, proMode: false, pro: { mission: { text: 'new', upd: 9 }, roles: { b: { name: 'Friend', at: 2, upd: 2 } }, rocks: { k: { wk: MONDAY, text: 'Run', done: MONDAY, upd: 8 } } } },
    { xp: 0, proMode: true, pro: { mission: { text: 'old', upd: 1 }, roles: {}, rocks: { k: { wk: MONDAY, text: 'Run', done: '', upd: 5 } } } }]]);
  check(m.pro.roles.a && m.pro.roles.b && m.pro.mission.text === 'new' && m.pro.rocks.k.done === MONDAY && m.proMode === false,
    'two devices’ Pro data merge: both roles, the later mission and tick, and the switch changed on either');
  await dev.ctx.close();
}
