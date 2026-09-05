import {json} from "../lib/utils.js";
import {ai} from "../lib/ai-engine.js";
import {rateLimit} from "../lib/security.js";
export async function onRequestPost({request,env}){if(!rateLimit(request,"ai",20,60000))return json({error:"rate_limited"},429);const x=await request.json().catch(()=>null);if(!x?.task)return json({error:"task_required"},400);return json({task:x.task,result:await ai(env,x.task,x.input||"")})}
