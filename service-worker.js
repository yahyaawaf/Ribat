const CACHE='ribat-v3';
const CORE=['./','./index.html','./admin.html','./assets/css/style.css','./assets/css/admin.css','./assets/js/config.js','./assets/js/site-data.js','./assets/js/cms.js','./assets/js/main.js','./assets/js/admin.js','./assets/images/logo-small.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('./404.html'))))});
