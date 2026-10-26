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
| Q / E | Rotate camera |
| Mouse wheel | Zoom |

## Project layout

```
src/
  main.js            entry point
  Game.js            renderer, scene, main loop; wires systems together
  config.js          palette and tunable numbers
  core/              input, math helpers
  camera/            top-down follow camera
  player/            player model + controller
  world/
    island.js        pure functions describing the island's shape (shared by visuals + gameplay)
    terrain.js       faceted terrain mesh
    water.js         animated water + shoreline foam
    lighting.js      sun, sky, fog
    Colliders.js     simple 2D circle / box collision
    World.js         assembles the island and answers "can I stand here?"
    props/           dock, hut, trees, rocks, decor
  ui/                DOM HUD overlay
```
