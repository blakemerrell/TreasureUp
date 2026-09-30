# Couch Skirmish Architecture (Liberty)

## The Problem
Babylon Falls is a turn-based game, so updating a Firebase database every few seconds works perfectly.
Liberty is a Real-Time Strategy (RTS) game running at 60 Frames Per Second. Sending hundreds of unit movements to Firebase would cause lag and burn through Firebase quota instantly.

## The Solution: WebRTC + Smart Controllers
If we were building this from scratch today, the industry standard approach is **WebRTC DataChannels**. WebRTC is built into all modern browsers (phones, tablets, and smart TVs) and allows devices on the same WiFi to talk directly to each other with zero lag and zero server costs.

### 1. The Handshake (Firestore)
We still use your Babylon Falls Firebase pattern for the "lobby":
- The TV opens `/tv` and creates a Lobby Doc in Firestore with a QR code.
- His tablet and your phone scan the QR code.
- They use Firestore for exactly 2 seconds to exchange "WebRTC Offers" (a digital handshake).

### 2. The Game (WebRTC)
Once the handshake is done, Firebase is no longer used. The tablet and phone send messages directly to the TV over your home WiFi.

- **The TV (Host & Renderer):** Runs `sim.js` and `ui.js`. It renders the beautiful Mesoamerican map, handles pathfinding, and acts as the "Server". It displays two colored cursors (e.g., Red for him, Blue for Dad).
- **The Phones (Smart Controllers):** The mobile devices display a clean, touch-friendly "Gamepad" interface. Instead of rendering the heavy 2.5D graphics, the phone screen has:
  - A trackpad area (to move your cursor on the TV).
  - A "Drag to Select" button.
  - Quick action buttons: "Gather", "Build Farm", "Attack".
  - A live minimap (syncing low-resolution data from the TV).

This allows the TV to be the beautiful shared canvas, while the phones are hyper-responsive tactical controllers.
