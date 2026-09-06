import json,urllib.request,urllib.parse,hashlib,datetime,os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"jobs-worldwide.json"
HEALTH=ROOT/"data/source-health.json"
UA="GOO-JOBB/5.0 public-job-feed-sync"

SOURCES=[
{"id":"arbeitnow","name":"Arbeitnow","url":"https://www.arbeitnow.com/api/job-board-api","type":"json"},
{"id":"remoteok","name":"Remote OK","url":"https://remoteok.com/api","type":"json"},
{"id":"remotive","name":"Remotive","url":"https://remotive.com/api/remote-jobs","type":"json"},
{"id":"jobicy","name":"Jobicy","url":"https://jobicy.com/api/v2/remote-jobs?count=100","type":"json"},
{"id":"himalayas","name":"Himalayas","url":"https://himalayas.app/jobs/api","type":"json"},
{"id":"workingnomads","name":"Working Nomads","url":"https://www.workingnomads.com/api/exposed_jobs/","type":"json"},
{"id":"remotejobs","name":"Remote Jobs","url":"https://remote.co/remote-jobs/feed/","type":"rss"},
{"id":"jobspresso","name":"Jobspresso","url":"https://jobspresso.co/feed/","type":"rss"},
{"id":"wwr","name":"We Work Remotely","url":"https://weworkremotely.com/remote-jobs.rss","type":"rss"}
]

def clean(v):
    if v is None:return ""
    return str(v).strip()

def get(o,*keys):
    for k in keys:
        if isinstance(o,dict) and o.get(k) not in (None,""): return o.get(k)
    return ""

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json,application/rss+xml,text/xml,*/*"})
    with urllib.request.urlopen(req,timeout=25) as r:
        body=r.read(8000000)
        return r.status,body,r.headers.get("content-type","")

def normalize(x,source):
    if not isinstance(x,dict): return None
    title=clean(get(x,"title","name","position"))
    company=clean(get(x,"company","company_name","organization"))
    apply=clean(get(x,"url","apply_url","apply","link"))
    if not title or not apply or not apply.startswith(("http://","https://")): return None
    location=clean(get(x,"location","candidate_required_location","job_location"))
    description=clean(get(x,"description","description_text","content"))
    published=clean(get(x,"published_at","publication_date","date","created_at"))
    remote=bool(x.get("remote") or "remote" in location.lower() or "remote" in title.lower())
    sid=source["id"]
    jid=hashlib.sha256((sid+"|"+apply).encode()).hexdigest()[:32]
    return {"id":jid,"title":title,"company":company,"location":location,"description":description,"apply_url":apply,"url":apply,"source":source["name"],"source_id":sid,"published_at":published,"remote":remote,"status":"active"}

def parse_json(body,source):
    d=json.loads(body.decode("utf-8","replace"))
    if isinstance(d,list): arr=d
    elif isinstance(d,dict):
        arr=d.get("jobs") or d.get("data") or d.get("results") or d.get("postings") or []
        if not isinstance(arr,list): arr=[]
    else: arr=[]
    return [normalize(x,source) for x in arr]

def parse_rss(body,source):
    import xml.etree.ElementTree as ET
    root=ET.fromstring(body)
    out=[]
    for item in root.iter():
        if item.tag.lower().endswith(("item","entry")):
            d={}
            for c in list(item):
                tag=c.tag.split("}")[-1].lower()
                d[tag]=c.text or c.attrib.get("href","")
            out.append(normalize({"title":d.get("title"),"link":d.get("link") or d.get("guid"),"description":d.get("description") or d.get("summary"),"published_at":d.get("pubdate") or d.get("published")},source))
    return out

old=[]
if OUT.exists():
    try:
        d=json.loads(OUT.read_text(encoding="utf-8"))
        old=d.get("jobs",[]) if isinstance(d,dict) else d
        if not isinstance(old,list): old=[]
    except Exception: old=[]

jobs={}
for j in old:
    if isinstance(j,dict) and j.get("apply_url"): jobs[j["apply_url"]]=j

health=[]
for source in SOURCES:
    started=datetime.datetime.now(datetime.timezone.utc)
    try:
        status,body,ct=fetch(source["url"])
        if status!=200: raise RuntimeError("HTTP "+str(status))
        if source["type"]=="json": parsed=parse_json(body,source)
        else: parsed=parse_rss(body,source)
        parsed=[j for j in parsed if j]
        added=0;updated=0
        for j in parsed:
            if j["apply_url"] in jobs:
                oldj=jobs[j["apply_url"]]
                oldj.update(j);updated+=1
            else:
                jobs[j["apply_url"]]=j;added+=1
        health.append({"id":source["id"],"name":source["name"],"status":"LIVE","http_status":status,"jobs_seen":len(parsed),"jobs_added":added,"jobs_updated":updated,"checked_at":started.isoformat()})
    except Exception as e:
        health.append({"id":source["id"],"name":source["name"],"status":"ERROR","jobs_seen":0,"jobs_added":0,"jobs_updated":0,"error":str(e),"checked_at":started.isoformat()})

arr=list(jobs.values())
arr=[j for j in arr if j.get("title") and j.get("apply_url") and j.get("apply_url","").startswith(("http://","https://"))]
arr.sort(key=lambda x:x.get("published_at",""),reverse=True)
OUT.write_text(json.dumps({"updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"count":len(arr),"jobs":arr},ensure_ascii=False,indent=2),encoding="utf-8")
HEALTH.write_text(json.dumps({"updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"total_sources":len(SOURCES),"live_sources":sum(x["status"]=="LIVE" for x in health),"failed_sources":sum(x["status"]!="LIVE" for x in health),"sources":health},ensure_ascii=False,indent=2),encoding="utf-8")
print("REAL_JOBS="+str(len(arr)))
print("SOURCES_TOTAL="+str(len(SOURCES)))
print("SOURCES_LIVE="+str(sum(x["status"]=="LIVE" for x in health)))
print("SOURCES_FAILED="+str(sum(x["status"]!="LIVE" for x in health)))
if not arr: raise SystemExit("NO_REAL_JOBS_RETURNED")
