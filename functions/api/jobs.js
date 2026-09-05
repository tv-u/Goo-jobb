import {json} from "../lib/utils.js";
import {queryOptions,next} from "../lib/query.js";
import {kvGet,kvPut,cacheKey} from "../lib/cache.js";
import {rateLimit} from "../lib/security.js";
export async function onRequestGet({request,env}){
  if(!rateLimit(request,"jobs",100,60000))return json({error:"rate_limited"},429);
  const o=queryOptions(new URL(request.url));const key=cacheKey("jobs",o);
  if(!o.cursor){const c=await kvGet(env,key);if(c)return json(c,200,{"x-cache":"HIT"})}
  let sql=`SELECT id,slug,title,company,company_slug,location,country,country_code,city,remote_type,category,seniority,salary_min,salary_max,salary_currency,salary_period,skills_json,apply_url,source_url,posted_at FROM jobs WHERE is_active=1`;
  const p=[];
  if(o.q){sql+=` AND id IN (SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ?)`;p.push(o.q.replace(/[^\w\s-]/g," ").trim().split(/\s+/).filter(Boolean).map(x=>`"${x}"`).join(" OR ")||"jobs")}
  if(o.location){sql+=" AND (location LIKE ? OR city LIKE ? OR country LIKE ?)";const x=`%${o.location}%`;p.push(x,x,x)}
  if(o.country){sql+=" AND country_code=?";p.push(o.country)}
  if(o.category){sql+=" AND category=?";p.push(o.category)}
  if(o.remote==="remote")sql+=" AND remote_type='remote'";
  if(o.cursor){sql+=" AND (posted_at < ? OR (posted_at=? AND id<?))";p.push(o.cursor.posted_at,o.cursor.posted_at,o.cursor.id)}
  sql+=" ORDER BY posted_at DESC,id DESC LIMIT ?";p.push(o.limit+1);
  let rows=(await env.DB.prepare(sql).bind(...p).all()).results||[];
  const has=rows.length>o.limit;rows=rows.slice(0,o.limit);
  const jobs=rows.map(r=>({...r,skills:JSON.parse(r.skills_json||"[]")}));const out={jobs,next_cursor:has?next(rows.at(-1)):"",total:null};
  if(!o.cursor){const count=await env.DB.prepare("SELECT COUNT(*) c FROM jobs WHERE is_active=1").first();out.total=count?.c||0;await kvPut(env,key,out,90)}
  return json(out,200,{"cache-control":"public,max-age=30,stale-while-revalidate=120","x-cache":"MISS"});
}
