import {SOURCES} from "./sources.js";
import {parseFeed} from "./parser.js";
import {normalize} from "./normalize.js";
import {dedupeJobs} from "./dedupe.js";
import {now} from "./utils.js";
import {expireJobs} from "./expiry.js";

async function fetchSource(s){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
  try{const r=await fetch(s.endpoint,{signal:ctrl.signal,headers:{"user-agent":"GOO-JOBB/3.0 public-feed-sync"}});if(!r.ok)throw Error(`HTTP ${r.status}`);const body=await r.text();if(body.length>5_000_000)throw Error("response too large");return {body,ct:r.headers.get("content-type")||""}}
  finally{clearTimeout(timer)}
}
export async function syncAll(env){
  const db=env.DB;let total={sources:0,seen:0,added:0,updated:0,errors:0};
  for(const s of SOURCES.filter(x=>x.type==="json"||x.type==="rss")){
    const started=Date.now();let runId;
    try{
      await db.prepare("INSERT OR IGNORE INTO sources(id,name,type,endpoint) VALUES(?,?,?,?)").bind(s.id,s.name,s.type,s.endpoint).run();
      const r=await fetchSource(s);const parsed=dedupeJobs((await Promise.all(parseFeed(r.body,r.ct).map(x=>normalize(x,s)))).filter(Boolean));
      let added=0,updated=0;
      for(const j of parsed){
        const old=await db.prepare("SELECT id,content_hash FROM jobs WHERE source_id=? AND external_id=?").bind(j.source_id,j.external_id).first();
        if(old){if(old.content_hash!==j.content_hash){await db.prepare(`UPDATE jobs SET slug=?,title=?,description=?,company=?,company_slug=?,location=?,country=?,country_code=?,city=?,remote_type=?,employment_type=?,category=?,seniority=?,salary_min=?,salary_max=?,salary_currency=?,salary_period=?,skills_json=?,apply_url=?,source_url=?,posted_at=?,content_hash=?,last_seen_at=?,is_active=1 WHERE id=?`).bind(j.slug,j.title,j.description,j.company,j.company_slug,j.location,j.country,j.country_code,j.city,j.remote_type,j.employment_type,j.category,j.seniority,j.salary_min,j.salary_max,j.salary_currency,j.salary_period,j.skills_json,j.apply_url,j.source_url,j.posted_at,j.content_hash,now(),old.id).run();updated++}else await db.prepare("UPDATE jobs SET last_seen_at=?,is_active=1 WHERE id=?").bind(now(),old.id).run()}
        else{await db.prepare(`INSERT INTO jobs(external_id,source_id,slug,title,description,company,company_slug,location,country,country_code,city,remote_type,employment_type,category,seniority,salary_min,salary_max,salary_currency,salary_period,skills_json,apply_url,source_url,posted_at,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(j.external_id,j.source_id,j.slug,j.title,j.description,j.company,j.company_slug,j.location,j.country,j.country_code,j.city,j.remote_type,j.employment_type,j.category,j.seniority,j.salary_min,j.salary_max,j.salary_currency,j.salary_period,j.skills_json,j.apply_url,j.source_url,j.posted_at,j.content_hash).run();added++}
      }
      await db.prepare("UPDATE sources SET last_sync_at=?,last_success_at=?,last_error=NULL,jobs_seen=?,jobs_added=?,jobs_updated=?,latency_ms=?,status='ok' WHERE id=?").bind(now(),now(),parsed.length,added,updated,Date.now()-started,""+s.id).run();
      total.sources++;total.seen+=parsed.length;total.added+=added;total.updated+=updated;
    }catch(e){
      total.errors++;await db.prepare("UPDATE sources SET last_sync_at=?,last_error=?,latency_ms=?,status='error' WHERE id=?").bind(now(),String(e).slice(0,500),Date.now()-started,s.id).run().catch(()=>{});
    }
  }
  await expireJobs(db,60).catch(()=>{});
  return total;
}
