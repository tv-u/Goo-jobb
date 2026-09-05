import {json} from "../lib/utils.js";
import {sourceHealth} from "../lib/source-health.js";
export async function onRequestGet({env}){return json({sources:await sourceHealth(env.DB)})}
