// Render every page listed below to PNG with Playwright.
// Run: node kids-channel/render.js            (all)
//      node kids-channel/render.js brand      (only paths containing "brand")
const { chromium } = require('playwright');
const path = require('path');

const pages = [
  ['brand/logo.html', 1000, 1000],
  ['brand/avatar.html', 800, 800],
  ['brand/banner.html', 2560, 1440],
  ['brand/thumbnail-ep01.html', 1280, 720],
  ['posters/silat-alrahim.html', 1080, 1350],
  ['posters/alsidq.html', 1080, 1350],
  ['posters/altabassum.html', 1080, 1350],
  ...[1, 2, 3, 4, 5, 6].map(n => [`episode-01/scenes/scene-${n}.html`, 1920, 1080]),
];

(async () => {
  const filter = process.argv[2] || '';
  const browser = await chromium.launch();
  for (const [rel, w, h] of pages) {
    if (!rel.includes(filter)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(__dirname, rel));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const out = path.join(__dirname, rel.replace(/\.html$/, '.png'));
    await page.screenshot({ path: out });
    console.log('✓', path.relative(__dirname, out));
    await page.close();
  }
  await browser.close();
})();
