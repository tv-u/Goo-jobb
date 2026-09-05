import {securityHeaders} from "./lib/security.js";
import {html} from "./lib/utils.js";
import {syncAll} from "./lib/sync-engine.js";

const api={
 "/api/jobs":()=>import("./api/jobs.js"),
 "/api/search":()=>import("./api/search.js"),
 "/api/stats":()=>import("./api/stats.js"),
 "/api/sync":()=>import("./api/sync.js"),
 "/api/analytics":()=>import("./api/analytics.js"),
 "/api/save":()=>import("./api/save.js"),
 "/api/alerts":()=>import("./api/alerts.js"),
 "/api/apply":()=>import("./api/apply.js"),
 "/api/companies":()=>import("./api/companies.js"),
 "/api/categories":()=>import("./api/categories.js"),
 "/api/countries":()=>import("./api/countries.js"),
 "/api/cities":()=>import("./api/cities.js"),
 "/api/sources":()=>import("./api/sources.js"),
 "/api/sitemap":()=>import("./api/sitemap.js"),
 "/api/robots":()=>import("./api/robots.js"),
 "/api/ai":()=>import("./api/ai.js")
};

function headers(r){const h=new Headers(r.headers);for(const[k,v]of Object.entries(securityHeaders()))h.set(k,v);return h}
export default {
 async fetch(request,env,ctx){
   const u=new URL(request.url);
   if(u.pathname==="/robots.txt"){const m=await import("./api/robots.js");const r=await m.onRequestGet({request,env,ctx});return new Response(r.body,{status:r.status,headers:headers(r)})}
   if(u.pathname.startsWith("/jobs/")){
     const m=await import("./api/job.js");const r=await m.onRequestGet({request,env,ctx,params:{slug:u.pathname.slice(6)}});return new Response(r.body,{status:r.status,headers:headers(r)})
   }
   if(api[u.pathname]){
     try{const m=await api[u.pathname]();const fn=request.method==="POST"&&m.onRequestPost?m.onRequestPost:m.onRequestGet;const r=await fn({request,env,ctx,params:{}});return new Response(r.body,{status:r.status,headers:headers(r)})}catch(e){return new Response(JSON.stringify({error:"server_error"}),{status:500,headers:{"content-type":"application/json"}})}
   }
   const asset=await env.ASSETS?.fetch(request);
   if(asset)return new Response(asset.body,{status:asset.status,headers:headers(asset)});
   return new Response("Not found",{status:404});
 },
 async scheduled(event,env,ctx){ctx.waitUntil(syncAll(env))}
};
