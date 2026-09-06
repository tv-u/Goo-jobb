(()=>{

"use strict";

const STOP=new Set([
 "the","and","for","with","from","this","that","your","you",
 "our","are","job","jobs","work","working","will","have",
 "has","not","all","into","about","their","they","role",
 "team","company","years","year","required","looking"
]);

const SKILLS=[
 "javascript","typescript","python","java","kotlin","swift",
 "react","next.js","node.js","vue","angular","svelte",
 "php","laravel","ruby","rails","go","rust","c++","c#",
 "sql","postgresql","mysql","mongodb","redis","graphql",
 "aws","azure","gcp","docker","kubernetes","terraform",
 "linux","git","github","figma","excel","power bi",
 "tableau","salesforce","sap","oracle","snowflake",
 "databricks","machine learning","deep learning",
 "artificial intelligence","nlp","computer vision",
 "cybersecurity","devops","qa","testing","seo",
 "marketing","sales","project management"
];

function text(v){
 return String(v??"")
  .replace(/<[^>]*>/g," ")
  .replace(/\\s+/g," ")
  .trim();
}

function tokens(v){
 return text(v)
  .toLowerCase()
  .match(/[a-z][a-z0-9+#.-]{2,}/g)||[];
}

function skills(v){
 const t=text(v).toLowerCase();
 return SKILLS.filter(x=>t.includes(x));
}

function category(v){
 const t=text(v).toLowerCase();

 if(/software|developer|engineer|frontend|backend|devops|cloud|data/.test(t))
  return "Technology";

 if(/marketing|seo|growth|content/.test(t))
  return "Marketing";

 if(/sales|account executive|business development/.test(t))
  return "Sales";

 if(/finance|accounting|financial/.test(t))
  return "Finance";

 if(/human resources|recruit|hr /.test(t))
  return "Human Resources";

 if(/design|ux|ui|creative/.test(t))
  return "Design";

 if(/support|customer success/.test(t))
  return "Customer Support";

 return "General";
}

function seniority(v){
 const t=text(v).toLowerCase();

 if(/intern|internship|trainee/.test(t))
  return "Internship";

 if(/senior|sr\\.?|lead|principal|staff/.test(t))
  return "Senior";

 if(/junior|jr\\.?|entry level/.test(t))
  return "Entry Level";

 if(/manager|director|head|vp|chief/.test(t))
  return "Management";

 return "Mid Level";
}

function matchResume(resume,job){
 const a=new Set(tokens(resume).filter(x=>!STOP.has(x)));
 const b=new Set(tokens(job));

 const common=[...a].filter(x=>b.has(x));
 const score=b.size?Math.round(common.length/b.size*100):0;

 return {
  score:Math.min(score,100),
  matched:common.slice(0,50),
  missing:[...b].filter(x=>!a.has(x)).slice(0,50)
 };
}

function summarize(v){
 const s=text(v)
  .split(/(?<=[.!?])\\s+/)
  .filter(Boolean);

 return s.slice(0,4).join(" ");
}

window.GOO_JOBB_LOCAL_AI={
 version:"1.0",
 apiKeyRequired:false,
 extractSkills:skills,
 classifyCategory:category,
 detectSeniority:seniority,
 summarize,
 matchResume,
 keywords:v=>[...new Set(tokens(v)
   .filter(x=>!STOP.has(x))
 )].slice(0,30)
};

})();