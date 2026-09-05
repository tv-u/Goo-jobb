const url=process.env.SYNC_URL||"http://127.0.0.1:8788/api/sync";
const token=process.env.SYNC_TOKEN||"";
const r=await fetch(url,{method:"POST",headers:{"authorization":`Bearer ${token}`}});
console.log(await r.text());if(!r.ok)process.exit(1);
