// Two devices' copies of his progress, merged by the app's own mergeProgress
// (B is what they last agreed on, R the family's copy, L this device's): what
// one device did since must count once, never twice and never lost (review,
// 2026-10-07). Then start-up: a week isn't filed twice, and old things that
// only matter for a while are trimmed so the family's copy stays under its limit.
import { check, note, device, setDay, state, wait, built } from './lib.mjs';

export default async function merge({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const d = await device('merge', { url });
  const run = cases => d.page.evaluate(cases => cases.map(([R, L, B]) => TreasureUp.mergeProgress(R, L, B)), cases);
  const day = '2026-10-15', base = { xp: 1000 };
  const [still, recall, climb, won, back, both, who1, who2, hist] = await run([
    // Be still: 10 minutes when they last met; 15 on the family's copy, 13 here.
    [{ ...base, still: { [day]: 15 } }, { ...base, still: { [day]: 13 } }, { ...base, still: { [day]: 10 } }],
    // The warm-up's question answered right on both devices the same day: paid on both.
    [{ ...base, xp: 1015, daily: { day, done: { r1: { right: true, xp: 15 } } } }, { ...base, xp: 1015, daily: { day, done: { r1: { right: true, xp: 15 } } } }, { ...base, daily: { day, done: {} } }],
    // Scripture Climb paid on both devices the same day.
    [{ ...base, xp: 1020, climbDay: day, climbPaid: { day, xp: 20 } }, { ...base, xp: 1020, climbDay: day, climbPaid: { day, xp: 20 } }, { ...base, climbDay: '2026-10-14', climbPaid: { day: '2026-10-14', xp: 20 } }],
    // A freeze won here (the puzzle) on a day the family's copy also studied.
    [{ ...base, freezes: 0, lastStudy: day }, { ...base, freezes: 1, lastStudy: day }, { ...base, freezes: 0, lastStudy: day }],
    // A freeze given back here (the day it covered caught up); the family's copy still has it used.
    [{ ...base, freezes: 0, frozen: { '2026-10-13': 1 }, lastStudy: day }, { ...base, freezes: 1, frozen: {}, filled: { '2026-10-13': 1 }, lastStudy: day }, { ...base, freezes: 0, frozen: { '2026-10-13': 1 }, lastStudy: day }],
    // Both devices used a freeze for the same missed day.
    [{ ...base, freezes: 0, frozen: { '2026-10-13': 1 }, lastStudy: day }, { ...base, freezes: 0, frozen: { '2026-10-13': 1 }, lastStudy: day }, { ...base, freezes: 1, frozen: {}, lastStudy: '2026-10-12' }],
    // A setting changed here since they met (youth → adult); the family's copy unchanged.
    [{ ...base, seasonWho: 'youth' }, { ...base, seasonWho: 'adult' }, { ...base, seasonWho: 'youth' }],
    // Changed on the family's copy instead.
    [{ ...base, seasonWho: 'adult' }, { ...base, seasonWho: 'youth' }, { ...base, seasonWho: 'youth' }],
    // Two years' week 39: different weeks, both kept.
    [{ ...base, history: [{ num: 39, title: 'Lesson 39 of 2026' }] }, { ...base, history: [{ num: 39, title: 'Lesson 39 of 2027' }] }, { ...base, history: [] }],
  ]);
  check(still.still[day] === 18, `Be still: 15 on the family's copy and 13 here, from 10, make 18 (${still.still[day]})`);
  check(recall.xp === 1015, `the warm-up's question answered on both devices pays once (${recall.xp}, want 1015)`);
  check(climb.xp === 1020, `Scripture Climb on both devices the same day pays once (${climb.xp}, want 1020)`);
  check(won.freezes === 1, `a freeze won here isn't lost (${won.freezes})`);
  check(back.freezes === 1 && !(back.frozen || {})['2026-10-13'], `a freeze given back here is given back once (freezes ${back.freezes}, still frozen: ${!!(back.frozen || {})['2026-10-13']})`);
  check(both.freezes === 0, `both devices using a freeze for the same day costs one (left: ${both.freezes}, want 0)`);
  check(who1.seasonWho === 'adult' && who2.seasonWho === 'adult', `a setting changed on either device is kept (${who1.seasonWho}, ${who2.seasonWho})`);
  check(hist.history.length === 2, `2026's and 2027's week 39 are both kept (${hist.history.length})`);

  // Start-up: last week filed in history already (a merge brought its title back) isn't filed again;
  // weeks past the last 8 keep whether he was right, not what he picked; old marks of deletion go.
  const old = Date.now() - 90 * 864e5, history = Array.from({ length: 12 }, (_, i) => ({ title: 'Week ' + i, num: 30 + i, right: 1, answered: 1, read: 1,
    rec: { answers: { ['q' + i]: { right: true, picked: 'The words he picked, which take room' } }, bonus: {}, deep: {}, read: [] } }));
  await d.page.evaluate(([history, old]) => {
    const S = JSON.parse(localStorage.getItem('treasureup.v1') || '{}');
    Object.assign(S, { weekTitle: 'Week 11', weekNum: 41, answers: { q11: { right: true, picked: 'x', day: '2026-01-01' } }, history,
      impressions: Object.assign(S.impressions || {}, { gone1: { gone: true, upd: old }, gone2: { gone: true, upd: Date.now() } }) });
    localStorage.setItem('treasureup.v1', JSON.stringify(S));
  }, [history, old]);
  await d.page.reload(); await wait(1500);
  const s = await state(d.page);
  check(s.history.filter(h => h.title === 'Week 11').length === 1, `a week already in history isn't filed again (${s.history.filter(h => h.title === 'Week 11').length})`);
  check(!('picked' in s.history[0].rec.answers.q0) && 'picked' in s.history[s.history.length - 1].rec.answers.q11, 'weeks past the last 8 keep whether he was right, not what he picked; the last 8 keep both');
  check(!s.impressions.gone1 && !!s.impressions.gone2, 'a deleted note’s mark goes after 60 days, not before');
  // A chapter half read in a past week (part 1 paid 25), read later from the Scriptures tab: it pays the other 25, not 50.
  if (!built) note('NOTE', 'the chapters aren’t built here (the deploy builds them): the Scriptures tab check is skipped');
  else {
  await d.page.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('treasureup.v1'));
    S.history.push({ title: 'A past week', num: 1, right: 0, answered: 0, read: 0, rec: { answers: {}, bonus: {}, deep: {}, read: [], parts: { 'Genesis 1': 25 } } });
    S.streak = 0; S.days = {}; S.filled = {};
    localStorage.setItem('treasureup.v1', JSON.stringify(S));
  });
  await d.page.reload(); await wait(1500);
  const x0 = (await state(d.page)).xp || 0;
  await d.page.click('#tabs [data-tab="scriptures"]'); await wait(800);
  if (await d.page.locator('[data-lib-vol="Old Testament"]').count()) { await d.page.click('[data-lib-vol="Old Testament"]'); await wait(300); }   // the library by volume, then book
  await d.page.click('[data-lib-book="Genesis"]'); await wait(300);
  await d.page.click('[data-lib-ch="Genesis 1"]'); await wait(1200);
  await d.page.click('[data-lib-mark]'); await wait(300);
  if (await d.page.locator('[data-lib-readyes]').count()) { await d.page.click('[data-lib-readyes]'); await wait(300); }
  const x1 = (await state(d.page)).xp || 0;
  check(x1 - x0 === 25, `Genesis 1, half read in a past week, read from the Scriptures tab pays the rest: +${x1 - x0} (want +25)`);
  }
  check(!d.page.errors.length, 'no page errors' + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
  await d.ctx.close();
}
