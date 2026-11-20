// Minimal service worker so the planner can be installed as a phone app.
// Pages are always fetched fresh (your data changes daily); static files are cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || !url.pathname.startsWith("/_next/static")) return;
  e.respondWith(caches.open("static-v1").then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; })));
});
