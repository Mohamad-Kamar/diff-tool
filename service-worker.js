const OFFLINE_CACHE_VERSION = "20260618-1";
const APP_CACHE = `diff-tool-${OFFLINE_CACHE_VERSION}`;

const APP_SHELL_PATHS = [
    "./",
    "./index.html",
    "./styles.css",
    "./diff.js",
    "./manifest.webmanifest",
    "./service-worker.js",
    "./assets/icons/icon.svg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_PATHS.map((path) => new URL(path, self.registration.scope).href)))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys
                .filter((key) => key.startsWith("diff-tool-") && key !== APP_CACHE)
                .map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cached) => cached || fetch(request)
                .then((response) => {
                    if (!response || !response.ok) {
                        return response;
                    }
                    const copy = response.clone();
                    caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => {
                    if (request.mode === "navigate") {
                        return caches.match(new URL("./index.html", self.registration.scope).href);
                    }
                    return new Response("Diff Tool is not available offline yet. Open it once while online to finish setup.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    });
                }))
    );
});
