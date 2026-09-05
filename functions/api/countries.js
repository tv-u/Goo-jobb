import {json} from "../lib/utils.js";
export async function onRequestGet({env}){const r=await env.DB.prepare("SELECT country,country_code,COUNT(*) jobs FROM jobs WHERE is_active=1 AND country_code<>'' GROUP BY country_code ORDER BY jobs DESC").all();return json({countries:r.results||[]})}
