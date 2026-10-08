// Game night on the Firebase emulators with firestore.rules (review, 2026-10-07):
// the Live game on a TV and two phones (a phone that reloads is back in, still
// locked in; the answer and the scores are written as one, so a TV reload
// doesn't score a question twice; Play again doesn't wait on someone who left;
// an old game's code is refused), and Babylon Falls' map, opened from the Games
// tab, picked back up after a reload.
// Runs under the emulators: cd tests && npm run test:family (it runs this too).
import { check, device, txt, wait } from './lib.mjs';

export default async function games({ port }) {
  const app = `http://localhost:${port}/TreasureUp-test/index.html`;
  const tv = await device('tv', { url: app + '#host', emulators: true });
  await wait(3000);
  const code = (await txt(tv.page, '#live .live-code')).trim();
  check(/^\d{4}$/.test(code), 'the TV hosts a live game: code ' + code);
  const join = async (name) => {
    const d = await device(name, { url: app + '#join-' + code, emulators: true });
    await d.page.fill('#liveName', name); await d.page.click('[data-live="joinnow"]'); await wait(2500);
    return d;
  };
  const ann = await join('Ann'), ben = await join('Ben');
  const players = () => tv.page.evaluate(c => firebase.firestore().collection('live').doc(c).collection('players').get()
    .then(q => Object.fromEntries(q.docs.map(d => [d.data().name, d.data()]))), code);
  await wait(1500);
  await tv.page.click('[data-host="start"]'); await wait(2500);

  // The right choice on a phone, from the week's own questions (a reel's or a bonus's).
  const pickRight = async d => {
    const q = (await d.page.locator('#live .quiz-q').first().innerText().catch(() => '')).trim();
    const right = await d.page.evaluate(q => {
      const find = o => { if (!o || typeof o !== 'object') return null; if (o.q === q && typeof o.right === 'string') return o.right; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; };
      for (const w of window.TU_WEEKS) for (const r of w.reels) { const x = find(r); if (x) return x; }
      return null;
    }, q);
    const opt = right && d.page.locator(`[data-lpick="${right.replace(/"/g, '\\"')}"]`);
    if (opt && await opt.count()) await opt.first().click(); else await d.page.locator('[data-lpick]').first().click();
  };
  // Ann answers (right), then her phone reloads: back in the game, still locked in.
  await pickRight(ann); await wait(1500);
  await ann.page.reload(); await wait(4000);
  check(/Locked in/.test(await txt(ann.page, '#live')), 'a phone that answered, then reloaded, is back in the game and still locked in: ' + (await txt(ann.page, '#live')).slice(0, 60));

  // Ben doesn't answer; the TV shows the answer: scores and "reveal" as one.
  await tv.page.click('[data-host="reveal"]'); await wait(3000);
  let ps = await players();
  check(ps.Ann.lastAnswered === true && ps.Ben.lastAnswered === false && ps.Ben.missed === 1, `the reveal scores Ann's answer and Ben's miss (Ann answered: ${ps.Ann.lastAnswered}, Ben missed: ${ps.Ben.missed})`);
  const before = ps.Ann.score;
  await tv.page.reload(); await wait(4000);
  ps = await players();
  check(before > 0 && ps.Ann.score === before && /Next question|Final scores/.test(await txt(tv.page, '#live')), `the TV reloaded on the answer: picked back up, Ann's points not counted twice (${before} → ${ps.Ann.score})`);

  // Ben leaves. The rest of the game: Ann answers each, the TV moves on.
  await ben.ctx.close();
  for (let i = 0; i < 40; i++) {
    const t = await txt(tv.page, '#live');
    if (/Play again/.test(t)) break;
    if (await tv.page.locator('[data-host="next"]').count()) { await tv.page.click('[data-host="next"]'); await wait(2000); continue; }
    if (await ann.page.locator('[data-lpick]').count()) { await pickRight(ann); await wait(1500); }
    if (await tv.page.locator('[data-host="reveal"]').count()) { await tv.page.click('[data-host="reveal"]'); await wait(2000); }
  }
  check(/Play again/.test(await txt(tv.page, '#live')), 'the game plays to its final scores');
  ps = await players();
  await tv.page.click('[data-host="again"]'); await wait(2500);
  const after = await players();
  check(ps.Ben.missed >= 2 && after.Ben.missed >= 2 && after.Ann.missed === 0, `Play again: Ben, who left, isn't waited for (missed ${ps.Ben.missed} → ${after.Ben.missed}); Ann starts fresh (${after.Ann.missed})`);

  // A game made over 12 hours ago (a laptop closed mid-game): its code is refused.
  await tv.page.evaluate(c => firebase.firestore().collection('live').doc(c).update({ created: firebase.firestore.Timestamp.fromMillis(Date.now() - 13 * 3600e3) }), code);
  const cal = await device('Cal', { url: app + '#join-' + code, emulators: true });
  await cal.page.fill('#liveName', 'Cal'); await cal.page.click('[data-live="joinnow"]'); await wait(2500);
  check(/That game has ended/.test(await txt(cal.page, '#live')), 'a code from a game over 12 hours old is refused: ' + (await txt(cal.page, '#live')).slice(0, 80));
  const errs = [tv, ann, cal].flatMap(d => d.page.errors);
  check(!errs.length, 'no page errors in the live game' + (errs.length ? ': ' + errs.join(' | ') : ''));
  for (const d of [tv, ann, cal]) await d.ctx.close();

  // Babylon Falls' map, put up from the Games tab (not #babylon), then reloaded: the same game.
  const map = await device('map', { url: app, emulators: true });
  await map.page.click('#tabs [data-tab="games"]'); await wait(500);
  await map.page.click('[data-game="babylon"]'); await wait(800);
  await map.page.click('[data-rk="host"]'); await wait(4000);
  const rcode = (await txt(map.page, '#risk .live-code')).trim();
  await map.page.reload(); await wait(5000);
  const again = (await txt(map.page, '#risk .live-code')).trim();
  check(/^\d{4}$/.test(rcode) && again === rcode && !(await map.page.$eval('#risk', e => e.hidden)), `Babylon Falls' map, reloaded, is the same game (${rcode} → ${again || 'gone'})`);
  check(!map.page.errors.length, 'no page errors on the map' + (map.page.errors.length ? ': ' + map.page.errors.join(' | ') : ''));
  await map.ctx.close();
}
