const CACHE = "friendschat-v2";
const FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});

self.addEventListener("push", (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (er) {}
  const d = p.data || {};
  const n = p.notification || {};
  const title = d.title || n.title || "Friends Chat";
  const body = d.body || d.text ||  n.body || "";
  const isCall = d.type === "call"|| d.kind === "call";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.some((c) => c.visibilityState === "visible")) return;
      return self.registration.showNotification(title, {
        body: body,
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: d.room ? "room_" + d.room : "fc",
        renotify: true,
        vibrate: isCall ? [400, 200, 400, 200, 400, 200, 400] : [120],
        requireInteraction: isCall,
        data: { room: d.room || "" }
      });
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow("./");
    })
  );
});
