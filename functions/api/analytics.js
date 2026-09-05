import {json,clean} from "../lib/utils.js";
import {rateLimit,sameOrigin} from "../lib/security.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request)||!rateLimit(request,"events",40,60000))return json({error:"blocked"},403);
 try{const x=await request.json();const event=clean(x.event,80);if(!event)return json({error:"event_required"},400);
 await env.DB.prepare("INSERT INTO events(event,path,job_id,metadata_json) VALUES(?,?,?,?)").bind(event,clean(x.path,500),Number.isInteger(x.job_id)?x.job_id:null,JSON.stringify(x.metadata||{}).slice(0,3000)).run();
 return json({ok:true});
 }catch{return json({error:"bad_request"},400)}
}
