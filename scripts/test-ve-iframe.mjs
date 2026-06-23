import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const wrapper = await context.newPage();

wrapper.on('console', msg => {
  const t = msg.text().toLowerCase();
  if (t.includes('sanity') || t.includes('visual') || t.includes('overlay'))
    console.log('CONSOLE:', msg.text().substring(0, 200));
});

console.log('=== IFRAME VISUAL EDITING TEST ===');
console.log('Embedding production site in iframe (simulating Presentation tool)...');

await wrapper.setContent(`
  <html><body style="margin:0">
    <iframe id="preview" src="https://web-beta-lilac-27.vercel.app/athletics"
      style="width:100%;height:100vh;border:none"></iframe>
  </body></html>
`);
await wrapper.waitForTimeout(8000);

const frames = wrapper.frames();
console.log('Total frames:', frames.length);

const frame = frames.find(f => f.url().includes('web-beta-lilac-27'));
if (frame) {
  console.log('Found iframe:', frame.url());

  const result = await frame.evaluate(() => {
    const overlays = document.querySelectorAll('[data-sanity], [data-sanity-edit], [data-visual-editing]');
    const veScripts = Array.from(document.querySelectorAll('script[src]'))
      .filter(s => s.src.includes('SanityVisualEditing'))
      .map(s => s.src.split('/').pop());
    const allScripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.src.split('/').pop())
      .filter(s => s.includes('Sanity') || s.includes('client') || s.includes('visual'));
    const stega = (document.body.innerText.match(/[\u200B-\u200F\u2028-\u202F\uFEFF\u2060-\u2064\uE000-\uF8FF]/g) || []).length;
    const inIframe = window.self !== window.top;

    // Check for any React-rendered visual editing elements
    const allElements = document.querySelectorAll('*');
    const sanityElements = [];
    for (const el of allElements) {
      for (const attr of el.attributes) {
        if (attr.name.includes('sanity') || attr.name.includes('visual-editing')) {
          sanityElements.push({ tag: el.tagName, attr: attr.name, val: attr.value.substring(0, 50) });
        }
      }
    }

    return {
      overlays: overlays.length,
      veScripts,
      allRelevantScripts: allScripts,
      stega,
      inIframe,
      sanityElements: sanityElements.slice(0, 10),
      bodyChildCount: document.body.children.length
    };
  });

  console.log('');
  console.log('In iframe:', result.inIframe);
  console.log('Stega chars:', result.stega);
  console.log('VE scripts loaded:', result.veScripts);
  console.log('All relevant scripts:', result.allRelevantScripts);
  console.log('Overlay elements:', result.overlays);
  console.log('Sanity-related attributes:', JSON.stringify(result.sanityElements, null, 2));
  console.log('Body children:', result.bodyChildCount);

  // Try hovering and clicking
  const headings = await frame.locator('h1, h2, h3').all();
  if (headings.length > 0) {
    const text = await headings[0].textContent();
    console.log('');
    console.log('Hovering on:', (text || '').trim().substring(0, 60));
    await headings[0].hover();
    await wrapper.waitForTimeout(2000);

    const afterHover = await frame.evaluate(() => {
      return {
        overlays: document.querySelectorAll('[data-sanity], [data-sanity-overlay], [data-visual-editing]').length,
        tooltips: document.querySelectorAll('[role=tooltip], [role=dialog]').length,
        newElements: document.querySelectorAll('[style*="position: absolute"], [style*="position: fixed"]').length
      };
    });
    console.log('After hover:', JSON.stringify(afterHover));

    console.log('Clicking...');
    await headings[0].click();
    await wrapper.waitForTimeout(2000);

    const afterClick = await frame.evaluate(() => {
      return {
        overlays: document.querySelectorAll('[data-sanity], [data-sanity-overlay], [data-visual-editing]').length,
        tooltips: document.querySelectorAll('[role=tooltip], [role=dialog]').length,
        newElements: document.querySelectorAll('[style*="position: absolute"], [style*="position: fixed"]').length
      };
    });
    console.log('After click:', JSON.stringify(afterClick));
  }
} else {
  console.log('Could not find iframe');
  console.log('Available frames:', frames.map(f => f.url()));
}

await browser.close();
console.log('');
console.log('=== DONE ===');
