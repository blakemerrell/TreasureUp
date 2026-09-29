(function (root) {
  'use strict';

  const FIREBASE_PROJECTS = {
    '/TreasureUp/': {
      apiKey: 'AIzaSyCFVw2nEIUteNZhYmBB1Xl0bzsHdtLoJW8',
      authDomain: 'treasure-up-54eeb.firebaseapp.com',
      projectId: 'treasure-up-54eeb',
      appId: '1:493129438219:web:1b9cc9a131bcc558e6a30e'
    },
    '/TreasureUp-test/': {
      apiKey: 'AIzaSyB9X27jbNg4DOGcrZ8k1BGzR1veJXos3Tc',
      authDomain: 'scripturetok-test.firebaseapp.com',
      projectId: 'scripturetok-test',
      appId: '1:865412939485:web:f1652b7b6cfa874559e534'
    }
  };
  const FIREBASE_CONFIG = Object.keys(FIREBASE_PROJECTS)
    .filter(path => (location.hostname.endsWith('github.io') || location.hostname === 'localhost') &&
                    location.pathname.includes(path.slice(0, -1)))
    .map(path => FIREBASE_PROJECTS[path])[0] || FIREBASE_PROJECTS['/TreasureUp/'];

  const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  let fbReady = null;

  function loadScript(src) {
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => no(new Error("Couldn't connect to Firebase"));
      document.head.appendChild(s);
    });
  }

  function fbInit() {
    if (!fbReady) {
      fbReady = (async () => {
        if (!window.firebase) {
          await loadScript(FB_SDK + 'firebase-app-compat.js');
          await loadScript(FB_SDK + 'firebase-auth-compat.js');
          await loadScript(FB_SDK + 'firebase-firestore-compat.js');
        }
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        await new Promise(ok => { const off = firebase.auth().onAuthStateChanged(() => { off(); ok(); }); });
      })();
      fbReady.catch(() => { fbReady = null; });
    }
    return fbReady;
  }

  async function fbUser() {
    await fbInit();
    const auth = firebase.auth();
    return auth.currentUser || (await auth.signInAnonymously()).user;
  }

  // --- WebRTC Logic ---

  const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  class RTCManager {
    constructor() {
      this.peers = new Map(); // uid -> RTCPeerConnection
      this.db = null;
      this.myUid = null;
      this.code = null;
      this.onMessage = (uid, msg) => {};
      this.onConnect = (uid) => {};
      this.unsubs = [];
    }

    async init() {
      const u = await fbUser();
      this.myUid = u.uid;
      this.db = firebase.firestore();
      return this.myUid;
    }

    _createPeer(uid, isHost) {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.onicecandidate = e => {
        if (e.candidate) {
          this.db.collection('risk').doc(this.code).collection('webrtc').add({
            from: this.myUid,
            to: uid,
            candidate: e.candidate.toJSON(),
            at: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      };

      if (isHost) {
        const dc = pc.createDataChannel('liberty');
        this._setupDataChannel(uid, dc);
      } else {
        pc.ondatachannel = e => {
          this._setupDataChannel(uid, e.channel);
        };
      }
      this.peers.set(uid, pc);
      return pc;
    }

    _setupDataChannel(uid, dc) {
      dc.onopen = () => {
        console.log('DataChannel opened with', uid);
        this.onConnect(uid);
      };
      dc.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          this.onMessage(uid, msg);
        } catch (err) {}
      };
      // Save data channel to send messages
      const pc = this.peers.get(uid);
      if (pc) pc.dc = dc;
    }

    send(uid, msg) {
      const pc = this.peers.get(uid);
      if (pc && pc.dc && pc.dc.readyState === 'open') {
        pc.dc.send(JSON.stringify(msg));
      }
    }
    
    broadcast(msg) {
      const str = JSON.stringify(msg);
      for (const pc of this.peers.values()) {
        if (pc.dc && pc.dc.readyState === 'open') pc.dc.send(str);
      }
    }

    async host() {
      await this.init();
      // Try generating a code
      for (let i = 0; i < 20; i++) {
        const c = String(1000 + Math.floor(Math.random() * 9000));
        try {
          await this.db.runTransaction(async t => {
            const ref = this.db.collection('risk').doc(c);
            if ((await t.get(ref)).exists) throw new Error('taken');
            t.set(ref, {
              host: this.myUid,
              state: 'lobby',
              mode: 'liberty',
              created: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
          this.code = c;
          break;
        } catch (e) {
          if (e.message !== 'taken') throw e;
        }
      }
      if (!this.code) throw new Error("Could not create game lobby.");

      // Listen for players joining and sending SDP Offers
      const off = this.db.collection('risk').doc(this.code).collection('webrtc')
        .where('to', '==', this.myUid)
        .onSnapshot(async snap => {
          for (const change of snap.docChanges()) {
            if (change.type === 'added') {
              const data = change.doc.data();
              const uid = data.from;
              
              if (data.offer) {
                console.log('Received offer from', uid);
                const pc = this._createPeer(uid, true); // Host is the one who created DataChannel
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                await this.db.collection('risk').doc(this.code).collection('webrtc').add({
                  from: this.myUid,
                  to: uid,
                  answer: answer.toJSON(),
                  at: firebase.firestore.FieldValue.serverTimestamp()
                });
              } else if (data.candidate) {
                const pc = this.peers.get(uid);
                if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            }
          }
        });
      this.unsubs.push(off);
      return this.code;
    }

    async join(code) {
      await this.init();
      this.code = code;
      const doc = await this.db.collection('risk').doc(code).get();
      if (!doc.exists) throw new Error("No game with that code.");
      const gameData = doc.data();
      const hostUid = gameData.host;

      const pc = this._createPeer(hostUid, false);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send Offer
      await this.db.collection('risk').doc(this.code).collection('webrtc').add({
        from: this.myUid,
        to: hostUid,
        offer: offer.toJSON(),
        at: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Listen for Answer and ICE candidates
      const off = this.db.collection('risk').doc(this.code).collection('webrtc')
        .where('to', '==', this.myUid)
        .onSnapshot(async snap => {
          for (const change of snap.docChanges()) {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.answer) {
                console.log('Received answer from host');
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              } else if (data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            }
          }
        });
      this.unsubs.push(off);
      return hostUid;
    }
    
    stop() {
      for (const off of this.unsubs) off();
      for (const pc of this.peers.values()) pc.close();
      this.peers.clear();
      this.unsubs = [];
    }
  }

  root.LIB_RTC = new RTCManager();
})(this);
