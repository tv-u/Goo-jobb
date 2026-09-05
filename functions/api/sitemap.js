import {text} from "../lib/utils.js";
export async function onRequestGet({request,env}){
 const u=new URL(request.url);const base=u.origin;
 if(u.searchParams.get("type")==="robots")return text(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${base}/api/sitemap?type=index\n`);
 if(u.searchParams.get("type")==="index"){const n=await env.DB.prepare("SELECT COUNT(*) c FROM jobs WHERE is_active=1").first();const chunks=Math.max(1,Math.ceil((n?.c||0)/50000));return text(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({length:chunks},(_,i)=>`<sitemap><loc>${base}/api/sitemap?type=jobs&chunk=${i}</loc></sitemap>`).join("")}</sitemapindex>`,200,{"content-type":"application/xml; charset=utf-8"})}
 const chunk=Math.max(0,+u.searchParams.get("chunk")||0),rows=(await env.DB.prepare("SELECT slug,posted_at FROM jobs WHERE is_active=1 ORDER BY id LIMIT 50000 OFFSET ?").bind(chunk*50000).all()).results||[];
 return text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map(j=>`<url><loc>${base}/jobs/${encodeURIComponent(j.slug)}</loc><lastmod>${new Date(j.posted_at||Date.now()).toISOString()}</lastmod></url>`).join("")}</urlset>`,200,{"content-type":"application/xml; charset=utf-8"});
}
