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
| `sampling` | Sampling distributions | The sampling distribution of the mean, and of a proportion, built one grab at a time. A bag of n numbered marbles, or x black and y white ones; m drawn with replacement land on one number line, their mean (or proportion of black) drops as a square onto a second, where a frequency histogram with fixed bins counts every trial so far; its axis starts at 0 to 6 and rescales only once a bar passes 6. Buttons for one grab, ten in succession, or a thousand at once; the SD of the statistics beside σ/√m or √(p(1−p)/m).  A third bag, *My data*, is typed in as a census, one token per person such as `B3` for Bob with three keys; every marble shows its label, the bag's mean is the true population mean, and a grab is a simple random sample with no one drawn twice (or with replacement, by a switch), so a room can be sampled in front of itself. |

| `two-events` | Probability | A Venn diagram on a line. The sample space is the unit interval, A and B are stretches of it, and four sliders set P(A), P(B), P(A and B) and P(A or B). One equation ties them, so moving one slider moves another; a bar under the overlap and union sliders shows the values that fit. Presets for disjoint, independent and nested. |
| `binning` | Histograms | Class width changes the picture. Same data, a slider on the width, a three-way axis (frequency, relative frequency, density), and a raw view showing every observation unbinned. The relative and density axes are pinned per dataset, so narrowing the classes flattens the relative-frequency bars toward zero while the density bars hold their height; density mode draws the frequency polygon, whose area is exactly 1 by construction. A second toggle swaps the histogram for a boxplot. A *Your data* entry takes a typed or pasted list (spaces, commas or line breaks) with its own units; its class widths are a ladder of round numbers from one class holding everything down to twenty-odd, so a room's measurements can be binned on the spot. |

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
- **The whole set can be one text box instead**, one pair per line, for
  pasting. It follows the same rule on the whole text at once: amber while
  pending, red with the offending line named when it does not parse, and put
  back on the way out. Its first line is the axis names; paste numbers alone
  and the axes are called x and y. Limits: 100 rows, 4000 characters.
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
