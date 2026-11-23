import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import {fileURLToPath} from "node:url";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runsDir=path.join(root,"research","runs");
const requested=process.argv.find(x=>x.endsWith(".jsonl"));
const runs=fs.existsSync(runsDir)?fs.readdirSync(runsDir).filter(x=>x.endsWith(".jsonl")).sort():[];
const input=requested?path.resolve(requested):runs.length?path.join(runsDir,runs.at(-1)):null;
if(!input||!fs.existsSync(input))throw new Error("No research run found. Run `npm run research` first, or pass a JSONL path.");

const records=fs.readFileSync(input,"utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const queue=records.filter(x=>x.needs_human||x.confidence==="low"||x.verdict==="unclear"||!x.evidence?.length);
const output=input.replace(/\.jsonl$/,".reviewed.jsonl");
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
let decisions=0;
console.log(`Human review queue: ${queue.length}/${records.length} records from ${path.basename(input)}\n`);

for(const item of queue){
  console.log(`\n${"─".repeat(72)}\n${item.app} · ${item.verdict} · ${item.confidence}\n${item.blocker||"No blocker recorded"}`);
  for(const e of item.evidence||[])console.log(`  - ${e.claim}: ${e.url}`);
  const action=(await rl.question("[a]ccept, [c]orrect, [r]eject, [d]efer, [q]uit: ")).trim().toLowerCase();
  if(action==="q")break;
  if(!["a","c","r","d"].includes(action)){console.log("Deferred (unrecognized action).");continue}
  let correction="",reviewNote="";
  if(action==="c")correction=await rl.question("Corrected finding (concise): ");
  reviewNote=await rl.question("Reviewer note / evidence checked: ");
  fs.appendFileSync(output,JSON.stringify({app:item.app,action:{a:"accepted",c:"corrected",r:"rejected",d:"deferred"}[action],original:item,correction,review_note:reviewNote,reviewed_at:new Date().toISOString()})+"\n");
  decisions++;
}
rl.close();
console.log(decisions?`\n${decisions} review decision(s) appended to ${path.relative(root,output)}`:"\nReview exited without writing a decision.");
