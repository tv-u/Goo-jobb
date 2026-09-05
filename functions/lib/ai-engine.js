export async function ai(env,task,input){
  const text=String(input||"").slice(0,12000);
  if(env.AI){try{const r=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:"You are a concise career assistant. Never invent job facts. Clearly label estimates."},{role:"user",content:`Task: ${task}\n\n${text}`} ]});return r?.response||""}catch{}}
  if(task==="summary")return text.replace(/\s+/g," ").slice(0,700);
  if(task==="skills")return [...new Set((text.match(/\b(JavaScript|TypeScript|Python|Java|Go|SQL|AWS|Azure|GCP|Docker|Kubernetes|React|Node\.js|Excel|Figma|SEO|Salesforce)\b/gi)||[]))];
  return "AI service is temporarily unavailable; the local fallback can still analyze basic job text.";
}
