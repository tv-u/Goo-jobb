import {json} from "../lib/utils.js";
import {kvGet,kvPut} from "../lib/cache.js";
export async function onRequestGet({env}){
 const c=await kvGet(env,"stats:v3");if(c)return json(c,200,{"x-cache":"HIT"});
 const [j,countries,companies,sources]=await Promise.all([
  env.DB.prepare("SELECT COUNT(*) c FROM jobs WHERE is_active=1").first(),
  env.DB.prepare("SELECT COUNT(DISTINCT country_code) c FROM jobs WHERE is_active=1 AND country_code<>''").first(),
  env.DB.prepare("SELECT COUNT(DISTINCT company_slug) c FROM jobs WHERE is_active=1").first(),
  env.DB.prepare("SELECT COUNT(*) c FROM sources").first()
 ]);
 const out={jobs:j?.c||0,countries:countries?.c||0,companies:companies?.c||0,sources:sources?.c||0,generated_at:new Date().toISOString()};
 await kvPut(env,"stats:v3",out,120);return json(out,200,{"cache-control":"public,max-age=60,stale-while-revalidate=300"});
}
