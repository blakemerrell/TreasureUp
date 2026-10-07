#!/usr/bin/env node
// Runs the browser tests (tests/*.test.mjs) against the repo, served at
// http://127.0.0.1:8131/. The family test needs the Firebase emulators and
// runs only under them (see tests/README.md); the others need nothing.
//
//   node tests/run.mjs                 smoke, dates, merge, week, coach and offline
//   node tests/run.mjs week            one of them
//   npm run test:family                (the family test, under the Firebase emulators: firebase.json)
import { serve, launch, closeBrowser, results, note } from './lib.mjs';

const port = Number(process.env.TEST_PORT || 8131);
const emulators = !!process.env.FIRESTORE_EMULATOR_HOST;
const asked = process.argv.slice(2);
const names = asked.length ? asked : ['smoke', 'dates', 'merge', 'week', 'coach', 'offline', ...(emulators ? ['family', 'games'] : [])];

const server = await serve(port);
await launch();
const t0 = Date.now();
for (const name of names) {
  if ((name === 'family' || name === 'games') && !emulators) { note('NOTE', `${name}: skipped (it runs under the Firebase emulators)`); continue; }
  console.log(`\n== ${name}`);
  const t = Date.now();
  try { await (await import(`./${name}.test.mjs`)).default({ port }); }
  catch (e) { results.fail++; note('FAIL', `${name} stopped: ${e.message.split('\n')[0]}`); }
  console.log(`   (${Math.round((Date.now() - t) / 1000)} s)`);
}
await closeBrowser();
server.close();
console.log(`\n${results.pass} passed, ${results.fail} failed, ${Math.round((Date.now() - t0) / 1000)} s`);
if (results.fail) {
  if (process.env.GITHUB_ACTIONS) for (const l of results.lines.filter(l => l.startsWith('FAIL'))) console.log('::error::' + l.slice(6));
  process.exit(1);
}
