# Phosphor Strike

A 2D vertical space shooter rendered with three.js, styled like a green-phosphor vector CRT (bloom, scanlines, screen curvature, flicker).

## Run

Requires Node.js 18+.

```bash
npm install
npm run dev      # dev server with hot reload at http://localhost:5173
npm run build    # production build into dist/
npm start        # serve dist/ with the Node server at http://localhost:3000
```

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Move |
| Space | Fire |
| P | Pause / resume |
| Esc (while paused) | Quit to title screen |
| M | Mute |
| Touch | Drag to move, auto-fire |

## Gameplay

- Waves of drones, squads, fighters (shoot back) and kamikazes (dive at you); difficulty ramps each wave.
- Every 5th wave is a mothership boss.
- Power-ups: arrow = weapon level (up to triple spread), circle = shield, cross = extra life.
- High score is kept in `localStorage`.

## Structure

- `src/main.js` – renderer, post-processing, game loop, entities, waves
- `src/shapes.js` – vector line-art geometry for ships, bullets, power-ups
- `src/crtShader.js` – green phosphor CRT post-processing shader
- `src/audio.js` – synthesized retro sound effects (Web Audio)
- `server.js` – zero-dependency Node static server for the production build
