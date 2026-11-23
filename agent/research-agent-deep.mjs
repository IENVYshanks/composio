import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Composio} from "@composio/core";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath=path.join(root,".env");if(fs.existsSync(envPath))process.loadEnvFile(envPath);
const groups=JSON.parse(fs.readFileSync(path.join(root,"research/apps.json"),"utf8"));
const allApps=groups.flatMap(g=>g.apps.map(([name,hint])=>({name,hint,category:g.category})));
const value=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined};
const limit=Number(value("--limit")||allApps.length),offset=Number(value("--offset")||0),concurrency=Number(value("--concurrency")||4),pagesPerApp=Number(value("--pages")||4);
const apps=allApps.slice(offset,offset+limit);
const runDir=path.join(root,"research","runs");fs.mkdirSync(runDir,{recursive:true});
const out=path.join(runDir,`deep-${new Date().toISOString().replace(/[:.]/g,"-")}.jsonl`);

const categories={"CRM & Sales":"Manages customer relationships, deals, and sales activity.","Support & Helpdesk":"Runs customer conversations, tickets, and support workflows.","Communications & Messaging":"Sends messages, calls, and team communications.","Marketing, Ads, Email & Social":"Operates campaigns, audiences, email, and social publishing.","Ecommerce":"Manages storefronts, products, orders, and sellers.","Data, SEO & Scraping":"Collects web data, rankings, enrichment, and search intelligence.","Developer, Infra & Data":"Operates code, deployments, infrastructure, databases, and observability.","Productivity & Project Management":"Coordinates documents, projects, tasks, and time.","Finance & Fintech":"Moves, reconciles, or enriches financial data.","AI, Research & Media-native":"Creates, extracts, or searches AI-native media and knowledge."};
const patterns={"OAuth 2.0":/\boauth(?:\s*2(?:\.0)?)?\b/i,"API key":/\bapi[- ]?key\b/i,"API token":/\bapi[- ]?token\b|personal access token/i,"Basic":/\bbasic authentication\b|basic auth/i,"REST":/\brest(?:ful)?\s+api\b|\/rest\b|api-reference\/rest/i,"GraphQL":/\bgraphql\b/i,"MCP":/model context protocol|\bmcp server\b|\/mcp\b/i,"Webhooks":/\bwebhooks?\b/i,"gated":/partner program|apply for access|request access|subject to approval|contact sales|enterprise plan|private api|approval required|qualification criteria/i,"self-serve":/create (?:an? )?(?:api )?(?:key|token)|sign up for free|free trial|developer account|create (?:an? )?app|generate (?:an? )?(?:api )?(?:key|token)/i};
const linkInterest=/oauth|authenticat|authorization|api.reference|developer|getting.started|quickstart|access|credential|token|pricing|plan|partner|integration|mcp|graphql|rest|webhook/i;
const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim().slice(0,100000);
const hostFamily=host=>host.split(".").slice(-2).join(".");
async function fetchPage(url){
  try{const res=await fetch(url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 ProductOpsEvidenceBot/2.0"},signal:AbortSignal.timeout(20000)});const html=res.ok?await res.text():"";return {url:res.url||url,status:res.status,ok:res.ok,html,text:res.ok?clean(html):"",error:res.ok?"":`HTTP ${res.status}`};}catch(e){return {url,status:0,ok:false,html:"",text:"",error:e.name==="TimeoutError"?"timeout":e.message}}
}
function linksFrom(page,seed){
  if(!page.ok)return [];
  const seedFamily=hostFamily(new URL(seed).hostname);
  const found=[];const re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(page.html))){try{const url=new URL(m[1],page.url);url.hash="";if(!/^https?:$/.test(url.protocol)||hostFamily(url.hostname)!==seedFamily)continue;const label=clean(m[2]).slice(0,150);const signal=`${url.pathname} ${label}`;if(linkInterest.test(signal))found.push({url:url.toString(),score:(signal.match(new RegExp(linkInterest.source,"gi"))||[]).length,label});}catch{}}
  return [...new Map(found.sort((a,b)=>b.score-a.score).map(x=>[x.url,x])).values()];
}
const detected=(pages,key)=>pages.filter(p=>p.ok&&patterns[key].test(p.text));
let composioStatus="not configured";
if(process.env.COMPOSIO_API_KEY){try{const c=new Composio({apiKey:process.env.COMPOSIO_API_KEY});const x=await c.tools.getRawComposioTools({search:"web search browser fetch URL",limit:20});composioStatus=`connected; ${(x.items||x.tools||[]).length} research tools exposed`;}catch(e){composioStatus=`failed: ${e.status||e.message}`}}

async function research(app){
  const seed=await fetchPage(app.hint);const candidates=linksFrom(seed,app.hint).slice(0,Math.max(0,pagesPerApp-1));
  const pages=[seed,...await Promise.all(candidates.map(x=>fetchPage(x.url)))];
  const auth=["OAuth 2.0","API key","API token","Basic"].filter(k=>detected(pages,k).length);
  const surfaces=["REST","GraphQL","MCP","Webhooks"].filter(k=>detected(pages,k).length);
  const gated=detected(pages,"gated"),selfserve=detected(pages,"self-serve");
  const access=gated.length?"approval-gated":selfserve.length?"self-serve":"unclear";
  const contradiction=Boolean(gated.length&&selfserve.length);
  const verdict=!surfaces.length?"unclear":gated.length?"needs-outreach":auth.length&&selfserve.length?"build-now":"unclear";
  const evidence=[];
  for(const key of auth){const p=detected(pages,key)[0];evidence.push({claim:`Authentication signal: ${key}`,url:p.url})}
  for(const key of surfaces){const p=detected(pages,key)[0];evidence.push({claim:`API surface signal: ${key}`,url:p.url})}
  if(gated.length)evidence.push({claim:"Approval, partner, enterprise, or contact-sales language detected",url:gated[0].url});
  if(selfserve.length)evidence.push({claim:"Self-service credential or developer-signup language detected",url:selfserve[0].url});
  const readable=pages.filter(p=>p.ok).length;
  const confidence=readable>=2&&auth.length&&surfaces.length&&!contradiction?"medium":"low";
  const record={app:app.name,category:app.category,one_line:categories[app.category],auth,access,api_surface:surfaces.join(" + ")||"unclear",mcp:surfaces.includes("MCP")?"documented signal found":"not evidenced on inspected pages",verdict,blocker:contradiction?"Both self-serve and gated language found; human must identify which API product each applies to.":!readable?"No supplied page could be read.":!surfaces.length?"No API-surface evidence found on inspected pages.":!auth.length?"Authentication method not evidenced on inspected pages.":access==="unclear"?"Credential availability not evidenced on inspected pages.":gated.length?"Approval or commercial gate detected.":"",evidence,confidence,needs_human:confidence!=="medium"||verdict!=="build-now"||contradiction,pages:pages.map(({url,status,ok,error})=>({url,status,ok,error})),contradiction,provider:"multi-page-deterministic-evidence-agent",composio_status:composioStatus,researched_at:new Date().toISOString()};
  fs.appendFileSync(out,JSON.stringify(record)+"\n");
  console.log(`${verdict.padEnd(14)} ${app.name} · ${readable}/${pages.length} pages · ${evidence.length} claims${contradiction?" · conflict":""}`);
}
let cursor=0;async function worker(){while(cursor<apps.length){const i=cursor++;await research(apps[i])}}
await Promise.all(Array.from({length:Math.min(concurrency,apps.length)},worker));
console.log(`\n${apps.length} deep records written to ${path.relative(root,out)}\nComposio: ${composioStatus}\nRun npm run review -- ${out}`);
