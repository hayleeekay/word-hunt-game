# Word Hunt

Trace neighboring letters to find every flower hidden in the board. Paths can
turn and go diagonally. Each tile can be used once per word, and some other
words earn bonus credit.

Drag and release to check a word, or pick tiles one by one and choose **Check
word**. With a keyboard, use the arrow keys to move, Enter or Space to pick a
tile, and Escape to clear the current selection. Returning to the previous
tile backs up one step.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

This version plays one fixed Flowers board. The development server shows a
collapsed **Show test answers** panel for testing. The production build omits
the panel. Run `npm run build` to type-check and build the game, and
`npm run preview` to try the built version.

The original [Python and Flask prototype](https://github.com/hayleeekay/word-hunt-game/tree/504f840)
is still in the repository.
