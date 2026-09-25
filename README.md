# mathdemos

main is live at https://main--mathdemos.netlify.app/

Brief math demos suitable for explaining a specific concept.

Each demo takes one idea that a static page cannot show and makes it draggable.
They live as case studies in a single Vite + React + TypeScript app, deployed to
Netlify. Adding a demo means adding a component and a line, not a new project.

```
npm install
npm run dev      # http://localhost:5173
npm run build
npm run shoot    # screenshots to shots/ (dev server must be running)
```

## Demos

| id | Topic | What it shows |
|----|-------|---------------|
| `bivariate` | Regression | The line of best fit. Preset paired data or your own, typed into a table that is always on the page; the scatter plot, the least-squares line, its slope and intercept, r and r² follow every edit. A button swaps x and y, which leaves r alone and changes the line. |
| `binning` | Histograms | Class width changes the picture. Same data, a slider on the width, a toggle between a frequency and a relative-frequency axis, and a raw view showing every observation unbinned. A second toggle swaps the histogram for a boxplot of the same data. |

A demo may name a course it is used in, via the optional `course` field in the
registry. None currently do, and the app itself is not tied to any course.

## Adding one

1. Write a component in `src/cases/`.
2. Append it to the array in `src/cases/index.ts`.

That is the whole registry. `src/components/Histogram.tsx` is reusable and
`src/data/datasets.ts` holds the shared data.

## Notes on the regression demo

- **The table is the data.** Picking a preset only fills the boxes in. After
  that the numbers are the user's, and the preset button goes dark.
- **A box commits on blur, Enter or its ✓, never on keystroke.** While an edit
  is pending the box is amber and a ✓ and ✕ sit beside it, because a phone's
  numeric keyboard may have no Enter and a tap elsewhere does not reliably
  blur. While something that is not a number is in it, the box is red. On the
  way out a non-number is discarded and the old value comes back. Escape and
  ✕ discard too. So the data behind the chart is always numeric, and a
  half-typed entry never moves the line.
- **The line is drawn over the data's own x range** and no further.

## Notes on the binning demo

Every dataset is small enough to print, so a number on screen can be checked by
hand.

- **Bars touch.** That is the definition of a histogram and the thing Module 2
  spends a page on, so the usual gap between adjacent bars is deliberately not
  used. A hairline stroke separates them instead.
- **Values are whole numbers.** The demo can show the raw data, and heights
  measured to four decimal places would give away that they are generated.
  Heights are to the nearest inch, so that is what they are.
- **Synthetic values are scattered, not evenly spaced.** The heights and grades
  datasets are built to hit a chosen set of class counts exactly. Placing the
  values evenly inside each class would make every *narrower* binning come out
  artificially smooth, which hides the exact thing the slider exists to show, so
  they are placed by a seeded PRNG. Same picture on every load.
- **The raw strip is jittered.** These datasets are whole numbers with many
  repeats, so one tick per value stacks them all on the same line and the strip
  reads as an evenly spaced ruler, which is the opposite of the truth. Vertical
  jitter lets density show. Nothing about it is binned.
- **The boxplot uses calculator quartiles.** Q1 and Q3 are the medians of the
  lower and upper halves, leaving the median out of both when the count is odd,
  which is what a TI-84's 1-Var Stats does. Outliers are values strictly outside
  the 1.5 IQR fences; whiskers stop at the last value inside them. It has its own
  axis, reaching both fences and every value, so both fences are always drawn.
  The histogram's axis would not do: it is sized for the widest classes, so it
  runs past the data on the right and stops at it on the left.
- Colours are one categorical slot from a validated palette, with light and dark
  steps checked separately against their own surfaces.

## Deploying

`netlify.toml` carries the build command, the publish directory, a pinned Node
version, and an SPA fallback. Netlify builds `main` on push.
