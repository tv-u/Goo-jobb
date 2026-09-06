import json,re,sys
from pathlib import Path
required=["index.html","jobs-worldwide.json"]
for f in required:
 if not Path(f).exists(): raise SystemExit("MISSING:"+f)
data=json.loads(Path("jobs-worldwide.json").read_text(encoding="utf-8"))
jobs=data.get("jobs",[])
ids=[x.get("id") for x in jobs]
if len(ids)!=len(set(ids)): raise SystemExit("DUPLICATE_JOB_IDS")
for j in jobs:
 if not j.get("title") or not j.get("url","").startswith(("http://","https://")):raise SystemExit("INVALID_JOB")
html=Path("index.html").read_text(errors="ignore")
if "<html" not in html.lower() or "</html>" not in html.lower():raise SystemExit("INVALID_HTML")
print("SITE_VALIDATION_OK")
