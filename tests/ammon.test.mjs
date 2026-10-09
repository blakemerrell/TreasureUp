// Test for Ammon at the Waters of Sebus:
// 1. Full-screen edge-to-edge canvas (no letterbox/margins)
// 2. Responsive HUD (HP, stones, power, flock, perks)
// 3. Scripture Wisdom & Divine Blessing rewards between levels
import { check, device, wait } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function ammon({ port }) {
  const artifactDir = '/Users/blakemerrell/.gemini/antigravity/brain/b127422c-cc54-4d5f-b98e-1d4c33b9403a';
  const base = `http://127.0.0.1:${port}/`;

  // Test tablet/mobile view
  const dev = await device('tablet', { url: base + 'index.html' });
  const p = dev.page;
  await p.setViewportSize({ width: 768, height: 1024 });

  // Open Ammon directly via TUAmmon with realistic arcade host
  await p.evaluate(async () => {
    window.TU_AMMON_PADS = true; // Force mobile/touch pads for testing layout

    await new Promise(r => {
      const s1 = document.createElement('script');
      s1.src = 'content/arcade.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'ammon.js';
        s2.onload = r;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
    });

    window.TUAmmon.open({
      ask: () => ({
        q: 'What gave Ammon the strength to defend King Lamoni’s flocks at Sebus?',
        ref: 'Alma 17:35-39',
        choices: [
          'Faith and trusting in the Lord',
          'A royal army sent by the king',
          'Fear of the Lamanite robbers'
        ],
        right: 'Faith and trusting in the Lord',
        why: 'Ammon trusted in the Lord’s promise to his father Mosiah that his sons would be preserved.',
        review: 'Alma 17'
      }),
      player: () => ({ name: 'Young Disciple' }),
      html: (t, r) => t + (r ? ` (${r})` : '')
    });
  });
  await wait(800);

  // Check game root is open
  const rootVis = await p.$eval('#ammon', el => !el.hidden && el.dataset.view);
  check(rootVis === 'menu', 'Ammon opens to menu screen');

  // Start the game
  await p.click('#ammon [data-am="start"]');
  await wait(800);

  // 1. Verify Fullscreen Edge-to-Edge Layout
  const layout = await p.evaluate(() => {
    const root = document.getElementById('ammon');
    const stage = document.getElementById('amStage');
    const canvas = document.getElementById('amCanvas');
    const rRoot = root.getBoundingClientRect();
    const rCanvas = canvas.getBoundingClientRect();
    const rStage = stage.getBoundingClientRect();
    return {
      view: root.dataset.view,
      winW: window.innerWidth,
      winH: window.innerHeight,
      rootW: rRoot.width,
      rootH: rRoot.height,
      stageW: rStage.width,
      stageH: rStage.height,
      canvasW: rCanvas.width,
      canvasH: rCanvas.height,
      hasTicker: !!document.querySelector('.am-panel-ticker'),
      hasOverlayTop: !!document.querySelector('.am-top-overlay')
    };
  });

  check(layout.view === 'game', 'Ammon transitioned to game view');
  check(layout.rootW >= layout.winW && layout.rootH >= layout.winH, `Root fills viewport edge-to-edge (${layout.rootW}x${layout.rootH})`);
  check(layout.canvasW >= layout.winW * 0.95 && layout.canvasH >= layout.winH * 0.95, `Canvas spans 100% of viewport (${layout.canvasW}x${layout.canvasH})`);
  check(layout.hasTicker && layout.hasOverlayTop, 'Header and ticker float as overlays over the sky');

  // Step game loop to render sprites
  await p.evaluate(() => {
    if (window.TUAmmon && window.TUAmmon._t) {
      window.TUAmmon._t.step(200);
    }
  });
  await wait(400);

  // Capture Screenshot 1: Full-Screen Gameplay with Floating Overlays & Touch Controls
  const ss1Path = path.join(artifactDir, 'ammon_fullscreen_gameplay.png');
  await p.screenshot({ path: ss1Path });
  check(fs.existsSync(ss1Path), 'Captured ammon_fullscreen_gameplay.png');

  // 2. Verify HUD
  const hudInfo = await p.evaluate(() => {
    const hpVal = document.querySelector('.am-hp-box .am-hud-val')?.innerText;
    const stoneVal = document.querySelector('.am-stone-box .am-hud-val')?.innerText;
    const pwrVal = document.querySelector('.am-pwr-box .am-hud-val')?.innerText;
    const flockVal = document.querySelector('.am-flock-box .am-hud-val')?.innerText;
    return { hpVal, stoneVal, pwrVal, flockVal };
  });

  check(hudInfo.hpVal && hudInfo.hpVal.includes('100/100'), `HUD displays Ammon HP: ${hudInfo.hpVal}`);
  check(hudInfo.stoneVal && hudInfo.stoneVal.includes('6'), `HUD displays Sling Stones: ${hudInfo.stoneVal}`);
  check(hudInfo.flockVal && hudInfo.flockVal.includes('8/8'), `HUD displays Flock count: ${hudInfo.flockVal}`);

  // 3. Trigger Review Question with Scripture Blessings
  await p.evaluate(() => {
    if (window.TUAmmon && window.TUAmmon._t) {
      window.TUAmmon._t.askQuestion();
    }
  });
  await wait(500);

  const questModal = await p.evaluate(() => {
    const box = document.getElementById('amBox');
    const title = box.querySelector('.am-quest-title')?.innerText;
    const choices = Array.from(box.querySelectorAll('.am-choice')).map(b => b.innerText);
    return {
      visible: !box.hidden,
      title,
      choicesCount: choices.length
    };
  });

  check(questModal.visible, 'Scripture Counsel question modal is visible');
  check(questModal.choicesCount > 0, `Question has choices (${questModal.choicesCount})`);

  // Answer question correctly (find choice with "Faith and trusting")
  await p.evaluate(() => {
    const state = window.TUAmmon._t.state();
    const q = state.q;
    const rightIdx = q.choices.findIndex(c => c === q.right);
    window.TUAmmon._t.answer(rightIdx >= 0 ? rightIdx : 0);
  });
  await wait(500);

  // Check Blessing Cards
  const blessingsModal = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.am-blessing-card'));
    return cards.map(c => ({
      id: c.dataset.blessing,
      name: c.querySelector('.am-blessing-name')?.innerText,
      verse: c.querySelector('.am-blessing-verse')?.innerText,
      desc: c.querySelector('.am-blessing-desc')?.innerText
    }));
  });

  check(blessingsModal.length === 3, `Answering correctly unlocks 3 Divine Blessings (found ${blessingsModal.length})`);
  check(blessingsModal.some(b => b.verse.includes('Alma') || b.verse.includes('Samuel') || b.verse.includes('Ephesians')), 'Blessings include authentic Book of Mormon & Bible citations');

  // Capture Screenshot 2: Scripture Wisdom & Blessing Selection Modal
  const ss2Path = path.join(artifactDir, 'ammon_scripture_blessings_modal.png');
  await p.screenshot({ path: ss2Path });
  check(fs.existsSync(ss2Path), 'Captured ammon_scripture_blessings_modal.png');

  // 4. Select a Blessing ("blazing_stones" or first available)
  const blessingToPick = blessingsModal.find(b => b.id === 'blazing_stones') || blessingsModal[0];
  await p.evaluate(bId => {
    const btn = document.querySelector(`[data-blessing="${bId}"]`);
    if (btn) btn.click();
  }, blessingToPick.id);
  await wait(400);

  const chosenState = await p.evaluate(bId => {
    const card = document.querySelector(`[data-blessing="${bId}"]`);
    const nextBtn = document.querySelector('[data-am="next"]');
    return {
      cardChosen: card && card.classList.contains('chosen'),
      hasNextBtn: !!nextBtn
    };
  }, blessingToPick.id);

  check(chosenState.cardChosen, `Blessing ${blessingToPick.name} marked as chosen`);
  check(chosenState.hasNextBtn, 'Enter Level button appeared');

  // 5. Proceed to next level and verify applied perks in HUD
  await p.click('#ammon [data-am="next"]');
  await wait(600);

  const postBlessingState = await p.evaluate(() => {
    const s = window.TUAmmon._t.state();
    const perkPills = Array.from(document.querySelectorAll('.am-perk-pill')).map(el => el.innerText);
    return {
      level: s.level,
      perksCount: s.perks ? s.perks.size : 0,
      blazingStones: s.blazingStones,
      stonesMax: window.TUAmmon._t.T.stonesMax,
      perkPills
    };
  });

  check(postBlessingState.level === 2, `Advanced to Level ${postBlessingState.level}`);
  check(postBlessingState.perksCount > 0, `Active perks applied in game state (${postBlessingState.perksCount})`);
  check(postBlessingState.perkPills.length > 0, `Active blessings badge rendered on HUD: ${postBlessingState.perkPills.join(', ')}`);

  // Capture Screenshot 3: Active HUD with ✨ BLESSINGS tray in Level 2
  const ss3Path = path.join(artifactDir, 'ammon_perk_active_hud.png');
  await p.screenshot({ path: ss3Path });
  check(fs.existsSync(ss3Path), 'Captured ammon_perk_active_hud.png');

  check(!p.errors.length, 'No console/page errors in Ammon test: ' + (p.errors.join(' | ') || 'None'));

  await dev.ctx.close();
}
