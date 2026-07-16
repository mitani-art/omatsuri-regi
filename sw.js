/* お祭りかんたんレジ Service Worker
   一度開けば完全オフラインで動作します。
   アプリを更新したら、下の CACHE_NAME の数字を1つ上げてください（例: v1 → v2）。
   数字を上げると、各スマホが次にネットに繋がったとき自動で新しい版に入れ替わります。 */

var CACHE_NAME = 'omatsuri-regi-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/* インストール時：必要なファイルをぜんぶ端末に保存 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* 有効化時：古いバージョンのキャッシュを掃除 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* 通信時：まず端末内の保存版を返す（＝圏外でも動く）。
   裏でネットから最新版を取りに行き、次回起動時に反映する。 */
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  // LINE共有など外部サイトへの遷移はそのまま通す
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      var fetchAndUpdate = fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return cached; // 圏外なら保存版で応答
      });
      return cached || fetchAndUpdate;
    })
  );
});
