# Agent-toolkit opportunity map

A self-contained case study for Composio's AI Product Ops take-home. It maps 100 requested apps across authentication, developer access, API surface, MCP availability, and buildability.

## View the report

Run locally:

```bash
npm install
npm run dev
```

The report has no build step. Deploy the repository root to GitHub Pages, Netlify, or Vercel as a static site.

## Run the research agent

Node 22.22.3+ is required by the current Composio TypeScript SDK.

```bash
cp .env.example .env
npm install
npm run research -- --limit 10
npm run review
```

No OpenAI credits? Use the local Ollama fallback (Ollama must be running):

```bash
npm run research:local -- --limit 10
```

The local workflow fetches each supplied first-party documentation URL, extracts structured findings with the configured local model, and flags unreadable or insufficient pages for human review. It does not claim that Composio supplied browser tools when the connected project exposes none.

For a no-LLM, no-credit evidence pass:

```bash
npm run research:rules -- --concurrency 6
```

This deterministic agent fetches all first-party URLs, records auditable auth/API/MCP/access signals, and sends weak or contradictory rows to the same human-review queue. It intentionally prefers `unclear` over guessing.

For the submission-grade multi-page pass:

```bash
npm run research:deep -- --pages 4 --concurrency 4
```

The deep agent follows relevant first-party authentication, API-reference, access/partner, pricing, webhook, GraphQL, and MCP links from each supplied page. It records page-level fetch outcomes, claim-level evidence URLs, and contradictions before human review.

The agent reads `research/apps.json`, asks an LLM for structured findings, uses Composio's SDK to discover available research tools, and can use a scoped Composio MCP session when `COMPOSIO_MCP_URL` is supplied. It writes auditable JSONL checkpoints to `research/runs/`. It never overwrites the curated report automatically: a human must review evidence before promotion.

`npm run review` opens the latest run's flagged records in an interactive terminal queue. A reviewer can accept, correct, reject, or defer each finding. Decisions are appended to a separate `*.reviewed.jsonl` file so the original model output remains immutable. The curated audit sample is preserved in `research/human-audit.json` with the agent claim, human finding, decision, evidence, and review date.

## Verification philosophy

- Every row links to a first-party docs, developer, or product page.
- `Verified` means the claim was manually checked against that evidence during the sample audit.
- `High`, `Medium`, and `Low` describe confidence outside the audit sample.
- “Gated” is a valid product finding—not a research failure.
- The page exposes the agent's misses and the human corrections.

## Structure

- `index.html`, `styles.css`, `app.js` — static case study
- `research/apps.json` — canonical 100-app input set
- `agent/research-agent.mjs` — checkpointed research workflow
- `agent/validate-data.mjs` — dataset integrity checks

Research snapshot: **23 November 2026**. Product access and APIs change; re-run the workflow before operational use.
