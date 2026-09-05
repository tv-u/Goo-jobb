export async function kvGet(env,key){try{return await env.MY_KV?.get(key,"json")}catch{return null}}
export async function kvPut(env,key,value,ttl=300){try{await env.MY_KV?.put(key,JSON.stringify(value),{expirationTtl:ttl})}catch{}}
export const cacheKey=(prefix,obj)=>`${prefix}:${btoa(JSON.stringify(obj)).replace(/=+$/,"")}`;
