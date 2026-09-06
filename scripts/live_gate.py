import json,sys
from pathlib import Path
j=Path("jobs-worldwide.json")
if not j.exists(): print("NO_JOBS_JSON"); sys.exit(1)
x=json.loads(j.read_text()); jobs=x.get("jobs",x) if isinstance(x,(dict,list)) else []
seen=set(); real=[]
for q in jobs:
    if not isinstance(q,dict): continue
    u=str(q.get("applyUrl") or q.get("apply_url") or q.get("url") or q.get("link") or "").strip()
    t=str(q.get("title") or "").strip(); c=str(q.get("company") or q.get("companyName") or "").strip()
    if u.startswith(("http://","https://")) and t and c and u.lower() not in seen: seen.add(u.lower()); real.append(q)
Path("jobs-worldwide.json").write_text(json.dumps({"updatedAt":x.get("updatedAt"),"count":len(real),"jobs":real},ensure_ascii=False),encoding="utf-8")
print("REAL_UNIQUE_JOBS",len(real))
if len(real)<20000: print("WARNING_REAL_JOBS_BELOW_20000")
