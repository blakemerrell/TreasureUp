// The weekly puzzle in a week with only three lesson sections: three groups of four
// (2026-10-17: "3 groups of 4"). The live week, given three sections and a three-group
// puzzle in the test's own content/weeks.js, its reels answered so the puzzle is open.
import fs from 'node:fs';
import path from 'node:path';
import { check, device, txt, wait, liveWeek, ROOT } from './lib.mjs';

export default async function puzzle({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const src = fs.readFileSync(path.join(ROOT, 'content', 'weeks.js'), 'utf8'), MARK = 'window.TU_WEEKS = ', cut = src.indexOf(MARK);
  const weeks = JSON.parse(src.slice(cut + MARK.length).replace(/;\s*$/, ''));
  const live = weeks.find(w => w.title === liveWeek().title);
  if (!live || !live.puzzle) { check(false, 'the live week has a puzzle to build the test from'); return; }
  live.sections = live.sections.slice(0, 3);
  live.puzzle = { groups: live.puzzle.groups.slice(0, 3).map((g, i) => ({ section: i, tiles: g.tiles })) };
  const text = src.slice(0, cut) + MARK + JSON.stringify(weeks) + ';\n';

  const d = await device('pz3', { url, files: { 'content/weeks.js': text } });
  await d.page.evaluate(ids => {
    const key = Object.keys(localStorage).find(k => /^treasureup(-test)?\.v1$/.test(k));
    const S = JSON.parse(localStorage.getItem(key));
    S.answers = S.answers || {};
    for (const id of ids) S.answers[id] = S.answers[id] || { right: true, picked: 0, day: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(key, JSON.stringify(S));
  }, live.reels.map(r => r.id));
  await d.page.reload(); await wait(1800);

  await d.page.click('#tabs [data-tab="games"]'); await wait(500);
  const row = await txt(d.page, '[data-game="puzzle"]');
  check(/Sort 12 ideas into this week's 3 lesson sections/.test(row), `the Games tab's row: 12 ideas, 3 sections (${row.slice(0, 90)})`);
  await d.page.click('[data-game="puzzle"]'); await wait(600);
  const how = await txt(d.page, '#playBody .gs-how');
  check(/12 ideas.*3 sections/.test(how), `its start screen says 12 ideas and 3 sections (${how.slice(0, 70)})`);
  await d.page.click('[data-gs="start"]'); await wait(500);

  // Easy: three boxes, twelve ideas; placing each in its box solves it.
  check(await d.page.locator('#playBody .pz-box').count() === 3, 'Easy shows 3 section boxes');
  check(await d.page.locator('#playBody .ptile').count() === 12, 'and 12 ideas');
  // Hard: "Find three groups of four", three targets.
  await d.page.click('[data-pz="hard"]'); await wait(300);
  check(/Find three groups of four/.test(await txt(d.page, '#playBody')), 'Hard says “Find three groups of four”');
  check(await d.page.locator('#playBody .pz-targets li').count() === 3, 'with 3 sections to find');
  for (const g of live.puzzle.groups) {
    for (const t of g.tiles) await d.page.click(`#playBody .ptile[data-pt="${t.text.replace(/"/g, '\\"')}"]`);
    await d.page.click('[data-pz="submit"]'); await wait(300);
  }
  check(/Solved!/.test(await txt(d.page, '#playBody')), 'finding the three groups solves it');
  check(await d.page.locator('#playBody .pz-solved').count() === 3, 'and shows the three groups');
  check(!d.page.errors.length, 'no page errors' + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
  await d.ctx.close();
}
