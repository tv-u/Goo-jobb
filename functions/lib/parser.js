function strip(s){return String(s??"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function tag(xml,name){const re=new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i");return xml.match(re)?.[1]||""}
function items(xml){return [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(m=>m[2])}
export function parseFeed(body,contentType=""){
  const isJson=/json/i.test(contentType)||/^\s*[\[{]/.test(body);
  if(isJson){try{const j=JSON.parse(body);const a=Array.isArray(j)?j:(j.jobs||j.results||j.data||[]);return a.map(x=>({external_id:x.id||x.guid||x.url,title:x.title||x.name,description:x.description||x.content||x.snippet,company:x.company?.name||x.company||x.employer,location:x.location?.name||x.location||x.city,apply_url:x.url||x.apply_url||x.link,posted_at:x.posted_at||x.created_at||x.date,salary:x.salary})).filter(x=>x.title&&x.apply_url)}catch{return[]}}
  return items(body).map(x=>({external_id:strip(tag(x,"guid")||tag(x,"id")||tag(x,"link")),title:strip(tag(x,"title")),description:strip(tag(x,"description")||tag(x,"summary")||tag(x,"content")),company:strip(tag(x,"company")||tag(x,"author")),location:strip(tag(x,"location")||tag(x,"geo:location")),apply_url:strip(tag(x,"link")||tag(x,"url")),posted_at:strip(tag(x,"pubDate")||tag(x,"published")||tag(x,"updated")),salary:strip(tag(x,"salary"))})).filter(x=>x.title&&x.apply_url)
}
