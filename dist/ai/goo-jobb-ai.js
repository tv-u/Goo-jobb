(()=>{

"use strict";

const API="/Goo-jobb/jobs-worldwide.json";

const GOOAI={
  jobs:[],
  ready:false,

  async load(){
    if(this.ready) return this.jobs;

    try{
      const r=await fetch(API,{cache:"no-store"});
      const data=await r.json();

      if(Array.isArray(data)){
        this.jobs=data;
        this.ready=true;
      }
    }catch(e){
      console.warn("GOO-JOBB AI data unavailable");
    }

    return this.jobs;
  },

  async search(query){
    const jobs=await this.load();

    const q=String(query||"")
      .toLowerCase()
      .trim();

    if(!q) return jobs.slice(0,50);

    const words=q.split(/\s+/).filter(Boolean);

    return jobs
      .map(job=>{

        const text=[
          job.title,
          job.company,
          job.location,
          job.category,
          job.description,
          job.skills,
          job.salary
        ].join(" ").toLowerCase();

        let score=0;

        for(const word of words){
          if(text.includes(word)) score++;
          if(String(job.title||"").toLowerCase().includes(word))
            score+=3;
          if(String(job.skills||"").toLowerCase().includes(word))
            score+=2;
        }

        return {job,score};
      })
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,100)
      .map(x=>x.job);
  }
};

window.GOO_JOBB_AI=GOOAI;

})();
