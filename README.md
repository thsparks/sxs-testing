# 🐰 Bounce's Big Adventure

A cute, lightweight 2D platformer built with plain HTML, CSS, and JavaScript — no build step, no frameworks, no external packages. Just open it in a browser and play.

## Playing the game

Open `platformer-game/index.html` in any modern browser (double-click it, or serve the folder with any static file server). From the main menu you can:

- **Play Adventure** — jump straight into the next unlocked level.
- **Choose a level** — pick from all 5 levels via the level select screen. Levels unlock in order as you complete them.

### Controls

| Action | Keys |
| --- | --- |
| Move left / right | ⬅️ ➡️ or A / D |
| Jump | ⬆️, W, or Space |
| Back to level select | Esc |

### Goal

Guide Bounce the rabbit across each level: collect ⭐ stars for points, stomp on slimes to defeat them (touching them any other way costs a life), and reach the flag to complete the level. Losing all your lives ends the run, but you can always try again.

## Levels

The game ships with 5 hand-built levels of increasing size and difficulty, from the short introductory `Meadow Morning` up to the sprawling, scrolling `Aurora Summit`. Larger levels use camera scrolling and a progress bar in the HUD to show how far you've traveled.

## Project structure

```
platformer-game/
  index.html   # Markup for the menu, level select, and game screens
  style.css    # All visual styling
  game.js      # Game logic, rendering, and level data (vanilla JS + Canvas)
```

## Tech notes

- Pure vanilla JavaScript and the HTML5 Canvas API — no dependencies, no package manager, no build tooling required.
- See [CONTRIBUTING.md](CONTRIBUTING.md) before adding new features or levels.
