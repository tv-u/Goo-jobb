const CACHE_NAME = "goo-jobb-v4";

self.addEventListener(
 "install",
 event=>{
  self.skipWaiting();
 }
);

self.addEventListener(
 "activate",
 event=>{
  event.waitUntil(
   caches.keys().then(keys=>
    Promise.all(
     keys
      .filter(key=>key!==CACHE_NAME)
      .map(key=>caches.delete(key))
    )
   ).then(
    ()=>self.clients.claim()
   )
  );
 }
);

self.addEventListener(
 "fetch",
 event=>{

  if(event.request.method!=="GET"){
   return;
  }

  const url=new URL(
   event.request.url
  );

  if(
   url.pathname.endsWith(
    "/jobs.json"
   )
  ){

   event.respondWith(
    fetch(
     event.request,
     {cache:"no-store"}
    )
   );

   return;
  }

  event.respondWith(

   fetch(event.request)
    .then(response=>{

     const copy=response.clone();

     caches.open(CACHE_NAME)
      .then(cache=>
       cache.put(
        event.request,
        copy
       )
      )
      .catch(()=>{});

     return response;

    })
    .catch(()=>
     caches.match(
      event.request
     )
    )
  );
 }
);
