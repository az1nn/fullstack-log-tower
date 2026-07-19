const { chromium } = require('playwright-core');
const fs = require('fs');

const BASE = 'http://localhost:8080';
const OUT = '/home/az1nn/fullstack-log-tower/screenshots';
const EXEC = process.env.PW_EXEC || undefined;

const pages = [
  { name: 'dashboard', url: BASE + '/', wait: 2500 },
  { name: 'logs', url: BASE + '/logs', wait: 2500 },
  { name: 'upload', url: BASE + '/upload', wait: 2000 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE-ERR:', m.text());
  });
  for (const p of pages) {
    console.log('screenshot:', p.name, p.url);
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.log('goto err', e.message));
    await page.waitForTimeout(p.wait);
    await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: false });
  }
  await browser.close();
  console.log('done ->', OUT);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
