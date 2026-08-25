const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { DOMParser } = require('xmldom');
const {
  DATAMINE_SOCIAL_IMAGE,
  applySharedSocialMeta
} = require('../scripts/datamine-social-meta');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const privacy = read('datamine/privacy/js/datamine-privacy.js');
const contribute = read('datamine/contribute/js/datamine-contribute.js');
const sharedHeader = read('datamine/shared/header.js');
const sharedFooter = read('datamine/shared/footer.js');
const scrollTop = read('datamine/shared/scroll-top.js');
const about = read('datamine/about/js/datamine-about.js');
const multypeCore = read('datamine/multype/js/datamine-multype-core.js');
const publicCopy = [
  privacy,
  contribute,
  sharedHeader,
  sharedFooter,
  about,
  read('datamine/projects/js/datamine-projects.js')
].join('\n');

assert(!/Barlow-specific|поля для шрифта Barlow/.test(privacy), 'Privacy must not retain the stale Barlow logging claim');
assert(/logs request time, HTTP method, and requested URL/.test(privacy), 'English Privacy must match the application request logger');
assert(/журналирует время запроса, HTTP-метод и запрошенный URL/.test(privacy), 'Russian Privacy must state the same logging facts');
assert(/Persistent preferences/.test(privacy) && /Temporary and recovery state/.test(privacy) && /Builder drafts/.test(privacy), 'Privacy must distinguish persistence categories');
assert(!/over one million JSON files|более миллиона JSON-файлов/i.test(publicCopy), 'Public copy must not claim more than one million JSON files');
assert(!/raw_exports\.zip/.test(contribute), 'Current Contribute workflow must not use the legacy archive name');
assert(/raw_exports_small\.zip/.test(contribute) && /raw_exports_full\.zip/.test(contribute), 'Contribute must name both current raw archives');
assert(/RUN_PROCESS\.bat/.test(contribute) && /dist_datamine_bundle/.test(contribute), 'Contribute must cover portable processing and its replacement bundle');
assert(/Builder interface is available in English/.test(contribute) && /Интерфейс Builder доступен на английском языке/.test(contribute), 'Builder language policy must be explicit in both locales');
assert(/Истоки войны/.test(publicCopy) && !/Исток войны/.test(publicCopy), 'Public Russian copy must use the canonical OOW title');
assert(/NAV_STRINGS\[language\]/.test(sharedHeader), 'Shared header navigation ARIA must use the active locale');
assert(/t\.navAria/.test(sharedFooter) && /t\.githubAria/.test(sharedFooter), 'Shared footer ARIA must use the active locale');
assert(/language === "ru" \? "Наверх"/.test(scrollTop), 'Scroll-to-top accessible text must support Russian');
assert(/t\.permalinkLabel/.test(about) && /t\.dataTypesAria/.test(about), 'About accessible labels must use page translations');
assert(!/aria-label="(?:Buff display mode|Rename filter|Multype matrix table)"/.test(multypeCore), 'Multype public groups must not hard-code English ARIA labels');

for (const removed of ['datamine/shared/fetch.js', 'test-api.html', 'test-simple.html', 'tmp_play_smilekritik.html', 'tmp_play_smilekritik.png']) {
  assert(!fs.existsSync(path.join(root, removed)), `${removed} must remain absent after confirmed cleanup`);
}
assert(fs.existsSync(path.join(root, 'archive/migrations/migrate-fce-to-per-boss.js')), 'Historical FCE migration must remain archived');
assert(!read('package.json').includes('chart.js'), 'Unused chart.js dependency must remain absent');

const routes = ['', 'oow/', 'fce/', 'seq/', 'multype/', 'items/', 'about/', 'projects/', 'contribute/', 'privacy/', 'changelog/'];
for (const route of routes) {
  const pagePath = path.join(root, 'datamine', route, 'index.html');
  assert(fs.existsSync(pagePath), `Public route /datamine/${route} must exist`);
  const html = fs.readFileSync(pagePath, 'utf8');
  assert(html.includes(`property="og:image" content="${DATAMINE_SOCIAL_IMAGE.url}"`), `/datamine/${route} must use the shared OG image`);
  assert(html.includes(`property="og:image:secure_url" content="${DATAMINE_SOCIAL_IMAGE.url}"`), `/datamine/${route} must use the shared secure OG image`);
  assert(html.includes(`name="twitter:image" content="${DATAMINE_SOCIAL_IMAGE.url}"`), `/datamine/${route} must use the shared Twitter image`);
  assert(html.includes(`property="og:image:width" content="${DATAMINE_SOCIAL_IMAGE.width}"`), `/datamine/${route} must expose the shared image width`);
  assert(html.includes(`property="og:image:height" content="${DATAMINE_SOCIAL_IMAGE.height}"`), `/datamine/${route} must expose the shared image height`);
  assert(!/\/datamine\/social\/(?:hub|oow|fce|seq|items|multype)\.png/.test(html), `/datamine/${route} must not reference a page-specific social image`);
  assert(/<title>[^<]+<\/title>/.test(html), `/datamine/${route} must preserve its title`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `/datamine/${route} must preserve its description`);
  assert(/<link rel="canonical" href="[^"]+"/.test(html), `/datamine/${route} must preserve its canonical URL`);
}

const metadataFixture = [
  '<title>Original title</title>',
  '<meta name="description" content="Original description">',
  '<link rel="canonical" href="https://example.test/original/">',
  '<meta property="og:image" content="https://example.test/old.png">',
  '<meta property="og:image:secure_url" content="https://example.test/old.png">',
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="Original image alt">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:image" content="https://example.test/old.png">'
].join('\n');
const synchronizedFixture = applySharedSocialMeta(metadataFixture);
for (const preserved of [
  '<title>Original title</title>',
  '<meta name="description" content="Original description">',
  '<link rel="canonical" href="https://example.test/original/">',
  '<meta property="og:image:alt" content="Original image alt">'
]) {
  assert(synchronizedFixture.includes(preserved), `Social metadata sync must preserve ${preserved}`);
}

const sitemap = read('sitemap.xml');
const sitemapDocument = new DOMParser().parseFromString(sitemap, 'application/xml');
assert.strictEqual(sitemapDocument.getElementsByTagName('parsererror').length, 0, 'sitemap.xml must be valid XML');
assert.strictEqual(sitemapDocument.getElementsByTagName('loc').length, 11, 'sitemap.xml must contain exactly 11 public Datamine routes');
assert(!/datamine-builder|\/leaks|scripts|pipeline/.test(sitemap), 'sitemap.xml must exclude non-public product routes');

function request(port, pathname) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: pathname, headers: { Accept: 'text/html,application/xhtml+xml' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    }).on('error', reject);
  });
}

async function run() {
  const port = 48128;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server did not start in time')), 10000);
      child.stdout.on('data', (chunk) => {
        if (String(chunk).includes('running on')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('exit', (code) => reject(new Error(`Server exited early with ${code}`)));
    });
    const robots = await request(port, '/robots.txt');
    const liveSitemap = await request(port, '/sitemap.xml');
    const missing = await request(port, '/definitely-not-a-real-stage8-route');
    assert.strictEqual(robots.status, 200, 'robots.txt must return HTTP 200');
    assert.strictEqual(liveSitemap.status, 200, 'sitemap.xml must return HTTP 200');
    assert.strictEqual(missing.status, 404, 'Unknown HTML routes must return HTTP 404');
    assert(/Page not found/.test(missing.body), 'Unknown HTML routes must render the custom 404 page');
  } finally {
    child.kill();
  }
  console.log('✓ Stage 8 copy truth, cleanup state, SEO files, and HTTP 404 contract are present.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
