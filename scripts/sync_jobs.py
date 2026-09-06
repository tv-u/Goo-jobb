import json,re,time,hashlib,urllib.request,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone
UA="GOO-JOBB/1.0 public-job-index"
OUT=Path("jobs-worldwide.json")
SOURCES=[
("arbeitnow","https://www.arbeitnow.com/api/job-board-api","json"),
("remoteok","https://remoteok.com/api","json"),
("remotive","https://remotive.com/api/remote-jobs","json"),
("jobicy","https://jobicy.com/api/v2/remote-jobs","json"),
("himalayas","https://himalayas.app/jobs/api","json"),
("weworkremotely","https://weworkremotely.com/remote-jobs.rss","rss")
]
def fetch(url):
 r=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json,text/xml,text/plain"})
 with urllib.request.urlopen(r,timeout=25) as x:return x.read(6000000).decode("utf-8","ignore")
def clean(x):return re.sub(r"\s+"," ",str(x or "")).strip()
def make(src,j):
 title=clean(j.get("title") or j.get("position") or j.get("name"))
 company=clean(j.get("company_name") or j.get("company") or j.get("companyName"))
 url=j.get("url") or j.get("job_url") or j.get("link") or j.get("apply_url") or ""
 desc=clean(j.get("description") or j.get("content") or j.get("description_text"))
 loc=clean(j.get("location") or j.get("candidate_required_location") or "Remote")
 if not title or not url or not url.startswith(("http://","https://")):return None
 if len(title)<3:return None
 key=hashlib.sha256((url.lower().rstrip("/")+"|"+title.lower()+"|"+company.lower()).encode()).hexdigest()
 remote=bool(re.search(r"\bremote\b|work from home|worldwide|anywhere",loc+" "+desc,re.I))
 text=(title+" "+desc+" "+loc).lower()
 cats=[]
 for k,v in {"technology":["software","developer","engineer","devops","cloud","cyber"],"data":["data","analytics","machine learning","ai","scientist"],"marketing":["marketing","seo","content","growth"],"finance":["finance","accounting","bank","financial"],"design":["design","ux","ui","creative"],"sales":["sales","business development","account executive"],"healthcare":["health","medical","nurse","clinical"],"customer":["customer support","customer success","support"]}.items():
  if any(z in text for z in v):cats.append(k)
 category=cats[0] if cats else "general"
 return {"id":key,"source":src,"title":title,"company":company,"location":loc,"remote":remote,"category":category,"description":desc[:5000],"url":url,"published_at":j.get("published_at") or j.get("publication_date") or j.get("date") or datetime.now(timezone.utc).isoformat()}
def rss(src,raw):
 out=[]
 root=ET.fromstring(raw)
 for item in root.findall(".//item")[:500]:
  out.append(make(src,{"title":item.findtext("title"),"link":item.findtext("link"),"description":item.findtext("description"),"published_at":item.findtext("pubDate"),"location":"Remote"}))
 return out
jobs=[];health=[]
for src,url,kind in SOURCES:
 try:
  raw=fetch(url)
  if kind=="rss": arr=rss(src,raw)
  else:
   obj=json.loads(raw); arr=obj.get("jobs",obj if isinstance(obj,list) else [])
   arr=[make(src,x) for x in arr if isinstance(x,dict)]
  arr=[x for x in arr if x]
  jobs.extend(arr);health.append({"source":src,"status":"ok","jobs":len(arr)})
 except Exception as e:health.append({"source":src,"status":"error","jobs":0,"error":str(e)[:180]})
seen=set();unique=[]
for j in jobs:
 if j["id"] not in seen:seen.add(j["id"]);unique.append(j)
unique.sort(key=lambda x:x.get("published_at",""),reverse=True)
payload={"generated_at":datetime.now(timezone.utc).isoformat(),"total":len(unique),"sources":health,"jobs":unique[:10000]}
OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
Path("data/source-health.json").write_text(json.dumps({"updated_at":payload["generated_at"],"sources":health},ensure_ascii=False,indent=2),encoding="utf-8")
print("WORLDWIDE_JOBS=",len(unique));print("SOURCES_OK=",sum(x["status"]=="ok" for x in health));print("SOURCES_FAILED=",sum(x["status"]!="ok" for x in health))
