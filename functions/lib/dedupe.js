export function dedupeJobs(items){const m=new Map();for(const j of items){const k=`${j.source_id}|${j.external_id}|${j.content_hash}`;if(!m.has(k))m.set(k,j)}return [...m.values()]}
