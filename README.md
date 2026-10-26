# WebFishing

A cozy, low-poly, top-down 3D fishing game for the browser, built with [three.js](https://threejs.org/) and [Vite](https://vite.dev/).

See [ROADMAP.md](ROADMAP.md) for what's done and what's next.

## Running

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
```

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Run |
| Space / Left click | Hold to charge a cast, release to throw. Press on a bite to hook, hold to reel |
| F | Interact (signs, doors) |
| B | Open bucket |
| J | Open journal |
| Esc | Pause / settings, or close a menu |
| Q / E | Rotate camera |
| Mouse wheel | Zoom |

## Project layout

```
src/
  main.js            entry point
  Game.js            renderer, scene, main loop; wires systems together
  config.js          palette and tunable numbers
  core/              input, settings, math helpers, event emitter
  audio/             synthesised sound: engine/mixer, sfx, ambience, music
  collection/        fish species data, bucket (inventory), journal
  camera/            top-down follow camera
  player/            player model + controller
  fishing/           fishing state machine, rod, bobber, line, effects, placeholder fish
  world/
    island.js        pure functions describing the island's shape (shared by visuals + gameplay)
    terrain.js       faceted terrain mesh
    water.js         animated water + shoreline foam
    lighting.js      sun, sky, fog
    Colliders.js     simple 2D circle / box collision
    World.js         assembles the island and answers "can I stand here?"
    props/           dock, hut, trees, rocks, decor
  ui/                DOM HUD overlay + fishing widgets
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (or the dev branch).
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The game is then served at `https://<user>.github.io/WebFishing/`.
