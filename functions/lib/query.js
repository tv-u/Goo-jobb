import {parseCursor,makeCursor} from "./utils.js";
export function queryOptions(url){
  const p=url.searchParams;return {q:(p.get("q")||"").trim().slice(0,120),location:(p.get("location")||"").trim().slice(0,120),country:(p.get("country")||"").trim().toUpperCase().slice(0,2),category:(p.get("category")||"").trim().slice(0,50),remote:p.get("remote")||"",sort:p.get("sort")||"new",limit:Math.min(50,Math.max(1,+p.get("limit")||24)),cursor:parseCursor(p.get("cursor")||"")}}
export const next=(row)=>row?makeCursor({id:row.id,posted_at:row.posted_at}):"";
