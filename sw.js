const PART_PREFIX = 'game.data.part';
const PART_COUNT = 23; // your actual count
const TARGET_FILE = 'game.data';

const coiHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith(TARGET_FILE)) {
    event.respondWith(assembleGameData(url));
    return;
  }

  // Inject COOP/COEP headers on every other same-origin response
  event.respondWith(
    fetch(event.request).then((response) => {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cross-Origin-Embedder-Policy', coiHeaders['Cross-Origin-Embedder-Policy']);
      newHeaders.set('Cross-Origin-Opener-Policy', coiHeaders['Cross-Origin-Opener-Policy']);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(() => fetch(event.request))
  );
});

async function assembleGameData(url) {
  const base = url.href.substring(0, url.href.lastIndexOf(TARGET_FILE));
  const buffers = [];
  for (let i = 0; i < PART_COUNT; i++) {
    const num = String(i).padStart(3, '0');
    const res = await fetch(`${base}${PART_PREFIX}${num}`);
    if (!res.ok) return new Response('Failed to load part ' + num, { status: 500 });
    buffers.push(await res.arrayBuffer());
  }
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return new Response(merged.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cross-Origin-Embedder-Policy': coiHeaders['Cross-Origin-Embedder-Policy'],
    },
  });
}
