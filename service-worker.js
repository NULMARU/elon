/**
 * 영한번역 PWA 서비스워커
 * - 앱 셸: cache-first (오프라인 학습 지원)
 * - 외부 폰트/CDN: stale-while-revalidate
 * - 외부 사전 사이트: 캐시하지 않음 (네트워크 이동)
 */
const CACHE_VERSION = "yh-cache-v15";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./ai.js",
  "./default_data.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// API/사전 호스트는 절대 캐시하지 않음 (특히 유튜브 자막 폴링·번역·AI 응답)
const SKIP_HOSTS = [
  "en.dict.naver.com",
  "dictionary.cambridge.org",
  "api.youtubetotext.ai",
  "generativelanguage.googleapis.com",
  "translate.googleapis.com",
  "api.elevenlabs.io",
  "r.jina.ai"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // 외부 사전 사이트는 서비스워커가 관여하지 않음
  if (SKIP_HOSTS.includes(url.hostname)) return;

  if (url.origin === self.location.origin) {
    // 앱 셸: cache-first → 네트워크 폴백 → 오프라인 시 index.html
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          return resp;
        }).catch(() => caches.match("./index.html"));
      })
    );
  } else {
    // 외부 폰트/CDN: stale-while-revalidate
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
