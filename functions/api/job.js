import {html,json} from "../lib/utils.js";
import {jobPage} from "../lib/seo.js";
export async function onRequestGet({request,env,params}){
 const slug=decodeURIComponent(params.slug||"");const j=await env.DB.prepare("SELECT * FROM jobs WHERE slug=? AND is_active=1").bind(slug).first();
 if(!j)return json({error:"not_found"},404);
 const base=new URL(request.url).origin;return html(jobPage(j,base),200,{"cache-control":"public,max-age=60,stale-while-revalidate=300"});
}
