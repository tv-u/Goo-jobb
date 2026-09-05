import {json} from "../lib/utils.js";
import {requireToken} from "../lib/security.js";
import {syncAll} from "../lib/sync-engine.js";
export async function onRequestPost({request,env}){if(!requireToken(request,env))return json({error:"unauthorized"},401);return json(await syncAll(env))}
export async function onRequestGet(ctx){return onRequestPost(ctx)}
