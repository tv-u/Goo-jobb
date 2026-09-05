import {json} from "../lib/utils.js";
export async function onRequestGet({env}){const r=await env.DB.prepare("SELECT category,COUNT(*) jobs FROM jobs WHERE is_active=1 GROUP BY category ORDER BY jobs DESC").all();return json({categories:r.results||[]})}
