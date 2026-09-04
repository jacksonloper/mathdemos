// Screenshot the running dev server. Usage:
//   node scripts/shoot.mjs [outDir] [baseUrl]
// Captures light and dark, plus a couple of slider positions, so a visual
// change can be eyeballed without clicking through the app by hand.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const out = process.argv[2] ?? "shots";
const base = process.argv[3] ?? "http://localhost:5173/";
await mkdir(out, { recursive: true });

const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector(".bar");

  await page.screenshot({ path: `${out}/${scheme}-default.png` });

  // Widest bins, then narrowest, to check the extremes of the slider.
  const slider = page.locator("#width");
  const max = Number(await slider.getAttribute("max"));
  await slider.fill(String(max));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${scheme}-wide.png` });

  await slider.fill("0");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${scheme}-narrow.png` });

  await ctx.close();
}

await browser.close();
console.log(`wrote screenshots to ${out}/`);
