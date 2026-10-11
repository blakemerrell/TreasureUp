// Sunday's Today opens with the morning routine, like every other day (2026-10-11: "Add them on
// Sundays"): Be still and the Morning Council at the top of Sunday's own list, the Council saved once and
// paid once, its to-dos in Goal Achievements and Return & Report under the list; neither holds the day back
// (a family game still keeps it); a youth's and a grown-up's titles; not in Family Study or on another day's
// view of Sunday, as on the other days; and the family's merge keeps a Sunday Council.
import { check, device, setDay, state, txt, wait, liveWeek, dayAdd } from './lib.mjs';

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
}
