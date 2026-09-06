import json,urllib.request,urllib.parse,ssl,re,hashlib,datetime,xml.etree.ElementTree as ET
S=[("Arbeitnow","https://www.arbeitnow.com/api/job-board-api","json"),("Jobicy","https://jobicy.com/api/v2/remote-jobs","json"),("RemoteOK","https://remoteok.com/api","json"),("Remotive","https://remotive.com/api/remote-jobs","json"),("Himalayas","https://himalayas.app/jobs/api","json"),("We Work Remotely","https://weworkremotely.com/remote-jobs.rss","rss"),("Working Nomads","https://www.workingnomads.com/jobs/rss","rss"),("Remote.co","https://remote.co/remote-jobs/feed/","rss"),("Startup Jobs","https://startup.jobs/feed","rss"),("Jobspresso","https://jobspresso.co/feed/","rss")]
ctx=ssl.create_default_context(); jobs=[]; health=[]
def get(u):
 r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"GOO-JOBB-Live/1.0","Accept":"application/json,application/rss+xml,application/xml,text/xml"}),timeout=20,context=ctx); return r.read()
def clean(x): return re.sub(r"\\s+"," ",re.sub(r"<[^>]+>"," ",str(x or ""))).strip()
def add(src,title,company,loc,desc,url,pub="",remote=False):
 title=clean(title); url=str(url or "").strip()
 if not title or not url.startswith(("http://","https://")): return
 jobs.append({"id":hashlib.sha256((src+"|"+url).encode()).hexdigest()[:24],"source":src,"title":title,"company":clean(company),"location":clean(loc),"description":clean(desc)[:5000],"apply_url":url,"published_at":str(pub or datetime.datetime.now(datetime.timezone.utc).isoformat()),"remote":bool(remote or "remote" in clean(loc).lower())})
for name,url,typ in S:
 try:
  raw=get(url)
  if typ=="json":
   d=json.loads(raw.decode("utf-8","replace")); arr=d if isinstance(d,list) else d.get("jobs",d.get("data",[]))
   if name=="RemoteOK" and isinstance(arr,list) and arr and isinstance(arr[0],dict) and "legal" in arr[0]: arr=arr[1:]
   for x in arr if isinstance(arr,list) else []:
    add(name,x.get("title"),x.get("company_name") or x.get("company"),x.get("location") or x.get("candidate_required_location"),x.get("description"),x.get("url") or x.get("apply_url"),x.get("publication_date") or x.get("published_at") or x.get("date"),x.get("remote",False))
  else:
   root=ET.fromstring(raw); items=root.findall(".//item")
   for x in items:
    def tx(t):
     z=x.find(t); return z.text if z is not None else ""
    add(name,tx("title"),tx("author") or tx("creator"),"",tx("description"),tx("link"),tx("pubDate"))
  health.append({"source":name,"endpoint":url,"status":"LIVE","jobs":sum(1 for j in jobs if j["source"]==name)})
 except Exception as e: health.append({"source":name,"endpoint":url,"status":"DEGRADED","jobs":0,"error":str(e)[:180]})
old=[]
try:
 old=json.load(open("jobs-worldwide.json"))
 if not isinstance(old,list): old=[]
except: pass
allj=old+jobs; seen=set(); out=[]
for j in allj:
 k=j.get("apply_url") or j.get("id")
 if k in seen: continue
 seen.add(k); out.append(j)
out.sort(key=lambda x:x.get("published_at",""),reverse=True)
json.dump(out,open("jobs-worldwide.json","w"),ensure_ascii=False,indent=2)
json.dump({"generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"configured_sources":len(S),"live_sources":sum(x["status"]=="LIVE" for x in health),"degraded_sources":sum(x["status"]!="LIVE" for x in health),"total_jobs":len(out),"sources":health},open("data/source-health.json","w"),ensure_ascii=False,indent=2)
print("REAL_JOBS="+str(len(out)));print("LIVE_SOURCES="+str(sum(x["status"]=="LIVE" for x in health)));print("DEGRADED="+str(sum(x["status"]!="LIVE" for x in health)))
