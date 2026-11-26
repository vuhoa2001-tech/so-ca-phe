/* Service worker: cho phép mở app khi không có mạng. Đổi số phiên bản khi cập nhật index.html. */
const CACHE = 'so-ca-phe-v6';
const FILES = ['./', './index.html', './huong-dan.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './logo-128.png', './logo-512.png', './favicon-32.png', './icon-maskable-512.png', './fonts/fonts.css', './fonts/bevietnampro-400-latin.woff2', './fonts/bevietnampro-400-vietnamese.woff2', './fonts/bevietnampro-500-latin.woff2', './fonts/bevietnampro-500-vietnamese.woff2', './fonts/bevietnampro-600-latin.woff2', './fonts/bevietnampro-600-vietnamese.woff2', './fonts/bevietnampro-700-latin.woff2', './fonts/bevietnampro-700-vietnamese.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; // không đụng tới yêu cầu đồng bộ
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
