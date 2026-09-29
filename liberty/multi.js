(function(root) {
  'use strict';
  const RTC = root.LIB_RTC;

  // TV Host logic
  async function startTvLobby() {
    document.getElementById('tvLobby').hidden = false;
    document.getElementById('hud').hidden = true;
    document.getElementById('panel').hidden = true;
    document.getElementById('view').hidden = true;

    try {
      const code = await RTC.host();
      document.getElementById('tvCode').textContent = code;
      const url = location.origin + location.pathname + '#join-' + code;
      
      if (typeof qrcode !== 'undefined') {
        const qr = qrcode(4, 'M');
        qr.addData(url);
        qr.make();
        document.getElementById('tvQr').innerHTML = qr.createSvgTag(6, 0);
      }

      
      let playerCount = 0;
      const cursors = new Map();
      
      RTC.onConnect = (uid) => {
        playerCount++;
        document.getElementById('tvPlayers').textContent = `${playerCount} player(s) joined.`;
        document.getElementById('tvStart').disabled = false;
        
        // Create an HTML cursor
        const c = document.createElement('div');
        c.style.position = 'fixed';
        c.style.width = '20px';
        c.style.height = '20px';
        c.style.background = playerCount === 1 ? '#e11d48' : '#2563eb'; // Red or Blue
        c.style.borderRadius = '50%';
        c.style.border = '2px solid white';
        c.style.zIndex = '9999';
        c.style.pointerEvents = 'none';
        c.style.left = (window.innerWidth / 2) + 'px';
        c.style.top = (window.innerHeight / 2) + 'px';
        c.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        document.body.appendChild(c);
        
        cursors.set(uid, { el: c, x: window.innerWidth / 2, y: window.innerHeight / 2, color: c.style.background });
      };

      RTC.onMessage = (uid, msg) => {
        const cursor = cursors.get(uid);
        if (!cursor) return;
        
        if (msg.type === 'move') {
          // Trackpad sensitivity multiplier
          cursor.x += msg.dx * 1.5;
          cursor.y += msg.dy * 1.5;
          // Clamp to screen
          cursor.x = Math.max(0, Math.min(window.innerWidth, cursor.x));
          cursor.y = Math.max(0, Math.min(window.innerHeight, cursor.y));
          cursor.el.style.left = cursor.x + 'px';
          cursor.el.style.top = cursor.y + 'px';
          
          // If we want the game to highlight things under the cursor, we could inject hover
          // root.LIB_UI.setRemoteHover(uid, cursor.x, cursor.y);
          
        } else if (msg.type === 'tap') {
          // Simulate a click at cursor.x, cursor.y
          const target = document.elementFromPoint(cursor.x, cursor.y);
          if (target && target.click && target.id !== 'view') {
             target.click(); // e.g. clicking UI buttons
          } else if (root.LIB_UI) {
             root.LIB_UI.remoteClick(cursor.x, cursor.y, cursor.color);
          }
        } else if (msg.type === 'action') {
          // Press HUD buttons
          if (msg.action === 'build') {
             const bBox = document.getElementById('bBox'); // Placeholder, or a build button
             if (bBox) bBox.click();
          } else if (msg.action === 'attack') {
             // Attack command (handled by tap contextually, but could force attack mode)
          }
        }
      };


      document.getElementById('tvStart').onclick = () => {
        document.getElementById('tvLobby').hidden = true;
        document.getElementById('hud').hidden = false;
        document.getElementById('panel').hidden = false;
        document.getElementById('view').hidden = false;
        
        // Broadcast game start
        RTC.broadcast({ type: 'start', seed: 42 });
        
        // Start Liberty locally as host
        if (root.LIB_UI) root.LIB_UI.begin('free');
      };
      
    } catch (err) {
      document.getElementById('tvPlayers').textContent = 'Error: ' + err.message;
    }
  }

  // Phone Controller logic
  async function startPhoneController(code) {
    document.getElementById('view').hidden = true;
    document.getElementById('hud').hidden = true;
    document.getElementById('panel').hidden = true;
    document.getElementById('gamepad').hidden = false;

    document.getElementById('gpHeader').textContent = 'Connecting...';

    RTC.onConnect = () => {
      document.getElementById('gpHeader').textContent = 'Connected. Waiting for host...';
    };

    RTC.onMessage = (uid, msg) => {
      if (msg.type === 'start') {
        document.getElementById('gpHeader').textContent = 'Game Started! (Code: ' + code + ')';
      }
    };

    try {
      await RTC.join(code);
    } catch (err) {
      document.getElementById('gpHeader').textContent = 'Error: ' + err.message;
      return;
    }

    // Hook up gamepad events
    const pad = document.getElementById('gpTrackpad');
    let lastX = 0, lastY = 0;
    
    pad.addEventListener('pointerdown', e => {
      lastX = e.clientX;
      lastY = e.clientY;
      pad.setPointerCapture(e.pointerId);
    });
    
    pad.addEventListener('pointermove', e => {
      if (pad.hasPointerCapture(e.pointerId)) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        RTC.broadcast({ type: 'move', dx, dy }); // send to host
      }
    });

    document.getElementById('gpTap').onclick = () => RTC.broadcast({ type: 'tap' });
    document.getElementById('gpBuild').onclick = () => RTC.broadcast({ type: 'action', action: 'build' });
    document.getElementById('gpAttack').onclick = () => RTC.broadcast({ type: 'action', action: 'attack' });
  }

  // Boot router
  window.addEventListener('hashchange', () => location.reload());
  
  if (location.hash === '#tv') {
    startTvLobby();
  } else if (location.hash.startsWith('#join-')) {
    const code = location.hash.slice(6);
    startPhoneController(code);
  }
})(this);
