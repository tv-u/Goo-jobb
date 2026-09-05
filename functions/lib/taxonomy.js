const cats={
 engineering:["engineer","developer","software","devops","sre","data","machine learning","frontend","backend","full stack","qa","security"],
 design:["designer","ux","ui","creative","product design"],
 marketing:["marketing","seo","content","growth","social media","brand"],
 sales:["sales","account executive","business development","bdr","sdr"],
 finance:["finance","accountant","accounting","audit","investment","analyst"],
 hr:["human resources","recruiter","talent","people"],
 operations:["operations","supply chain","logistics","procurement"],
 customer:["customer success","support","customer service"],
 healthcare:["nurse","doctor","medical","healthcare","pharmacy"],
 education:["teacher","education","instructor","professor"]
};
export function categoryFor(title="",desc=""){const x=(title+" "+desc).toLowerCase();for(const [c,words] of Object.entries(cats))if(words.some(w=>x.includes(w)))return c;return"other"}
export function seniorityFor(t=""){const x=t.toLowerCase();if(/\b(intern|internship|trainee)\b/.test(x))return"intern";if(/\b(junior|jr\.?)\b/.test(x))return"junior";if(/\b(senior|sr\.?)\b/.test(x))return"senior";if(/\b(lead|principal|staff)\b/.test(x))return"lead";if(/\b(manager|director|head|vp|chief)\b/.test(x))return"management";return"mid"}
