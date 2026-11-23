import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {Composio} from "@composio/core";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath=path.join(root,".env");
if(fs.existsSync(envPath))process.loadEnvFile(envPath);
const groups=JSON.parse(fs.readFileSync(path.join(root,"research/apps.json"),"utf8"));
const apps=groups.flatMap(g=>g.apps.map(([name,hint])=>({name,hint,category:g.category})));
const argValue=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined};
const limit=Number(argValue("--limit")||apps.length);
const offset=Number(argValue("--offset")||0);
const model=argValue("--model")||process.env.OLLAMA_MODEL||"gemma4:e2b";
const ollama=process.env.OLLAMA_URL||"http://127.0.0.1:11434";

const schema={type:"object",required:["app","category","one_line","auth","access","api_surface","mcp","verdict","blocker","evidence","confidence","needs_human"],properties:{app:{type:"string"},category:{type:"string"},one_line:{type:"string"},auth:{type:"array",items:{type:"string"}},access:{type:"string",enum:["self-serve","trial","paid self-serve","approval-gated","partner-gated","enterprise-only","unclear"]},api_surface:{type:"string"},mcp:{type:"string"},verdict:{type:"string",enum:["build-now","needs-outreach","blocked","unclear"]},blocker:{type:"string"},evidence:{type:"array",items:{type:"object",required:["claim","url"],properties:{claim:{type:"string"},url:{type:"string"}}}},confidence:{type:"string",enum:["high","medium","low"]},needs_human:{type:"boolean"}}};

const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim().slice(0,30000);
async function readOfficialPage(url){
  try{
    const res=await fetch(url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 ProductOpsResearch/1.0"},signal:AbortSignal.timeout(20000)});
    if(!res.ok)return {ok:false,error:`HTTP ${res.status}`,text:""};
    return {ok:true,error:"",text:clean(await res.text())};
  }catch(error){return {ok:false,error:error.message,text:""}}
}

let composioStatus="not configured";
if(process.env.COMPOSIO_API_KEY){
  try{
    const composio=new Composio({apiKey:process.env.COMPOSIO_API_KEY});
    const catalog=await composio.tools.getRawComposioTools({search:"web search browser fetch URL",limit:20});
    const count=(catalog.items||catalog.tools||[]).length;
    composioStatus=`connected; ${count} matching research tools exposed`;
  }catch(error){composioStatus=`connection failed: ${error.status===401?"invalid key":error.message}`}
}
console.log(`Local model: ${model}\nComposio: ${composioStatus}\n`);

const runDir=path.join(root,"research","runs");fs.mkdirSync(runDir,{recursive:true});
const out=path.join(runDir,`local-${new Date().toISOString().replace(/[:.]/g,"-")}.jsonl`);
for(const app of apps.slice(offset,offset+limit)){
  const page=await readOfficialPage(app.hint);
  const prompt=`You are a skeptical API product researcher. Analyze only the supplied first-party page text. Never invent auth, access, API, MCP, or pricing facts. If the page does not prove a claim, use unclear and set needs_human=true. Public docs do not automatically mean self-serve credentials.\n\nApp: ${app.name}\nCategory: ${app.category}\nOfficial URL: ${app.hint}\nFetch status: ${page.ok?"success":page.error}\nPage text:\n${page.text||"No readable page content."}`;
  try{
    const response=await fetch(`${ollama}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model,stream:false,format:schema,options:{temperature:0.1,num_gpu:Number(process.env.OLLAMA_NUM_GPU||0)},messages:[{role:"user",content:prompt}]}),signal:AbortSignal.timeout(180000)});
    if(!response.ok)throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    const body=await response.json();
    const record=JSON.parse(body.message.content);
    record.app=app.name;record.category=app.category;
    if(!record.evidence?.length&&page.ok)record.evidence=[{claim:"First-party page inspected; claims remain provisional",url:app.hint}];
    const saved={...record,source_fetch:{url:app.hint,ok:page.ok,error:page.error},provider:"ollama",model,composio_status:composioStatus,researched_at:new Date().toISOString()};
    fs.appendFileSync(out,JSON.stringify(saved)+"\n");
    console.log(`${record.verdict.padEnd(14)} ${app.name}${page.ok?"":" [fetch failed]"}`);
  }catch(error){
    const failure={app:app.name,category:app.category,verdict:"unclear",confidence:"low",needs_human:true,blocker:`Local model failure: ${error.message}`,evidence:[],source_fetch:{url:app.hint,ok:page.ok,error:page.error},provider:"ollama",model,researched_at:new Date().toISOString()};
    fs.appendFileSync(out,JSON.stringify(failure)+"\n");
    console.error(`failed         ${app.name}: ${error.message}`);
  }
}
console.log(`\nCheckpoint written to ${path.relative(root,out)}. Run npm run review next.`);
