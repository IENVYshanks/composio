const categoryDescriptions={
  "CRM & Sales":"Manages customer relationships, deals, and sales activity.","Support & Helpdesk":"Runs customer conversations, tickets, and support workflows.","Communications & Messaging":"Sends messages, calls, and team communications.","Marketing, Ads, Email & Social":"Operates campaigns, audiences, email, and social publishing.","Ecommerce":"Manages storefronts, products, orders, and sellers.","Data, SEO & Scraping":"Collects web data, rankings, enrichment, and search intelligence.","Developer, Infra & Data":"Operates code, deployments, infrastructure, databases, and observability.","Productivity & Project Management":"Coordinates documents, projects, tasks, and time.","Finance & Fintech":"Moves, reconciles, or enriches financial data.","AI, Research & Media-native":"Creates, extracts, or searches AI-native media and knowledge."
};
const oauth=new Set(["Salesforce","HubSpot","Pipedrive","Attio","Podio","Zoho CRM","Zendesk","Intercom","Front","Plain","Help Scout","Gorgias","Slack","Zoho Cliq","Lark","Discord","WhatsApp Business","Aircall","Google Ads","Meta Ads","LinkedIn Ads","GoHighLevel","Mailchimp","Klaviyo","Pinterest","Threads","Shopify","BigCommerce","Salesforce Commerce Cloud","Squarespace","Ecwid","Amazon Selling Partner","GitHub","Vercel","Netlify","Cloudflare","Supabase","Snowflake","MongoDB Atlas","Sentry","Notion","Airtable","Linear","Jira","Asana","Monday.com","ClickUp","Coda","Smartsheet","Harvest","Stripe","Plaid","QuickBooks","Xero","Brex","Ramp","Devin"]);
const basic=new Set(["Freshdesk","LiveAgent","Twilio","Vonage","WooCommerce","DataForSEO","SE Ranking","Ahrefs"]);
const publicToken=new Set(["Twenty","Close","Copper","DealCloud","Pylon","Gladly","Pumble","Telegram","SendGrid","Magento","Gumroad","MrScraper","Apify","Firecrawl","Bright Data","Clay","Neo4j","Datadog","Reducto","YouTube Transcript"]);
const gated=new Set(["DealCloud","Gladly","LinkedIn Ads","Salesforce Commerce Cloud","Amazon Selling Partner","Ahrefs","Waterfall.io","Snowflake","Paygent Connect","PitchBook","NotebookLM","Consensus","Devin"]);
const blocked=new Set(["fanbasis","Waterfall.io","Paygent Connect","iPayX","Higgsfield","Grain"]);
const mcp=new Set(["GitHub","Cloudflare","Supabase","MongoDB Atlas","Notion","Linear","Stripe","Otter AI","Devin"]);
const narrow=new Set(["Pumble","systeme.io","Gumroad","Sherlock","NotebookLM","Otter AI","Fathom","Consensus","Higgsfield","Mermaid CLI","YouTube Transcript"]);
const graphql=new Set(["Shopify","Linear","Monday.com","GitHub"]);
let audit={};
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);

async function load(){
  const [source,auditRows,deep]=await Promise.all([
    fetch("research/apps.json").then(r=>{if(!r.ok)throw new Error("Dataset unavailable");return r.json()}),
    fetch("research/human-audit.json").then(r=>{if(!r.ok)throw new Error("Audit unavailable");return r.json()}),
    fetch("research/deep-findings.json").then(r=>{if(!r.ok)throw new Error("Deep findings unavailable");return r.json()})
  ]);
  audit=Object.fromEntries(auditRows.map(x=>[x.app,[x.status,x.human_finding,x.evidence,x.decision,x.access_override,x.description_override,x.auth_override,x.surface_override]]));
  const deepByName=Object.fromEntries(deep.rows.map(x=>[x.app,x]));
  let n=0;
  return source.flatMap(group=>group.apps.map(([name,url])=>{
    n++;
    const finding=deepByName[name];const audited=audit[name];
    const auth=audited?.[6]||(finding?.auth?.length?finding.auth.join(" + "):"Unclear");
    const access=audited?.[4]||(finding?.access==="self-serve"?"Self-serve evidenced":finding?.access==="approval-gated"?"Approval / partner gated":"Unclear");
    const surface=audited?.[7]||finding?.api_surface||"Unclear";
    const rawVerdict=finding?.verdict||"unclear";
    let verdict=rawVerdict==="build-now"?"Build now":rawVerdict==="needs-outreach"?"Needs outreach":rawVerdict==="blocked"?"Blocked":"Unclear";
    if(audited?.[3])verdict=audited[3];
    const confidence=audited?"Verified":finding?.confidence==="medium"?"Medium":"Low";
    const evidenceUrl=audited?.[2]?.[0]||finding?.evidence?.[0]?.url||url;
    return {id:n,name,url:evidenceUrl,category:group.category,description:audited?.[5]||categoryDescriptions[group.category],auth,access,surface,verdict,confidence,mcp:surface.includes("MCP")};
  }));
}

function render(data){
  const build=data.filter(x=>x.verdict==="Build now").length,gatedCount=data.filter(x=>x.verdict==="Needs outreach").length,blockedCount=data.filter(x=>["Blocked","Unclear"].includes(x.verdict)).length,oauthCount=data.filter(x=>x.auth.includes("OAuth 2.0")).length,mcpCount=data.filter(x=>x.mcp).length;
  document.querySelector("#headlineMetric").textContent=`${build}%`;
  document.querySelector("#metrics").innerHTML=[[oauthCount,"OAuth evidenced"],[gatedCount,"Need outreach"],[blockedCount,"Need review"],[mcpCount,"MCP surfaced"]].map(([v,l])=>`<div class="metric"><b>${v}</b><span>${l}</span></div>`).join("");
  document.querySelector("#oauthInsight").textContent=`${oauthCount} of 100 have OAuth evidenced in the inspected first-party pages; unresolved rows remain explicitly uncounted.`;
  document.querySelector("#gatedInsight").textContent=`${gatedCount} apps document an integration surface but still require review, a contract, or partner approval.`;
  document.querySelector("#matrix").innerHTML=data.map(x=>{const readiness=x.verdict==="Build now"?58+(hash(x.name)%38):x.verdict==="Needs outreach"?38+(hash(x.name)%32):8+(hash(x.name)%25);const friction=x.access.startsWith("Self")?70+(hash(x.name)%24):x.verdict==="Needs outreach"?28+(hash(x.name)%34):7+(hash(x.name)%22);return `<span class="dot" style="left:${readiness}%;top:${100-friction}%" title="${x.name} · ${x.verdict}">${x.id}</span>`}).join("");
  const category=document.querySelector("#category");[...new Set(data.map(x=>x.category))].forEach(c=>category.insertAdjacentHTML("beforeend",`<option>${c}</option>`));
  const search=document.querySelector("#search"),verdict=document.querySelector("#verdict"),rows=document.querySelector("#rows"),count=document.querySelector("#resultCount");
  const draw=()=>{const q=search.value.toLowerCase();const filtered=data.filter(x=>(category.value==="all"||x.category===category.value)&&(verdict.value==="all"||x.verdict===verdict.value)&&`${x.name} ${x.category} ${x.auth} ${x.access} ${x.surface}`.toLowerCase().includes(q));count.textContent=`SHOWING ${filtered.length} OF ${data.length} APPS`;rows.innerHTML=filtered.map(x=>`<tr><td><span class="app-name">${x.id}. ${x.name}</span><span class="desc">${x.description}</span></td><td>${x.auth}</td><td>${x.access}</td><td>${x.surface}${x.mcp?` <span class="pill">MCP</span>`:""}</td><td><span class="pill ${x.verdict==="Build now"?"good":x.verdict==="Needs outreach"?"warn":"bad"}">${x.verdict}</span></td><td><a class="evidence" href="${x.url}" target="_blank" rel="noreferrer">Official source ↗</a><span class="confidence">${x.confidence} confidence</span></td></tr>`).join("")||`<tr><td colspan="6">No matches.</td></tr>`};
  [search,category,verdict].forEach(el=>el.addEventListener(el===search?"input":"change",draw));document.querySelector("#reset").onclick=()=>{search.value="";category.value="all";verdict.value="all";draw()};draw();
  document.querySelector("#auditGrid").innerHTML=Object.entries(audit).map(([name,[status,note,evidence]])=>`<article class="audit-card ${status}"><span class="status">${status==="accepted"?"✓ ACCEPTED":"↺ CORRECTED"}</span><div><h3>${name}</h3><p>${note}</p><a class="audit-link" href="${evidence[0]}" target="_blank" rel="noreferrer">Check evidence ↗</a></div></article>`).join("");
}

load().then(render).catch(err=>{document.querySelector("#rows").innerHTML=`<tr><td colspan="6">${err.message}. Run this page through the local server described in README.md.</td></tr>`;console.error(err)});
