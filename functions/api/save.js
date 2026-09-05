import {json} from "../lib/utils.js";
import {sameOrigin} from "../lib/security.js";
export async function onRequestPost({request,env}){if(!sameOrigin(request))return json({error:"blocked"},403);const x=await request.json().catch(()=>null);const anon=String(x?.anon_id||"").slice(0,120),job=Number(x?.job_id);if(!anon||!job)return json({error:"invalid"},400);await env.DB.prepare("INSERT OR IGNORE INTO saves(anon_id,job_id) VALUES(?,?)").bind(anon,job).run();return json({ok:true})}
export async function onRequestDelete({request,env}){const x=await request.json().catch(()=>null);const anon=String(x?.anon_id||"").slice(0,120),job=Number(x?.job_id);await env.DB.prepare("DELETE FROM saves WHERE anon_id=? AND job_id=?").bind(anon,job).run();return json({ok:true})}
