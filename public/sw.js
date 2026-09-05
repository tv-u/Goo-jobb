const CACHE="goo-jobb-v3";
const SHELL=["/","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET" || u.pathname.startsWith("/api/")) return;
  e.respondWith(caches.match(e.request).then(cached=>{
    const net=fetch(e.request).then(r=>{
      if(r.ok) caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
      return r;
    }).catch(()=>cached);
    return cached || net;
  }));
});
self.addEventListener("sync",e=>{
  if(e.tag==="goo-jobb-refresh") e.waitUntil(fetch("/api/jobs?limit=20").catch(()=>{}));
});
