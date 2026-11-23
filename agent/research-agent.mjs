import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import OpenAI from "openai";
import {Composio} from "@composio/core";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath=path.join(root,".env");
if(fs.existsSync(envPath))process.loadEnvFile(envPath);
const groups=JSON.parse(fs.readFileSync(path.join(root,"research/apps.json"),"utf8"));
const apps=groups.flatMap(g=>g.apps.map(([name,hint])=>({name,hint,category:g.category})));
const limitArg=process.argv.indexOf("--limit");
const limit=limitArg>=0?Number(process.argv[limitArg+1]):apps.length;
if(!process.env.OPENAI_API_KEY){
  console.error("Missing OPENAI_API_KEY. Add it to .env before running research.");
  process.exit(2);
}

const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
let composioTools=[];
if(process.env.COMPOSIO_API_KEY){
  try{
    const composio=new Composio({apiKey:process.env.COMPOSIO_API_KEY});
    const catalog=await composio.tools.getRawComposioTools({search:"web search browser fetch URL",limit:20});
    composioTools=(catalog.items||catalog.tools||[]).map(t=>({slug:t.slug||t.name,description:t.description}));
  }catch(error){
    console.error(`Composio connection failed: ${error.status===401?"invalid COMPOSIO_API_KEY":error.message}`);
    process.exit(3);
  }
}

const runDir=path.join(root,"research","runs");fs.mkdirSync(runDir,{recursive:true});
const out=path.join(runDir,`${new Date().toISOString().replace(/[:.]/g,"-")}.jsonl`);
const schema={type:"object",additionalProperties:false,required:["app","category","one_line","auth","access","api_surface","mcp","verdict","blocker","evidence","confidence","needs_human"],properties:{app:{type:"string"},category:{type:"string"},one_line:{type:"string"},auth:{type:"array",items:{type:"string"}},access:{type:"string",enum:["self-serve","trial","paid self-serve","approval-gated","partner-gated","enterprise-only","unclear"]},api_surface:{type:"string"},mcp:{type:"string"},verdict:{type:"string",enum:["build-now","needs-outreach","blocked","unclear"]},blocker:{type:"string"},evidence:{type:"array",items:{type:"object",additionalProperties:false,required:["claim","url"],properties:{claim:{type:"string"},url:{type:"string"}}}},confidence:{type:"string",enum:["high","medium","low"]},needs_human:{type:"boolean"}}};

try{for(const app of apps.slice(0,limit)){
  const tools=process.env.COMPOSIO_MCP_URL?[{type:"mcp",server_label:"composio_research",server_url:process.env.COMPOSIO_MCP_URL,require_approval:"never"}]:[];
  const response=await openai.responses.create({model:process.env.OPENAI_MODEL||"gpt-5.2",tools,input:[{role:"system",content:"You are a skeptical API product researcher. Use the connected Composio research tools when available. Prefer first-party docs. Never infer self-serve access merely from public docs. If evidence is unavailable, say unclear. Return only evidence-backed claims."},{role:"user",content:`Research ${app.name} (${app.category}). Starting first-party hint: ${app.hint}. Determine purpose, auth, credential access, API breadth, MCP, buildability, blocker, and claim-level URLs. Available Composio discovery tools (catalog metadata only): ${JSON.stringify(composioTools.slice(0,8))}`}],text:{format:{type:"json_schema",name:"app_research",strict:true,schema}}});
  const record=JSON.parse(response.output_text);
  fs.appendFileSync(out,JSON.stringify({...record,researched_at:new Date().toISOString()})+"\n");
  console.log(`${record.verdict.padEnd(14)} ${app.name}`);
}
console.log(`\nCheckpoint written to ${path.relative(root,out)}. Human review required before promotion.`);
}catch(error){
  const message=error.status===401?"OpenAI authentication failed. Replace OPENAI_API_KEY with a valid Platform API key.":error.message;
  console.error(`Research run stopped: ${message}`);
  process.exit(4);
}
