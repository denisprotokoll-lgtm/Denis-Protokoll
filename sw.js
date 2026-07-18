// Service Worker لتطبيق "Denis Protokoll" — يفعّل العمل الحقيقي بدون إنترنت
// يجب أن يكون هذا الملف بجانب index.html في نفس المجلد، ويعمل فقط عبر HTTPS أو localhost
var CACHE_NAME = 'denis-cache-v1';
var PRECACHE_URLS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        PRECACHE_URLS.map(function(url) {
          return cache.add(url).catch(function() { /* تجاهل الموارد التي تفشل (مثل عدم توفر الشبكة عند أول تثبيت) */ });
        })
      );
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// استراتيجية: الشبكة أولًا لصفحة index (لأخذ آخر تحديث لو متصل)، مع رجوع للكاش عند فشل الشبكة (أوفلاين)
// وللموارد الثابتة (خطوط/مكتبات): الكاش أولًا لأنها لا تتغيّر غالبًا
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var url = event.request.url;
  var isAppShell = url.indexOf(self.location.origin) === 0;

  if (isAppShell) {
    event.respondWith(
      fetch(event.request).then(function(resp) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        return resp;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
          return resp;
        }).catch(function() { return cached; });
      })
    );
  }
});
