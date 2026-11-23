import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Composio} from "@composio/core";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath=path.join(root,".env");if(fs.existsSync(envPath))process.loadEnvFile(envPath);
const groups=JSON.parse(fs.readFileSync(path.join(root,"research/apps.json"),"utf8"));
const apps=groups.flatMap(g=>g.apps.map(([name,hint])=>({name,hint,category:g.category})));
const value=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined};
const limit=Number(value("--limit")||apps.length),offset=Number(value("--offset")||0),concurrency=Number(value("--concurrency")||6);
const selected=apps.slice(offset,offset+limit);
const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim().slice(0,120000);
const tests={
  oauth:/\boauth(?:\s*2(?:\.0)?)?\b/i,"API key":/\bapi[- ]?key\b/i,"API token":/\bapi[- ]?token\b|personal access token/i,basic:/\bbasic authentication\b|basic auth/i,
  REST:/\brest(?:ful)?\s+api\b|api-reference\/rest/i,GraphQL:/\bgraphql\b/i,MCP:/model context protocol|\bmcp server\b|\/mcp\b/i,webhooks:/\bwebhooks?\b/i,
  gated:/partner program|apply for access|request access|subject to approval|contact sales|enterprise plan|private api|approval required/i,
  selfserve:/create (?:an? )?(?:api )?(?:key|token)|sign up for free|free trial|developer account|create (?:an? )?app/i
};
const runDir=path.join(root,"research","runs");fs.mkdirSync(runDir,{recursive:true});
const out=path.join(runDir,`rules-${new Date().toISOString().replace(/[:.]/g,"-")}.jsonl`);
let composioStatus="not configured";
if(process.env.COMPOSIO_API_KEY){try{const c=new Composio({apiKey:process.env.COMPOSIO_API_KEY});const x=await c.tools.getRawComposioTools({search:"web search browser fetch URL",limit:20});composioStatus=`connected; ${(x.items||x.tools||[]).length} research tools exposed`;}catch(e){composioStatus=`failed: ${e.status||e.message}`}}
async function research(app){
  let text="",status=0,error="";
  try{const res=await fetch(app.hint,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 ProductOpsEvidenceBot/1.0"},signal:AbortSignal.timeout(20000)});status=res.status;if(res.ok)text=clean(await res.text());else error=`HTTP ${res.status}`;}catch(e){error=e.message}
  const found=Object.fromEntries(Object.entries(tests).map(([k,re])=>[k,re.test(text)]));
  const auth=[found.oauth&&"OAuth 2.0",found["API key"]&&"API key",found["API token"]&&"API token",found.basic&&"Basic"].filter(Boolean);
  const surfaces=[found.REST&&"REST",found.GraphQL&&"GraphQL",found.MCP&&"MCP",found.webhooks&&"Webhooks"].filter(Boolean);
  const access=found.gated?"approval-gated":found.selfserve?"self-serve":"unclear";
  const verdict=error||!surfaces.length?"unclear":found.gated?"needs-outreach":auth.length?"build-now":"unclear";
  const confidence=error||!text?"low":surfaces.length&&auth.length&&!found.gated?"medium":"low";
  const record={app:app.name,category:app.category,one_line:`${app.category} product; purpose requires human confirmation from product documentation.`,auth,access,api_surface:surfaces.join(" + ")||"unclear",mcp:found.MCP?"documented signal found":"not evidenced on inspected page",verdict,blocker:error||(!surfaces.length?"No API-surface signal on inspected page":found.gated?"Approval or partner-language detected":!auth.length?"Authentication not evidenced on inspected page":""),evidence:text?[{claim:`First-party page inspected; signals: ${[...auth,...surfaces,found.gated&&"gating",found.selfserve&&"self-serve"].filter(Boolean).join(", ")||"none"}`,url:app.hint}]:[],confidence,needs_human:confidence!=="medium"||verdict!=="build-now",source_fetch:{url:app.hint,status,ok:Boolean(text),error},signals:found,provider:"deterministic-evidence-agent",composio_status:composioStatus,researched_at:new Date().toISOString()};
  fs.appendFileSync(out,JSON.stringify(record)+"\n");
  console.log(`${verdict.padEnd(14)} ${app.name}${error?` [${error}]`:""}`);
}
let cursor=0;async function worker(){while(cursor<selected.length){const i=cursor++;await research(selected[i])}}
await Promise.all(Array.from({length:Math.min(concurrency,selected.length)},worker));
console.log(`\n${selected.length} records written to ${path.relative(root,out)}\nComposio: ${composioStatus}\nRun npm run review -- ${out}`);
