# 🐰 Bounce's Big Adventure

A cute, lightweight 2D platformer built with plain HTML, CSS, and JavaScript — no build step, no frameworks, no external packages. Just open it in a browser and play.

## Playing the game

Open `platformer-game/index.html` in any modern browser (double-click it, or serve the folder with any static file server). From the main menu you can:

- **Play Adventure** — jump straight into the next unlocked level.
- **Choose a level** — open the **Bunny Island world map**. Bounce hops along a winding path between the 5 levels; click a level (or use ← → / number keys) to hop there, then click it again or press Enter / **Play** to jump in. Levels unlock in order as you complete them, and the path to a newly unlocked level is revealed with a little celebration. Completed levels show a flag, and a gold star marks levels where you grabbed every star. The island also hides a few secrets for curious players to find (🔍 found secrets are counted on the map), and the 🔊 button toggles the map's sound effects.

### Controls

| Action | Keys |
| --- | --- |
| Move left / right | ⬅️ ➡️ or A / D |
| Jump | ⬆️, W, or Space |
| Back to level select / menu | Esc |
| World map: hop between levels | ⬅️ ➡️, A / D, or 1–5 |
| World map: play selected level | Enter, Space, or click |

### Goal

Guide Bounce the rabbit across each level: collect ⭐ stars for points, stomp on slimes to defeat them (touching them any other way costs a life), and reach the flag to complete the level. Losing all your lives ends the run, but you can always try again.

## Levels

The game ships with 5 hand-built levels of increasing size and difficulty, from the short introductory `Meadow Morning` up to the sprawling, scrolling `Aurora Summit`. Each level has its own scenery matching its name — a sunrise meadow, a shady mushroom grove, bright cloud-top cliffs, a dusk-lit temple, and a starry night summit under the aurora. Larger levels use camera scrolling and a progress bar in the HUD to show how far you've traveled.

## Project structure

```
platformer-game/
  index.html   # Markup for the menu, world map, and game screens
  style.css    # All visual styling
  worldmap.js  # Interactive world map level select (Canvas scenery, animation, synthesized sounds, secrets)
  game.js      # Game logic, rendering, and level data (vanilla JS + Canvas)
```

## Tech notes

- Pure vanilla JavaScript and the HTML5 Canvas API — no dependencies, no package manager, no build tooling required.
- See [CONTRIBUTING.md](CONTRIBUTING.md) before adding new features or levels.
