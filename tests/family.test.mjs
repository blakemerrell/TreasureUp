// A family on the Firebase emulators, with the repo's firestore.rules: Dad
// (Google) starts it, Sam joins on his phone and his Kindle; the rules refuse
// what a child mustn't do; both devices agree after a study; a save on one
// doesn't restart the other in the middle of Be still; chat, a prize and a
// finished goal go end to end, the goal's XP paid once.
// Runs under the emulators: cd tests && npm run test:family
import { check, device, state, study, txt, wait, loadsDuring, reopen } from './lib.mjs';

const NS = 'treasureup-test.';
const fam = dev => dev.page.evaluate(ns => JSON.parse(localStorage.getItem(ns + 'family') || 'null'), NS);
const xpOf = async dev => (await state(dev.page)).xp || 0;
async function openFamily(dev, people = true) {
  await dev.page.click('#setBtn'); await wait(500);
  await dev.page.click('[data-set-go="family"]'); await wait(1500);
  if (people) { await dev.page.click('[data-fam-open="people"]'); await wait(2500); }
}
async function openHub(P) {
  await P.page.reload(); await wait(2500);
  await openFamily(P, false);
  await P.page.click('[data-hub]'); await wait(2500);
  return txt(P.page, '#parentBody');
}
async function join(dev, link, port) {
  await dev.page.goto(link.replace(/^https?:\/\/[^/]+/, `http://localhost:${port}`)); await wait(3500);
  await dev.page.click('[data-fam="join"]'); await wait(3500);
}

export default async function family({ port }) {
  const url = `http://localhost:${port}/TreasureUp-test/index.html`;
  const P = await device('dad', { url, emulators: true });
  await openFamily(P);
  const id = Date.now();
  await P.page.evaluate(async ([sub, email]) => {
    await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true, name: 'Dad' })));
  }, ['dad-' + id, `dad${id}@example.com`]); await wait(2500);
  await P.page.fill('#famNewFamily', 'Test Family'); await P.page.fill('#famMyName', 'Dad'); await P.page.click('[data-fam="start"]'); await wait(3000);
  await P.page.fill('#famNewName', 'Sam'); await P.page.click('[data-fam="invite"]'); await wait(1500);
  const link1 = await P.page.inputValue('#famLinkText');
  const K1 = await device('sam-phone', { url, emulators: true });
  await join(K1, link1, port);
  check(/Sam \(you\)/.test(await txt(K1.page, '#fam')), 'Sam’s phone joins the family by invite link');
  await P.page.reload(); await wait(2000); await openFamily(P);
  const dad = await fam(P);
  const samPid = await P.page.evaluate(me => { const b = [...document.querySelectorAll('[data-fam="device"]')].find(x => x.dataset.pid !== me); return b ? b.dataset.pid : null; }, dad.pid);
  await P.page.click(`[data-fam="device"][data-pid="${samPid}"]`); await wait(1500);
  const K2 = await device('sam-kindle', { url, emulators: true });
  await join(K2, await P.page.inputValue('#famLinkText'), port);
  check(/Sam \(you\)/.test(await txt(K2.page, '#fam')), 'Dad links Sam’s Kindle, and it joins as the same Sam');
  for (const d of [P, K1, K2]) await d.page.click('#famExit').catch(() => {});

  // The rules: what Sam's phone mustn't do.
  const sam = await fam(K1);
  const refused = await K1.page.evaluate(async ([F, D]) => {
    const db = firebase.firestore(), f = db.collection('families').doc(F.fid), out = {};
    const tryIt = async (name, fn) => { try { await fn(); out[name] = 'ALLOWED'; } catch (e) { out[name] = e.code || e.message; } };
    await tryIt('make himself a parent', () => f.collection('members').doc(F.uid).update({ role: 'parent' }));
    await tryIt('write Dad’s saved copy', () => f.collection('backup').doc(D.pid).set({ xp: 999999, state: '{}', by: F.uid, updated: firebase.firestore.FieldValue.serverTimestamp() }));
    await tryIt('make an invite', () => f.collection('invites').doc('x'.repeat(24)).set({ role: 'kid', name: 'Eve', email: '', kidId: 'y'.repeat(16), family: F.family, createdBy: F.uid, usedBy: null, expires: firebase.firestore.Timestamp.fromMillis(Date.now() + 86400000) }));
    await tryIt('read another family', () => db.collection('families').doc('A'.repeat(20)).get());
    await tryIt('list all families', () => db.collection('families').get());
    await tryIt('read the developer secrets', () => db.collection('devSecrets').doc('github').get());
    await tryIt('remove Dad', () => f.collection('members').doc(D.uid).delete());
    return out;
  }, [sam, dad]);
  for (const [what, res] of Object.entries(refused)) check(res !== 'ALLOWED', `the rules refuse Sam’s phone: ${what} (${res})`);

  // A study on the phone; the Kindle has it after a restart.
  const steps = await study(K1);
  await wait(5000);
  await K2.page.reload(); await wait(5000);
  const x1 = await xpOf(K1), x2 = await xpOf(K2);
  check(steps && steps.length > 1 && x1 > 0 && x1 === x2, `Today’s study on the phone (${steps ? steps.length : 0} steps, ${x1} XP); the Kindle has ${x2}`);
  const lower = await K1.page.evaluate(async F => {
    const ref = firebase.firestore().collection('families').doc(F.fid).collection('backup').doc(F.pid), cur = (await ref.get()).data() || {};
    try { await ref.set({ xp: cur.xp - 10, state: cur.state, by: F.uid, updated: firebase.firestore.FieldValue.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; }
  }, sam);
  check(lower !== 'ALLOWED', `the rules refuse lowering his saved XP (${lower})`);

  // Be still on the phone while the Kindle saves: the phone mustn't restart under it.
  const tap = async (dev, sel, what) => { try { await dev.page.click(sel, { timeout: 8000 }); } catch (e) {
    if (process.env.SHOTS) await dev.page.screenshot({ path: `${process.env.SHOTS}/${dev.name}.png` });
    throw new Error(`${dev.name}: ${what} (${sel}) wasn't there: ${e.message.split('\n').slice(-3).join(' ')}`); } };
  const quiet = await loadsDuring(K1, async () => {
    await tap(K1, '#stillBtn', 'the 🕊️ button'); await wait(500);
    await tap(K1, '#stillLayer [data-still-light]', 'the ring, to begin'); await wait(800);
    await tap(K2, '#stillBtn', 'the 🕊️ button'); await wait(500);
    await tap(K2, '#stillLayer [data-still-light]', 'the ring, to begin'); await wait(800);
    await K2.page.evaluate(() => window.__skip(125000));   // two quiet minutes
    await wait(1200);
    await tap(K2, '#stillLayer [data-still-light]', 'the ring, for the controls'); await wait(300);
    await tap(K2, '#stillLayer [data-still-end]', 'End'); await wait(800);
    await K2.page.click('#stillLayer [data-still-skip]', { timeout: 3000 }).catch(() => {}); await wait(15000);   // its save reaches the phone
    return !(await K1.page.$eval('#stillLayer', e => e.hidden));
  });
  check(quiet.value && quiet.loads() === 0, `a save on the Kindle doesn’t restart the phone in the middle of Be still (restarts: ${quiet.loads()}, still open: ${quiet.value})`);
  await K1.page.click('#stillClose').catch(() => {}); await wait(500);

  // Chat.
  await openFamily(K1, false); await K1.page.click('[data-fam-open="chat"]'); await wait(1500);
  await K1.page.fill('#chatText', 'Dad, I read today!'); await K1.page.click('[data-fam="send"]'); await wait(2500);
  await K1.page.click('#famExit').catch(() => {});
  await P.page.reload(); await wait(2000); await openFamily(P, false); await P.page.click('[data-fam-open="chat"]'); await wait(2500);
  check(/I read today/.test(await txt(P.page, '#chatList')), 'Dad sees Sam’s chat message');
  await P.page.click('#famExit').catch(() => {});

  // A prize: Sam asks (with XP to spend), Dad says yes in the Parent hub, both of Sam's devices hear it.
  await K1.page.evaluate(ns => { const S = JSON.parse(localStorage.getItem(ns + 'v1')); S.xp = Math.max(S.xp, 2400); localStorage.setItem(ns + 'v1', JSON.stringify(S)); }, NS);
  await K1.page.reload(); await wait(6000); await K2.page.reload(); await wait(6000);
  await K1.page.click('#levelBtn'); await wait(600);
  await K1.page.locator('[data-buy]').first().click(); await wait(300); await K1.page.locator('[data-buy-yes]').first().click(); await wait(2500);
  await K1.page.keyboard.press('Escape').catch(() => {}); await K1.page.evaluate(() => { const s = document.getElementById('appSheet'); if (s && !s.hidden) s.click(); });
  await openHub(P);
  const req = P.page.locator('#parentBody .req-row').first();
  check(!!(await req.count()), 'Dad sees Sam’s prize request in the Parent hub');
  if (await req.count()) { await req.locator('[data-st="approved"]').click(); await wait(3000); }
  await P.page.click('#parentClose').catch(() => {}); await wait(4000);
  await K2.page.reload(); await wait(5000);
  const o1 = Object.values(((await state(K1.page)).shop || {}).orders || {}), o2 = Object.values(((await state(K2.page)).shop || {}).orders || {});
  check(o1.length === 1 && o1[0].status === 'approved' && o2.length === 1 && o2[0].status === 'approved', `both of Sam’s devices hear Dad said yes (${o1.map(o => o.status)} / ${o2.map(o => o.status)})`);

  // A prize asked with no connection, and the app closed before it came back: asked again on opening.
  await K1.ctx.setOffline(true);
  await K1.page.click('#levelBtn'); await wait(600);
  await K1.page.locator('[data-buy]').first().click(); await wait(300); await K1.page.locator('[data-buy-yes]').first().click(); await wait(1500);
  const asked = Object.keys(((await state(K1.page)).shop || {}).orders || {}).length;
  const errsBefore = K1.page.errors.slice();
  await reopen(K1, url, () => K1.ctx.setOffline(false)); await wait(6000);   // closed while still offline: its write never left
  K1.page.errors.push(...errsBefore);
  await openHub(P);
  const waiting = await P.page.locator('#parentBody .req-row', { hasText: 'asked' }).count();
  check(asked === 2 && waiting === 1, `a prize asked offline, the app closed and opened again: Dad sees it (${waiting} waiting)`);
  await P.page.click('#parentClose').catch(() => {});

  // A finished goal: Sam asks, Dad picks 1,000 XP, paid once on both devices.
  await K1.page.evaluate(ns => {
    const S = JSON.parse(localStorage.getItem(ns + 'v1')), sid = Object.keys(S.seasons || {})[0];
    S.seasonWho = S.seasonWho || 'youth'; S.seasons = S.seasons || {};
    const d = new Date(), q = Math.floor(d.getMonth() / 3) + 1, id = sid || d.getFullYear() + '-Q' + q;
    const r = S.seasons[id] || (S.seasons[id] = { goals: [], ticks: {}, checks: {}, reflect: {} });
    r.goals = (r.goals || []).concat([{ id: 'gT', area: 'physical', text: 'Run and not be weary', steps: [{ id: 'tT', text: 'Run 20 minutes', n: 3 }], status: 'on', upd: Date.now() }]);
    localStorage.setItem(ns + 'v1', JSON.stringify(S));
  }, NS);
  await K1.page.reload(); await wait(4000);
  await K1.page.click('#tabs [data-tab="season"]'); await wait(600);
  const ask = K1.page.locator('#home [data-done-ask="gT"]');
  if (!(await ask.count())) { check(false, 'the goal shows “🏆 I finished it!” (the Season id this test guessed may be wrong)'); return; }
  await ask.click(); await wait(400);
  await K1.page.fill('#doneNote', 'I ran every morning this week.').catch(() => {});
  await K1.page.click('#appBody [data-done-send]'); await wait(3000);
  await K1.page.click('#tabs [data-tab="today"]').catch(() => {}); await wait(4000);
  await K2.page.reload(); await wait(5000);
  const before = Math.max(await xpOf(K1), await xpOf(K2));
  await openHub(P);
  const rv = P.page.locator('#parentBody .hub-rv').first();
  check(!!(await rv.count()), 'Dad’s Parent hub has Sam’s finished goal');
  if (await rv.count()) { await rv.locator('[data-xp="1000"]').click(); await wait(300); await rv.locator('[data-act="rv-ok"]').click(); await wait(3000); }
  await P.page.click('#parentClose').catch(() => {}); await wait(6000);
  check(/\+1,000 XP/.test(await txt(K1.page, '#party')), 'his phone celebrates: +1,000 XP');
  await K1.page.click('#party [data-party-ok]').catch(() => {}); await wait(3000);
  await K2.page.click('#party [data-party-ok]').catch(() => {}); await wait(6000);
  await K1.page.reload(); await wait(5000); await K2.page.reload(); await wait(5000);
  const a1 = await xpOf(K1), a2 = await xpOf(K2);
  check(a1 === a2 && a1 - before === 1000, `the goal pays 1,000 XP once, on both devices (${before} → ${a1} / ${a2})`);
  check(!(await K1.page.locator('#party').count()), 'reopened: no second celebration');

  const errs = [P, K1, K2].flatMap(d => d.page.errors);
  check(!errs.length, 'no page errors on any device' + (errs.length ? ': ' + errs.join(' | ') : ''));
  for (const d of [P, K1, K2]) await d.ctx.close();
}
