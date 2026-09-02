# AGENTS.md

## What this is

Static Asteroids clone: HTML5 Canvas + vanilla JS. No framework, no bundler, no `package.json`, no build step. The entire game lives in `game.js`, loaded by `index.html` via a plain `<script>` tag (no ES modules — everything is file-scoped in one script).

## Running / verifying

- Open `index.html` directly in a browser, or `npx serve .` (nothing to install).
- No test suite, linter, or typecheck exists. Quick syntax check: `node --check game.js`. Anything beyond syntax requires manually playing in a browser.

## Gotchas

- Canvas size is duplicated: `W`/`H` constants in `game.js` (800×600) must match the `width`/`height` attributes on `<canvas id="canvas">` in `index.html`. Change both together.
- Input: `pressed(code)` is a destructive one-shot read — each keydown is consumed by the first check in a frame. Use `keys[code]` for held state; never poll the same key with `pressed()` twice per frame.
- Game flow is a state machine (`state` = `'playing' | 'dead' | 'gameover'`) inside `update()`; execution starts from `initGame()` + `requestAnimationFrame(loop)` at the bottom of `game.js`.
- Asteroid sizes are 3=large, 2=medium, 1=small. Size-indexed data lives in the `RADII`/`SPEEDS`/`POINTS` arrays (index 0 is a placeholder).
- `EstrellaFugaz` (special fast asteroid) is pushed into the shared `asteroids` array via duck typing: it has no `size`, defines `points`/`split()`/`isStar`, and the bullet-collision loop scores with `a.points ?? POINTS[a.size]`. Spawn cadence comes from the `starTimer` global in `update()`.
- Comments, HUD strings, and the README are in Spanish — keep new comments and user-facing text in Spanish.
