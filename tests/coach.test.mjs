// Try my own: off until a grown-up turns it on in the Parent hub; then a
// Bible chapter in the reader opens it with each verse's KJV, its Hebrew word
// by word and a box with hints; what he writes is kept on the device (not in
// his progress) through a reload, shows under the verses with Show mine, and
// with the switch off the reader is exactly as it was. A chapter whose words
// don't load still opens, with a short line why. The chapters are the test's
// own (the library, two chapters and Genesis 12's words), so it runs without
// the deploy's built files.
import { check, device, reopen, wait, state } from './lib.mjs';

const KJV12 = [
  "Now the LORD had said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father's house, unto a land that I will shew thee:",
  'And I will make of thee a great nation, and I will bless thee, and make thy name great; and thou shalt be a blessing:',
  'And I will bless them that bless thee, and curse him that curseth thee: and in thee shall all families of the earth be blessed.'
];
const WORDS12 = [[['וַיֹּאמֶר', 'vai.Yo.mer', 'and he said', 'H559'], ['יְהוָה', 'Yah.weh', 'the LORD', 'H3068G'], ['אֶל־', "'el-", 'to', 'H413'], ['אַבְרָם', "'av.Ram", 'Abram', 'H87']],
  [['וְאֶעֶשְׂךָ', "ve.'e.'es.Kha", 'so I may make you', 'H6213H'], ['לְגוֹי', 'le.Goy', 'into a nation', 'H1471A'], ['גָּדוֹל', 'ga.Dol', 'great', 'H1419A']],
  [['וַאֲבָרֲכָה', "va.'a.va.ra.Khah", 'so let me bless', 'H1288'], ['מְבָרְכֶיךָ', 'me.Va.re.Khei.kha', 'those who bless you', 'H1288']]];
const lib = (ch, v) => `(window.TU_LIB = window.TU_LIB || {})[${JSON.stringify(ch)}] = ${JSON.stringify({ v })};\n`;
const FILES = {
  'content/library.js': 'window.TU_LIBRARY = ' + JSON.stringify([{ name: 'Old Testament', books: [['Genesis', 50]] }]) + ';\n',
  'content/lib/genesis-12.js': lib('Genesis 12', KJV12),
  'content/lib/genesis-13.js': lib('Genesis 13', ['And Abram went up out of Egypt, he, and his wife, and all that he had, and Lot with him, into the south.']),
  'content/original/genesis-12.js': `(window.TU_ORIG = window.TU_ORIG || {})["Genesis 12"] = ${JSON.stringify({ lang: 'he', v: WORDS12, g: {} })};\n`
};
const MINE = ['The Lord said unto him: Leave your country, your relatives and your father’s home, and go to a land I will show you.',
  'I will make you into a great nation and bless you. I will make your name great, and you will be a blessing.'];

export default async function coach({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const dev = await device('dad', { url, files: FILES });
  await dev.ctx.route('**/content/original/genesis-13.js', r => r.fulfill({ status: 404, body: '' }));   // words that don't come
  let p = dev.page;
  // The library: volumes, then a volume's books, then a book's chapters.
  const toGenesis = async ch => {
    if (await p.locator(`#home [data-lib-ch="${ch}"]`).count()) return;
    if (!(await p.locator('#home [data-lib-book="Genesis"]').count())) { await p.click('#home [data-lib-vol="Old Testament"]'); await wait(300); }
    await p.click('#home [data-lib-book="Genesis"]'); await wait(300);
  };
  const openChapter = async ch => {
    if (!(await p.locator('#view').isHidden())) { await p.click('#viewBack'); await wait(300); }
    await p.click('#tabs [data-tab="scriptures"]'); await wait(800);
    await toGenesis(ch);
    await p.click(`#home [data-lib-ch="${ch}"]`); await wait(900);
  };
  const reader = () => p.$eval('#viewBody .ls-chapter', el => el.innerHTML);
  const hub = async (pin, then) => {
    await p.click('#setBtn'); await wait(300);
    await p.click('#appSheet [data-set-go="parent"]'); await wait(400);
    if (await p.locator('#pinNew').count() && !(await p.locator('#parentBody [data-set="coach"]').count())) {
      await p.fill('#pinNew', pin); await p.fill('#pinAgain', pin); await p.click('#parentBody [data-act="setpin"]'); await wait(300);
    }
    if (await p.locator('#pinEnter').count()) { await p.fill('#pinEnter', pin); await p.click('#parentBody [data-act="unlock"]'); await wait(300); }
    await p.click('#parentBody [data-set="coach"] summary'); await wait(200);
    await then();
    await p.click('#parentClose'); await wait(300);
  };

  // Off: no door, and the reader as it always was.
  await openChapter('Genesis 12');
  const before = await reader();
  check(!(await p.locator('.co-row, [data-coach]').count()), 'Try my own is off at first: no door in the reader');
  await p.click('#viewBack'); await wait(300);

  // On, from the Parent hub (behind the PIN).
  await hub('1234', async () => {
    check(/Off/.test(await p.innerText('#parentBody [data-set="coach"] summary')), 'the Parent hub has its switch, off');
    await p.click('#parentBody [data-act="coach"]'); await wait(300);
    check(/On/.test(await p.innerText('#parentBody [data-set="coach"] summary')), 'turned on there');
  });
  await openChapter('Genesis 12');
  check(await p.locator('#viewBody .co-row [data-coach="Genesis 12"]').count() === 1, 'a Bible chapter has ✍️ Try my own');
  await p.click('#viewBody [data-coach]'); await wait(700);
  check(!(await p.locator('#coach').isHidden()), 'it opens its screen');
  const v1 = p.locator('#coach .co-v[data-co-v="1"]');
  check((await v1.locator('.ls-v').innerText()).includes('Get thee out of thy country'), 'each verse shows the KJV');
  check(await v1.locator('.ls-orig .ow').count() === 4 && /Abram/.test(await v1.locator('.ls-orig').innerText()), 'then the Hebrew word by word, with what each word means');
  check(/STEPBible\.org/.test(await p.innerText('#coachBody')), 'with the STEPBible credit');
  await p.fill('#coach [data-co-in="1"]', MINE[0]);
  await p.fill('#coach [data-co-in="2"]', MINE[1]);
  await wait(500);
  const h1 = await p.innerText('#coach [data-co-h="1"]');
  check(/“Abram” is in the KJV but not in yours/.test(h1) && /“unto”: KJV English/.test(h1), 'hints as he writes: a name left out, KJV English (' + h1.replace(/\n/g, ' · ') + ')');
  check(!(await p.innerText('#coach [data-co-h="2"]')).trim(), 'and none on a verse that needs none');
  await p.fill('#coach [data-co-in="3"]', 'Bless.'); await wait(500);
  check(/Much shorter than the KJV/.test(await p.innerText('#coach [data-co-h="3"]')), 'a verse much shorter than the KJV gets a hint');
  await p.fill('#coach [data-co-in="3"]', ''); await wait(400);
  await p.click('#coachSave'); await wait(500);
  check(await p.locator('#coach').isHidden(), 'Save, with hints showing, saves and goes back to the chapter');
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('treasureup.own') || '{}'));
  check(kept['Genesis 12'] && kept['Genesis 12'].v[1] === MINE[0] && kept['Genesis 12'].v[2] === MINE[1] && !kept['Genesis 12'].v[3], 'kept on the device, the two verses he wrote');
  check(!JSON.stringify(await state(p)).includes('Leave your country'), 'and not in his progress (which the family can read)');

  // A reload: still there, the chapter marked, and Show mine puts it under the verses.
  await reopen(dev, url); p = dev.page;
  await p.click('#tabs [data-tab="scriptures"]'); await wait(800);
  await p.click('#home [data-lib-vol="Old Testament"]'); await wait(300);
  check(/1 of yours/.test(await p.innerText('#home [data-lib-book="Genesis"]')), 'after a reload, Genesis says it has 1 of his in the Old Testament');
  await toGenesis('Genesis 12');
  check(await p.locator('#home .lib-ch.own[data-lib-ch="Genesis 12"]').count() === 1, 'after a reload, Genesis 12 is marked in the Scriptures tab');
  check(/your own version/.test(await p.innerText('#home')), 'with a line saying what the teal mark is');
  await p.click('#home [data-lib-ch="Genesis 12"]'); await wait(900);
  check(/2 of 3 verses/.test(await p.innerText('#viewBody .co-open')), 'the door says how far he got');
  await p.click('#viewBody [data-coach]'); await wait(600);
  check(await p.inputValue('#coach [data-co-in="1"]') === MINE[0] && await p.inputValue('#coach [data-co-in="2"]') === MINE[1], 'what he wrote is still there');
  await p.click('#coachBack'); await wait(400);
  check(!(await p.locator('#viewBody .ls-own').count()), 'his version is not under the verses until he asks');
  await p.click('#viewBody [data-own-show]'); await wait(400);
  const own = await p.$$eval('#viewBody .ls-vv', vs => vs.map(v => [v.querySelector('.ls-v') ? 1 : 0, (v.querySelector('.ls-own') || {}).textContent || '']));
  check(own[0][0] && own[0][1].includes(MINE[0]) && own[1][1].includes(MINE[1]) && !own[2][1], 'Show mine: his version under each KJV verse he wrote');

  // A chapter whose Hebrew doesn't come: it opens, says so, and he can still write.
  await openChapter('Genesis 13');
  await p.click('#viewBody [data-coach]'); await wait(900);
  const msg = await p.locator('#coachMsg');
  check(!(await msg.isHidden()) && /didn’t open/.test(await msg.innerText()) && await p.locator('#coach [data-co-in="1"]').count() === 1, 'without its words: a short line, and the box still there');
  await p.click('#coachBack'); await wait(400);

  // Off again: the reader exactly as before, and nothing marked.
  await p.click('#viewBack'); await wait(300);
  await hub('1234', async () => { await p.click('#parentBody [data-act="coach"]'); await wait(300); });
  await openChapter('Genesis 12');
  check(await reader() === before, 'turned off, the reader is exactly as it was');
  await p.click('#viewBack'); await wait(300);
  check(!(await p.locator('#home .lib-ch.own').count()), 'and no chapter is marked');
  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();
}
