export function parseSalary(s=""){
  const x=String(s).replace(/,/g,"").trim(); if(!x)return {};
  const nums=[...x.matchAll(/(?:[$€£₹]|INR|USD|EUR|GBP)?\s*(\d+(?:\.\d+)?)(?:\s*[kK])?/g)].map(m=>+m[1]*(/[kK]/.test(m[0])?1000:1));
  if(!nums.length)return {};
  let currency=/₹|INR/i.test(x)?"INR":/\$|USD/i.test(x)?"USD":/€|EUR/i.test(x)?"EUR":/£|GBP/i.test(x)?"GBP":undefined;
  let period=/hour|hr|hourly/i.test(x)?"hour":/day|daily/i.test(x)?"day":/week|weekly/i.test(x)?"week":/month|monthly/i.test(x)?"month":"year";
  return {salary_min:nums[0],salary_max:nums[1]??nums[0],salary_currency:currency,salary_period:period};
}
