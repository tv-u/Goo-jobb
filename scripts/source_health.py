import json,time,urllib.request,urllib.error
from pathlib import Path
R=json.loads(Path("data/source-registry.json").read_text())
out=[]
for s in R["sources"]:
    row={**s,"status":"FAILED","http":0,"bytes":0,"checkedAt":int(time.time())}
    try:
        req=urllib.request.Request(s["url"],headers={"User-Agent":"GOO-JOBB/1.0 (+https://tv-u.github.io/Goo-jobb/)"})
        with urllib.request.urlopen(req,timeout=15) as r:
            b=r.read(1000000); row["http"]=r.status; row["bytes"]=len(b)
            if r.status==200 and len(b)>20: row["status"]="LIVE"
    except Exception as e: row["error"]=str(e)[:180]
    out.append(row); print(row["status"],row["name"],row["http"],row["bytes"])
live=sum(x["status"]=="LIVE" for x in out)
Path("data/source-health.json").write_text(json.dumps({"checkedAt":int(time.time()),"total":len(out),"live":live,"failed":len(out)-live,"sources":out},indent=2),encoding="utf-8")
print("SOURCES_TOTAL",len(out)); print("SOURCES_LIVE",live); print("SOURCES_FAILED",len(out)-live)
