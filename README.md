# Virtual Luxury Home

A small explorable 3D town in the browser. Walk a blocky character around, approach buildings and interact with them.

Built with [Three.js](https://threejs.org) and [Vite](https://vite.dev). No 3D model files: everything is generated from boxes and cylinders in code, so the whole site is about 150 kB gzipped.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## Deploy to Vercel

Option A, from GitHub (recommended):

1. Push this folder to a GitHub repository.
2. On vercel.com choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically (build command `npm run build`, output `dist`). Click **Deploy**.

Option B, from your terminal:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

## Controls

| | Desktop | Touch |
|---|---|---|
| Move | W A S D / arrows | Left thumb (floating joystick) |
| Run | Shift | Run button (toggle) |
| Jump | Space | Jump button |
| Look | Drag the mouse | Drag anywhere else |
| Zoom | Scroll wheel | Pinch |
| Interact | E | Tap the prompt |
| Close / leave | Esc | ✕ or Leave |

## What you can do

| Place | Interaction |
|---|---|
| Mini Golf | Three playable holes. Aim with the camera (or A/D), hold Space to charge, release to putt. Scorecard at the end. |
| Virtual Mall | Walk inside, visit the four kiosks, add items to a cart, demo checkout. |
| Virtual Garage | Doors open as you approach. Cycle the cars and repaint them live. |
| Luxury Home Gallery | Room-by-room tour, and switch the house lights on. |
| Virtual Office | Reception panel with services and a demo contact form. |
| Gym | Jumping-jack workout with a rep counter. |
| Pool | Walk in and swim. |

## Project layout

```
index.html        HUD markup (prompt, panel, touch buttons, start screen)
src/main.js       Renderer, lights, camera rig, game loop, interaction wiring
src/world.js      Town layout: roads, buildings, props, colliders, interaction zones
src/player.js     Character model, movement, collision, procedural animation
src/controls.js   Keyboard, mouse and touch input
src/golf.js       Mini golf (holes are defined in the HOLES array at the top)
src/mall.js       Mall catalogue (CATALOG) and cart
src/panels.js     Garage, home gallery and office panels
src/ui.js         DOM overlay helpers
src/builders.js   box / cylinder / sign helpers
src/style.css     All UI styling
```

## Replacing the placeholder content

- **Shop products**: edit `CATALOG` in `src/mall.js`.
- **Cars**: edit `defs` in the garage section of `src/world.js`.
- **Gallery rooms**: edit `ROOMS` in `src/panels.js`.
- **Office text and form**: edit `openOffice` in `src/panels.js`. The form does not send anything yet.
- **Building names**: search for `sign(` in `src/world.js`.

## Adding a new interactive building

1. In `src/world.js`, build it with `block(...)` (visible box + collider) and add `zone('myId', x, z, radius, 'Prompt text')`.
2. In `src/main.js`, add `myId: (z) => { ... }` to `ACTIONS`.
