// Headless browser tests. Usage: NODE_PATH=/workspace/our415-test/node_modules node tests/e2e.js <baseUrl> <shotsDir>
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:8781/'; const SHOTS = process.argv[3] || '/tmp/our415-shots'; fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const errors = [];
const ok = (c, n, x = '') => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/tile\.openstreetmap|favicon/.test(m.text() + (m.location()?.url || ''))) errors.push(m.text() + ' ' + (m.location()?.url || '')); });
  const client = await page.target().createCDPSession(); fs.rmSync('/tmp/our415-dl', { recursive: true, force: true }); await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/our415-dl' });
  const txt = s => page.$eval(s, e => e.textContent);
  const count = s => page.$$eval(s, e => e.length);
  const axe = async (label) => {
    await page.evaluate(axeSrc);
    const r = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, exclude: [['.leaflet-container']] }));
    const v = r.violations.filter(x => ['serious', 'critical'].includes(x.impact));
    ok(v.length === 0, `axe WCAG 2.1 A/AA: no serious/critical violations (${label})`, v.map(x => x.id + ':' + x.nodes.length).join(', '));
    if (r.violations.length) console.log('  axe (all impacts):', r.violations.map(x => x.id + '/' + x.impact).join(', ')); else console.log('  axe: 0 violations of any impact');
    return r.violations;
  };
  await page.setViewport({ width: 1366, height: 900 });
  // ---- live data load ----
  let r = await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0', timeout: 60000 }); ok(r.status() === 200, 'index loads ' + r.status());
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__our415demo && window.__our415demo.dataInfo.mode === 'live', { timeout: 30000 }).catch(() => {});
  const info = await page.evaluate(() => ({ mode: __our415demo.dataInfo.mode, n: __our415demo.items.length }));
  ok(info.mode === 'live' && info.n > 100, `live SF Open Data loaded in browser (${info.n} current records)`, JSON.stringify(info));
  ok((await txt('#disclaimer')).includes('Not a City, DCYF or Our415.org site'), 'disclaimer banner on finder');
  ok((await txt('footer')).includes('Not a City, DCYF or Our415.org site'), 'disclaimer in footer');
  ok((await txt('#dataStatus')).includes('live from DataSF'), 'data status shows live');
  ok(await count('#list .card') === 20 && (await txt('#resCount')).includes('results'), 'initial list renders 20 cards + count');
  ok(await count('.leaflet-interactive') > 20, 'map renders markers', await count('.leaflet-interactive'));
  await page.screenshot({ path: SHOTS + '/demo-screenshot-desktop-home.png' });
  // ---- deterministic snapshot mode for the rest ----
  await page.goto(BASE + 'index.html?source=snapshot&today=2026-11-02', { waitUntil: 'networkidle0' }); await sleep(200);
  const all = (await page.evaluate(() => __our415demo.current.length));
  // plain-language search
  await page.type('#q', 'storytime for toddlers in Chinatown'); await page.click('#searchForm button[type=submit]'); await sleep(300);
  const chips = await page.$$eval('.chip', e => e.map(x => x.dataset.k)); ok(['ageBucket', 'topic', 'hood'].every(k => chips.includes(k)), 'AI/plain-language search shows understood chips', chips.join());
  const res = await page.evaluate(() => __our415demo.current.map(p => [p.hood, p.topic, p.ages.includes('baby')]));
  ok(res.length > 0 && res.length < all && res.every(x => x[0] === 'Chinatown' && x[1] === 'reading' && x[2]), `results match intent (${all}→${res.length})`);
  ok(await page.$eval('#fHood', e => e.value) === 'Chinatown' && await page.$eval('#fAge', e => e.value) === 'baby', 'filters sync with parsed intent');
  await page.screenshot({ path: SHOTS + '/demo-screenshot-ai-search.png' });
  await page.click('.chip[data-k=hood] button'); await sleep(200);
  ok(await page.evaluate(() => __our415demo.current.length) > res.length, 'removing a chip widens results');
  // relaxation
  await page.click('#clearBtn'); await page.type('#q', 'free swimming for my 8 year old in the Mission on Saturday'); await page.keyboard.press('Enter'); await sleep(300);
  ok(await page.$('#relaxedNote') !== null && await page.evaluate(() => __our415demo.current.length) > 0, 'no exact match → widened search with explanation');
  // manual filters
  await page.click('#clearBtn'); await sleep(100);
  await page.select('#fCost', 'free'); await page.select('#fCat', 'sports'); await page.select('#fAge', 'teen'); await sleep(200);
  const f = await page.evaluate(() => __our415demo.current.map(p => p.free && p.topic === 'sports' && p.ages.includes('teen')));
  ok(f.length > 0 && f.every(Boolean), `cost + category + age filters (${f.length})`);
  await page.select('#fDay', 'weekend'); await sleep(150);
  const wk = await page.evaluate(() => __our415demo.current.every(p => !p.days || p.days.includes('sa') || p.days.includes('su'))); ok(wk, 'weekend day filter');
  await page.select('#fHood', 'Bayview Hunters Point'); await sleep(150);
  ok(await page.evaluate(() => __our415demo.current.every(p => p.hood === 'Bayview Hunters Point')), 'neighborhood filter');
  // map interaction
  await page.click('#clearBtn'); await sleep(200);
  await page.click('#list .card .mapBtn'); await sleep(600); ok(await count('.leaflet-popup') === 1, 'Show on map opens marker popup');
  // save / favorites
  const firstId = await page.$eval('#list .card', e => e.dataset.id);
  await page.click('#list .card .saveBtn'); await sleep(100);
  ok(await page.$eval('#list .card .saveBtn', e => e.getAttribute('aria-pressed')) === 'true' && (await txt('#savedCount')) === '1', 'save toggles aria-pressed + badge');
  await page.click('#list .card:nth-child(2) .saveBtn'); await sleep(100);
  await page.click('#list .card .icsBtn'); await sleep(800); ok(fs.existsSync('/tmp/our415-dl') && fs.readdirSync('/tmp/our415-dl').some(f => f.endsWith('.ics')), 'Add to calendar downloads .ics');
  await page.goto(BASE + 'index.html?source=snapshot&today=2026-11-02#/saved', { waitUntil: 'networkidle0' }); await sleep(300);
  ok(await count('#savedList .card') === 2 && await page.$eval('#savedList .card', e => e.dataset.id) === firstId, 'saved programs persist across reload (localStorage account stand-in)');
  await page.select('#pAge', 'child'); await page.select('#pHood', 'Mission'); await page.click('#prefsForm button'); await sleep(200);
  const sug = await page.evaluate(() => [...document.querySelectorAll('#suggestList .card')].map(c => __our415demo.items.find(p => p.id === c.dataset.id)).map(p => p.hood === 'Mission' && p.ages.includes('child')));
  ok(sug.length > 0 && sug.every(Boolean), 'preferences drive suggestions');
  await page.screenshot({ path: SHOTS + '/demo-screenshot-saved.png' });
  await page.click('#savedList .card .saveBtn'); await sleep(150); ok(await count('#savedList .card') === 1, 'unsave removes from saved');
  await axe('saved view');
  // languages
  await page.goto(BASE + 'index.html?source=snapshot&today=2026-11-02#/find', { waitUntil: 'networkidle0' }); await sleep(200);
  for (const [l, htmlLang, probe] of [['es', 'es', 'Encuentre programas'], ['zh', 'zh-Hans', '查找项目'], ['tl', 'fil', 'Maghanap ng mga programa'], ['vi', 'vi', 'Tìm chương trình']]) {
    await page.select('#lang', l); await sleep(250);
    ok(await page.evaluate(() => document.documentElement.lang) === htmlLang && (await txt('h1')).includes(probe) && !(await page.$eval('#langNote', e => e.hidden)), `language switch → ${l} (lang=${htmlLang}, sample-translation note shown)`);
    if (l === 'es' || l === 'zh') await page.screenshot({ path: SHOTS + `/demo-screenshot-lang-${l}.png` });
  }
  await page.select('#lang', 'en'); await sleep(200); ok((await txt('h1')).includes('Find programs'), 'back to English');
  // accessibility
  await axe('finder');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(200); await page.keyboard.press('Tab'); ok(await page.evaluate(() => document.activeElement.classList.contains('skip')), 'first Tab reaches skip link');
  ok(await page.$$eval('select, input', els => els.every(e => e.labels && e.labels.length > 0)), 'every form control has a <label>');
  ok(await page.$$eval('main, nav, header, footer', e => e.length) >= 4 && await count('[aria-live]') >= 2, 'landmarks + live regions');
  await page.click('#textBtn'); ok(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize) === '20px', 'larger-text toggle (125%)'); await page.click('#textBtn');
  // mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile: no horizontal overflow');
  await page.screenshot({ path: SHOTS + '/demo-screenshot-mobile.png' });
  await page.setViewport({ width: 1366, height: 900 });
  // about
  await page.goto(BASE + 'index.html?source=snapshot#/about', { waitUntil: 'networkidle0' }); ok((await txt('#view-about')).includes('not a City and County of San Francisco, DCYF or Our415.org website'), 'about page states demo status');
  // admin
  await page.goto(BASE + 'admin.html', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.body.dataset.checked, { timeout: 40000 }).catch(() => {});
  ok(await page.evaluate(() => document.body.dataset.checked) === 'live', 'admin: live check against data.sf.gov API');
  ok((await txt('#disclaimer')).includes('Not a City, DCYF or Our415.org site'), 'admin: disclaimer');
  const st = await page.$$eval('#checks [data-status]', e => e.map(x => x.dataset.status)); ok(st.length === 8 && !st.includes('FAIL'), 'admin: 8 pipeline checks, none failing', st.join());
  ok(await count('#bySource tbody tr') >= 2 && await count('#byTopic tbody tr') >= 5 && await count('#log tbody tr') >= 1, 'admin: source/topic tables + fetch log');
  await page.screenshot({ path: SHOTS + '/demo-screenshot-admin.png', fullPage: true });
  await axe('admin');
  ok(errors.length === 0, 'zero JS errors', errors.join(' | '));
  await browser.close();
  console.log(`\n${pass}/${pass + fail} PASS`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
