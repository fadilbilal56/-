// كاش للعمل بدون إنترنت (اللعب ضد الكمبيوتر يشتغل أوفلاين)
const CACHE = 'koshteena-v3';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'cards.js', 'net.js', 'sound.js', 'voice.js', 'icon.svg', 'manifest.webmanifest',
  'shared/engine.js', 'shared/ai.js', 'shared/match.js', 'vendor/mqtt.min.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// الشبكة أولاً عشان التحديثات توصل، والكاش احتياط
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname === '/ws') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
