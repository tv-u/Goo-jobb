const buckets=new Map();
export function securityHeaders(){
  return {"x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"geolocation=(),camera=(),microphone=()","strict-transport-security":"max-age=31536000; includeSubDomains","content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; frame-ancestors 'none'"};
}
export function rateLimit(req,key="global",limit=80,windowMs=60000){
  const ip=req.headers.get("CF-Connecting-IP")||"unknown"; const k=`${key}:${ip}`; const t=Date.now();
  const a=buckets.get(k)||[]; const fresh=a.filter(x=>x>t-windowMs); fresh.push(t); buckets.set(k,fresh);
  return fresh.length<=limit;
}
export function requireToken(req,env){const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||req.headers.get("x-sync-token");return !!env.SYNC_TOKEN&&token===env.SYNC_TOKEN}
export function sameOrigin(req){const o=req.headers.get("origin");return !o||o===new URL(req.url).origin}
