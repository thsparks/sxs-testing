# Contributing to Bounce's Big Adventure

Thanks for your interest in improving the game! A few ground rules keep the project simple and easy to run for everyone.

## No external packages — ever

This project is intentionally built with **zero dependencies**: no `package.json`, no npm/yarn/pnpm packages, no CDN-hosted libraries, no bundlers, no frameworks. The entire game is plain HTML, CSS, and vanilla JavaScript using the built-in Canvas API.

This is a deliberate design choice, not an oversight:

- Anyone can open `index.html` directly in a browser with no install step, build step, or internet connection.
- There's no dependency tree to audit, update, or worry about going stale or vanishing.
- The codebase stays small and approachable for contributors of any experience level.

**Pull requests that add a package manager, external library, font, icon set, or any third-party script/stylesheet reference will not be accepted.** If you find yourself reaching for a dependency to solve a problem, please implement the equivalent behavior directly in `game.js`/`style.css` instead, or discuss the tradeoff in an issue first.

## Project structure

```
platformer-game/
  index.html   # Markup for the menu, level select, and game screens
  style.css    # All visual styling
  game.js      # Game logic, rendering, and level data
```

## Making changes

1. Open `platformer-game/index.html` directly in a browser to test your changes — there's no build step.
2. Keep new levels consistent with the existing data shape in `levelInfo` inside `game.js` (platforms, stars, enemy, goal, width, theme). Give each level a `theme` whose sky, celestial body, platform colors, decor, and enemy style match its name.
3. If you add a level, make sure it's reachable from the level select screen and that the unlock progression still makes sense.
4. Favor small, focused changes. Match the existing code style rather than introducing a new one.
5. Manually verify: menu navigation, level select (including locked levels), core gameplay (movement, jumping, stars, enemies, goal), and both winning and losing a level.

## Reporting issues

If you hit a bug or have an idea, please open an issue describing the behavior you expected versus what happened, and which level (if any) it occurred on.
