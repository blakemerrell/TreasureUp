// A grown-up's Pro journal (2026-10-11: full history, "Only me"), on the
// Firebase emulators with the repo's firestore.rules: Dad's Pro pages, saved
// before this change inside his progress, move into journals/{his uid} and
// out of the family's copy (backup/{pid}, which any parent can read); his
// 200-day-old top 3 is still there (nothing trimmed); Sam (a child) and a
// stranger can't read or write it; his second device (the same Google
// account) gets it, and a role added there comes back to the first; a change
// made offline goes up once back online; a child's Pro stays in his own
// progress as before; and Erase removes it everywhere, his tablet's copy too,
// while what he writes after it is kept.
// Runs under the emulators: cd tests && npm run test:family
import { check, device, wait, dayAdd, todayKey } from './lib.mjs';

const NS = 'treasureup-test.';
const fam = dev => dev.page.evaluate(ns => JSON.parse(localStorage.getItem(ns + 'family') || 'null'), NS);
const local = dev => dev.page.evaluate(ns => ({ S: JSON.parse(localStorage.getItem(ns + 'v1') || '{}'), keys: Object.keys(localStorage) }), NS);
const journalLocal = (dev, uid) => dev.page.evaluate(([ns, uid]) => JSON.parse(localStorage.getItem(ns + 'journal.' + uid) || 'null'), [NS, uid]);
const googleIn = (dev, sub, email, name) => dev.page.evaluate(async ([sub, email, name]) => {
  await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true, name })));
}, [sub, email, name]);
const docs = (dev, uid, part) => dev.page.evaluate(async ([uid, part]) => {
  const s = await firebase.firestore().collection('journals').doc(uid).collection(part).get();
  return Object.fromEntries(s.docs.map(d => [d.id, d.data().v]));
}, [uid, part]);
async function openFamily(dev) {
  await dev.page.click('#setBtn'); await wait(500);
  await dev.page.click('[data-set-go="family"]'); await wait(1500);
  await dev.page.click('[data-fam-open="people"]'); await wait(2500);   // loads Firebase
}
const season = async dev => { await dev.page.click('#tabs [data-tab="season"]'); await wait(600); };
const until = async (fn, ms = 15000) => { const t = Date.now(); let v; while (Date.now() - t < ms) { if ((v = await fn())) return v; await wait(500); } return v; };

export default async function journal({ port }) {
  const url = `http://localhost:${port}/TreasureUp-test/index.html`;
  const id = Date.now(), sub = 'jdad-' + id, email = `jdad${id}@example.com`;
  const today = todayKey(), old = dayAdd(today, -200);

  // Dad starts a family on his phone (Google).
  const A = await device('dad-phone', { url, emulators: true });
  await openFamily(A);
  await googleIn(A, sub, email, 'Dad'); await wait(2500);
  await A.page.fill('#famNewFamily', 'Journal Family'); await A.page.fill('#famMyName', 'Dad'); await A.page.click('[data-fam="start"]'); await wait(3000);
  await A.page.fill('#famNewName', 'Sam'); await A.page.click('[data-fam="invite"]'); await wait(1500);
  const samLink = await A.page.inputValue('#famLinkText');
  await A.page.click('#famExit').catch(() => {});
  const dad = await fam(A);

  // His Pro pages as they were saved before this change: inside his progress (and so in the family's copy).
  await A.page.evaluate(([ns, old, today]) => {
    const S = JSON.parse(localStorage.getItem(ns + 'v1') || '{}'), now = Date.now();
    S.proMode = true;
    S.pro = { mission: { text: 'Love God, lift my family, do honest work.', upd: now },
      roles: { rF: { name: 'Father', at: now, upd: now } }, goals: {},
      rocks: { k1: { wk: today, text: 'A walk with my oldest', role: 'rF', day: '', at: now, upd: now } },
      tops: { [old]: { items: [{ text: 'An old top 3 from 200 days ago', role: 'rF', done: old }], upd: now - 200 * 864e5 }, [today]: { items: [{ text: 'Finish the plan', role: 'rF' }], upd: now } },
      months: {} };
    localStorage.setItem(ns + 'v1', JSON.stringify(S));
  }, [NS, old, today]);
  await A.page.reload(); await wait(4000);

  const L = await local(A);
  check(!L.S.pro && L.keys.includes(NS + 'journal.' + dad.uid), 'on his phone, Pro moves out of his saved progress into a journal of its own');
  const plan = await until(async () => (await docs(A, dad.uid, 'plan')).main);
  check(plan && /honest work/.test(plan) && /Father/.test(plan), 'his mission and roles are in journals/{his uid}/plan');
  const days = await docs(A, dad.uid, 'days');
  check(days[old] && /200 days ago/.test(days[old]) && days[today], `each day's top 3 is its own document, the one from 200 days ago too (${Object.keys(days).length} days)`);
  check(!!(await docs(A, dad.uid, 'weeks'))[today], 'the week’s big rocks are in journals/{his uid}/weeks');
  const backup = await until(() => A.page.evaluate(async F => { const d = await firebase.firestore().collection('families').doc(F.fid).collection('backup').doc(F.pid).get(); const s = d.exists ? d.data().state : ""; return /"proMode":true/.test(s) ? s : null; }, dad));
  check(backup && !/"pro":/.test(backup) && /"proMode":true/.test(backup), 'the family’s copy of his progress no longer holds his Pro pages (its switch stays)');
  check(!!((await journalLocal(A, dad.uid)) || {}).tops?.[old], 'nothing is trimmed: the 200-day-old top 3 is still on his phone after a restart');

  // The rules: Sam (a child in the family) and a stranger can't read or write it.
  const K = await device('sam', { url, emulators: true });
  await K.page.goto(samLink.replace(/^https?:\/\/[^/]+/, `http://localhost:${port}`)); await wait(3500);
  await K.page.click('[data-fam="join"]'); await wait(3500);
  await K.page.click('#famExit').catch(() => {});
  const tryAll = dev => dev.page.evaluate(async uid => {
    const j = firebase.firestore().collection('journals').doc(uid), out = [];
    const t = async fn => { try { await fn(); out.push('ALLOWED'); } catch (e) { out.push(e.code || 'error'); } };
    await t(() => j.collection('plan').doc('main').get());
    await t(() => j.collection('days').get());
    await t(() => j.collection('plan').doc('main').set({ v: '{}', upd: firebase.firestore.FieldValue.serverTimestamp() }));
    await t(() => j.collection('days').doc('2026-01-01').delete());
    return out;
  }, dad.uid);
  const samTry = await tryAll(K);
  check(samTry.every(x => x !== 'ALLOWED'), 'Sam can’t read, list, write or delete Dad’s journal: ' + samTry.join(', '));
  const X = await device('stranger', { url, emulators: true });
  await openFamily(X);
  await googleIn(X, 'stranger-' + id, `stranger${id}@example.com`, 'Stranger'); await wait(1500);
  const xTry = await tryAll(X);
  check(xTry.every(x => x !== 'ALLOWED'), 'a stranger signed in with Google can’t either: ' + xTry.join(', '));
  const badShape = await A.page.evaluate(async uid => {
    const j = firebase.firestore().collection('journals').doc(uid);
    try { await j.collection('notes').doc('x').set({ v: '{}', upd: firebase.firestore.FieldValue.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; }
  }, dad.uid);
  check(badShape !== 'ALLOWED', 'even Dad can only write the journal’s own four kinds of page: ' + badShape);
  await X.ctx.close();

  // Dad's second device, the same Google account: the journal comes to it.
  const B = await device('dad-tablet', { url, emulators: true });
  await openFamily(B);
  await googleIn(B, sub, email, 'Dad'); await wait(5000);
  await B.page.reload(); await wait(5000);
  const onB = await until(async () => { const j = await journalLocal(B, dad.uid); return j && j.mission && /honest work/.test(j.mission.text) && j.tops && j.tops[old] ? j : null; });
  check(!!onB, 'his tablet (same Google account) gets the whole journal, the old day too');

  // A role added on the tablet comes back to the phone.
  await B.page.evaluate(([ns, uid]) => { const S = JSON.parse(localStorage.getItem(ns + 'v1')); S.proMode = true; localStorage.setItem(ns + 'v1', JSON.stringify(S)); }, [NS, dad.uid]);
  await B.page.reload(); await wait(3000);
  await season(B);
  await B.page.click('#home [data-nb-tab="pmission"]').catch(() => {}); await wait(500);
  await B.page.fill('#proRole', 'Business owner'); await B.page.press('#proRole', 'Enter'); await wait(4000);
  check(/Business owner/.test((await docs(B, dad.uid, 'plan')).main || ''), 'a role added on the tablet goes up to his journal');
  await A.page.reload(); await wait(6000);
  const backOnA = await until(async () => { const j = await journalLocal(A, dad.uid); return j && Object.values(j.roles || {}).some(r => r.name === 'Business owner' && !r.gone); });
  check(!!backOnA, 'and comes back to his phone');
  check(Object.values((await journalLocal(A, dad.uid)).roles).filter(r => !r.gone).length === 2, 'both roles there, neither lost (Father and Business owner)');

  // Offline on the phone: kept there, and up once it's back online.
  await A.ctx.setOffline(true);
  await season(A);
  await A.page.click('#home [data-nb-tab="pmission"]').catch(() => {}); await wait(500);
  await A.page.fill('#proRole', 'Friend'); await A.page.press('#proRole', 'Enter'); await wait(1500);
  check(Object.values((await journalLocal(A, dad.uid)).roles).some(r => r.name === 'Friend'), 'offline, a new role is kept on the phone');
  await A.ctx.setOffline(false);
  await A.page.evaluate(() => window.dispatchEvent(new Event('online'))); await wait(2000);
  await A.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const up = await until(async () => /Friend/.test((await docs(B, dad.uid, 'plan')).main || ''), 20000);
  check(up, 'back online, it goes up to his journal');

  // A child's Pro stays in his own progress (and so in the family's copy), as before.
  await K.page.evaluate(ns => { const S = JSON.parse(localStorage.getItem(ns + 'v1') || '{}'); S.proMode = true; S.pro = { mission: { text: 'Be a good friend', upd: Date.now() }, roles: {}, goals: {}, rocks: {}, tops: {}, months: {} }; localStorage.setItem(ns + 'v1', JSON.stringify(S)); }, NS);
  await K.page.reload(); await wait(4000);
  const samL = await local(K), sam = await fam(K);
  check(samL.S.pro && /good friend/.test(samL.S.pro.mission.text) && !samL.keys.some(k => k.startsWith(NS + 'journal.')), 'a child’s Pro stays in his progress, with no journal of its own');

  // Erase: everything, here and in the cloud. His tablet is offline while he does it.
  await B.ctx.setOffline(true);
  await A.page.reload(); await wait(4000);
  await season(A);
  await A.page.click('#home [data-nb-tab="pmission"]').catch(() => {}); await wait(500);
  check(/Kept for you only/.test(await A.page.innerText('#home [data-pro-where]')), 'the Mission page says where it’s kept: for him only');
  await A.page.click('#home [data-pro-erase]'); await wait(400);
  await A.page.click('#home [data-pro-erase-yes]'); await wait(4000);
  const leftPlan = await docs(A, dad.uid, 'plan'), leftDays = Object.keys(await docs(A, dad.uid, 'days')).length;
  check(!leftPlan.main && !leftDays && leftPlan.erased && !(await journalLocal(A, dad.uid)), 'Erase removes it from the cloud and the phone, and leaves a note for his other devices');
  // The tablet, still holding the old journal, adds a role offline, then comes back online and sends it.
  await season(B);
  await B.page.click('#home [data-nb-tab="pmission"]').catch(() => {}); await wait(500);
  await B.page.fill('#proRole', 'Coach'); await B.page.press('#proRole', 'Enter'); await wait(1000);
  await B.ctx.setOffline(false);
  await B.page.evaluate(() => window.dispatchEvent(new Event('online'))); await wait(1500);
  await B.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const plan2 = await until(async () => { const m = (await docs(A, dad.uid, 'plan')).main || ''; return /Coach/.test(m) ? m : null; }, 20000);
  check(!!plan2 && !/Father|Business owner|honest work/.test(plan2), 'the tablet, offline during the Erase, sends only what it wrote after (nothing old comes back)');
  const onB2 = await journalLocal(B, dad.uid);
  check(onB2 && !Object.values(onB2.roles || {}).some(r => r.name === 'Father') && !Object.keys(onB2.tops || {}).length, 'and drops its old copy');
  await A.page.reload(); await wait(6000);
  const onA2 = await until(async () => { const j = await journalLocal(A, dad.uid); return j && Object.values(j.roles || {}).some(r => r.name === 'Coach') ? j : null; });
  check(!!onA2 && !Object.values(onA2.roles).some(r => r.name === 'Father'), 'what was written after the Erase reaches his phone, and is kept');
  check(!A.page.errors.length && !B.page.errors.length && !K.page.errors.length, 'no page errors' + [A, B, K].map(d => d.page.errors.join(' | ')).filter(Boolean).join(' / '));
  for (const d of [A, B, K]) await d.ctx.close();
}
