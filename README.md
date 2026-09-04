# mathdemos

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

| id | Topic | Used in | What it shows |
|----|-------|---------|---------------|
| `binning` | Histograms | MTH 160X, Module 2 | Class width changes the picture. Same data, a slider on the width, a toggle between a frequency and a relative-frequency axis, and a raw view showing every observation unbinned. |

A demo names its own course in the registry, or omits it. The app itself is not
tied to a course.

## Adding one

1. Write a component in `src/cases/`.
2. Append it to the array in `src/cases/index.ts`.

That is the whole registry. `src/components/Histogram.tsx` is reusable and
`src/data/datasets.ts` holds the shared data.

## Notes on the binning demo

The data is the same data as the printed MTH 160X packets, so a number on screen
can be pointed at on paper. `heights` at width 2 reproduces packet p16 bar for
bar, and `grades` at width 3 reproduces p15.

- **Bars touch.** That is the definition of a histogram and the thing Module 2
  spends a page on, so the usual gap between adjacent bars is deliberately not
  used. A hairline stroke separates them instead.
- **Values are whole numbers.** The demo can show the raw data, and heights
  measured to four decimal places would give away that they are generated. The
  packet says "to the nearest inch", so that is what they are.
- **Synthetic values are scattered, not evenly spaced.** The heights and grades
  datasets are built to hit the packet's class counts exactly. Placing the
  values evenly inside each class would make every *narrower* binning come out
  artificially smooth, which hides the exact thing the slider exists to show, so
  they are placed by a seeded PRNG. Same picture on every load.
- **The raw strip is jittered.** These datasets are whole numbers with many
  repeats, so one tick per value stacks them all on the same line and the strip
  reads as an evenly spaced ruler, which is the opposite of the truth. Vertical
  jitter lets density show. Nothing about it is binned.
- Colours are one categorical slot from a validated palette, with light and dark
  steps checked separately against their own surfaces.

## Deploying

`netlify.toml` carries the build command, the publish directory, a pinned Node
version, and an SPA fallback. Netlify builds `main` on push.
