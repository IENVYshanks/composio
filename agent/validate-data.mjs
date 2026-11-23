import fs from "node:fs";
const groups=JSON.parse(fs.readFileSync(new URL("../research/apps.json",import.meta.url),"utf8"));
const audit=JSON.parse(fs.readFileSync(new URL("../research/human-audit.json",import.meta.url),"utf8"));
const deep=JSON.parse(fs.readFileSync(new URL("../research/deep-findings.json",import.meta.url),"utf8"));
const apps=groups.flatMap(g=>g.apps.map(([name,url])=>({name,url,category:g.category})));
const names=new Set(apps.map(x=>x.name));
const errors=[];
if(groups.length!==10)errors.push(`Expected 10 categories; got ${groups.length}`);
if(apps.length!==100)errors.push(`Expected 100 apps; got ${apps.length}`);
if(names.size!==apps.length)errors.push("Duplicate app names detected");
for(const app of apps)if(!/^https:\/\//.test(app.url))errors.push(`${app.name}: invalid evidence URL`);
if(audit.length<10)errors.push(`Expected at least 10 audited apps; got ${audit.length}`);
if(deep.rows?.length!==100)errors.push(`Expected 100 deep findings; got ${deep.rows?.length||0}`);
if(new Set((deep.rows||[]).map(x=>x.app)).size!==100)errors.push("Deep findings contain missing or duplicate apps");
for(const item of audit){
  if(!names.has(item.app))errors.push(`Audited app not in research set: ${item.app}`);
  if(!item.evidence?.length)errors.push(`${item.app}: audit has no evidence`);
  for(const url of item.evidence||[])if(!/^https:\/\//.test(url))errors.push(`${item.app}: invalid audit evidence URL`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
const claimLinks=(deep.rows||[]).reduce((sum,x)=>sum+(x.evidence?.length||0),0);
console.log(`✓ ${apps.length} unique apps across ${groups.length} categories; ${deep.rows.length} deep findings with ${claimLinks} claim links; ${audit.length} preserved human audits.`);
