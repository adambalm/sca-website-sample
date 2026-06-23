import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

const loadedScripts = [];
page.on('response', resp => {
  const url = resp.url();
  if (url.includes('visual-editing') || url.includes('channels'))
    loadedScripts.push({ url: url.split('/').pop(), status: resp.status() });
});

await page.goto('https://web-beta-lilac-27.vercel.app/athletics', { waitUntil: 'networkidle' });

console.log('=== VISUAL EDITING COMPONENT CHECK ===');
console.log('');
console.log('VE-related network requests:');
loadedScripts.forEach(s => console.log(' ', s.status, s.url));
console.log('Total VE requests:', loadedScripts.length);

const astroIsland = await page.evaluate(() => {
  const island = document.querySelector('astro-island[component-url*="visual-editing"]');
  if (!island) return { found: false };
  return {
    found: true,
    componentUrl: island.getAttribute('component-url'),
    componentExport: island.getAttribute('component-export'),
    rendererUrl: island.getAttribute('renderer-url'),
    props: island.getAttribute('props'),
    clientDirective: island.getAttribute('client'),
    innerHTML: island.innerHTML.substring(0, 200)
  };
});

console.log('');
console.log('Astro island found:', astroIsland.found);
if (astroIsland.found) {
  console.log('Component URL:', astroIsland.componentUrl);
  console.log('Component export:', astroIsland.componentExport);
  console.log('Renderer URL:', astroIsland.rendererUrl);
  console.log('Props:', astroIsland.props);
  console.log('Client directive:', astroIsland.clientDirective);
  console.log('Inner HTML:', astroIsland.innerHTML);
}

// Check if the component's JS was actually loaded and executed
const veState = await page.evaluate(() => {
  // Check for any visual editing related globals or state
  const hasOverlayController = typeof window.__sanityVisualEditing !== 'undefined';
  const hasChannels = typeof window.__sanityChannels !== 'undefined';

  // Check for the comlink/channels script
  const allScripts = Array.from(document.querySelectorAll('script'));
  const inlineScripts = allScripts.filter(s => !s.src && s.textContent.includes('visual'));

  return {
    hasOverlayController,
    hasChannels,
    inlineVEScripts: inlineScripts.length,
    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('sanity') || k.includes('visual') || k.includes('overlay'))
  };
});

console.log('');
console.log('Window globals with sanity/visual:', veState.windowKeys);
console.log('Has overlay controller:', veState.hasOverlayController);
console.log('Has channels:', veState.hasChannels);

await browser.close();
console.log('');
console.log('=== DONE ===');
