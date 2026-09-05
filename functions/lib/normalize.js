import {clean,hash,slugify,safeUrl} from "./utils.js";
import {normalizeLocation} from "./location.js";
import {parseSalary} from "./salary.js";
import {categoryFor,seniorityFor} from "./taxonomy.js";
export async function normalize(raw,source){
  const title=clean(raw.title,240),description=clean(raw.description,12000),company=clean(raw.company||source.name,180);
  const L=normalizeLocation(raw.location||"Worldwide"), S=parseSalary(raw.salary||"");
  const skills=[...new Set((description.match(/\b(JavaScript|TypeScript|Python|Java|Go|Rust|PHP|C\+\+|React|Vue|Angular|Node\.js|SQL|AWS|Azure|GCP|Docker|Kubernetes|Git|Figma|Excel|Power BI|Salesforce|SEO)\b/gi)||[]).map(x=>x.toLowerCase()))].slice(0,20);
  const apply=safeUrl(raw.apply_url); if(!title||!apply)return null;
  const external_id=clean(raw.external_id||apply,500), content_hash=await hash(title+"|"+company+"|"+apply+"|"+description.slice(0,3000));
  const base=slugify(`${title}-${company}-${external_id.slice(0,24)}`);
  return {external_id,source_id:source.id,slug:base,title,description,company,company_slug:slugify(company),...L,employment_type:"unknown",category:categoryFor(title,description),seniority:seniorityFor(title),...S,skills_json:JSON.stringify(skills),apply_url:apply,source_url:safeUrl(raw.source_url||apply),posted_at:new Date(raw.posted_at||Date.now()).toISOString(),content_hash};
}
