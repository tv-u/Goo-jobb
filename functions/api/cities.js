import {json} from "../lib/utils.js";
export async function onRequestGet({env}){const r=await env.DB.prepare("SELECT city,country_code,COUNT(*) jobs FROM jobs WHERE is_active=1 AND city<>'' GROUP BY city,country_code ORDER BY jobs DESC LIMIT 500").all();return json({cities:r.results||[]})}
