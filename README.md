# Agent-toolkit opportunity map

A research-backed map of 100 applications across authentication, developer access, API surface, MCP availability, and practical buildability. Automated evidence collection is kept separate from manually verified corrections so stale product claims can be replaced without erasing the original crawl.

## Current snapshot

- 100 apps in 10 categories
- 100 deep-research findings with claim-level evidence
- 54 preserved human audits: 7 accepted and 47 corrected
- Snapshot date: 23 November 2026

The rendered report calculates verdict totals from the JSON at runtime. Do not copy those totals into documentation because commercial access, authentication, and MCP support change frequently.

## View the report

Node.js 22 or newer is recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by `serve`. The project has no compilation step and can be deployed as a static site from the repository root.

## Validate the maintained data

```bash
npm run check
```

The validator checks the 100-app/10-category invariant, unique app names, deep-finding coverage, audit membership, and HTTPS evidence URLs.

## Research workflows

Repository agents should follow [`AGENTS.md`](AGENTS.md). The supported default is the deterministic workflow below: it requires Node.js and internet access for documentation refreshes, but it does **not** require Ollama, a downloaded model, a GPU, or any local LLM. Copy `.env.example` to `.env` only when using an optional hosted service, and provide only the credentials needed by that workflow.

### Default agent pass (no local LLM)

```bash
npm run research:rules -- --limit 10 --concurrency 6
```

For deeper first-party evidence collection without an LLM:

```bash
npm run research:deep -- --limit 10 --pages 4 --concurrency 4
```

These workflows fetch the first-party seed URLs in `research/apps.json`, write immutable JSONL checkpoints under `research/runs/`, and accept uncertainty instead of inventing unsupported claims. Optional `COMPOSIO_API_KEY` discovery must not prevent either workflow from running.

### OpenAI-assisted pass

```bash
npm run research -- --limit 10
npm run review
```

This writes immutable JSONL checkpoints under `research/runs/`. If `COMPOSIO_API_KEY` is configured, the agent also inspects the connected Composio tool catalog. A scoped `COMPOSIO_MCP_URL` can expose research tools to the model.

### Optional local-model pass

```bash
npm run research:local -- --limit 10
```

This optional developer-only workflow uses the configured Ollama model and only the text fetched from the supplied first-party page. It is not required for automated agents, validation, review, promotion, or serving the site.

### Multi-page evidence pass

```bash
npm run research:deep -- --pages 4 --concurrency 4
npm run review
npm run promote:deep
```

The deep workflow follows relevant first-party developer, authentication, pricing, partner, webhook, GraphQL, and MCP links. Promotion refuses incomplete runs and replaces `research/deep-findings.json` only when all 100 apps are present. Human corrections remain separate in `research/human-audit.json` and override the automated row in the UI.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `Build now` | A documented integration surface and practical credential path are available without a bespoke commercial approval process. Payment alone does not automatically prevent this verdict. |
| `Needs outreach` | The integration exists, but a contract, enterprise license, admin enablement, partner review, or provider approval is required. |
| `Blocked` | No usable programmatic surface or credential path was evidenced for the intended integration. |
| `Unclear` | Available first-party evidence is insufficient or contradictory; research must continue before roadmap use. |

An application with a paid, contract-gated API is normally `Needs outreach`, not `Blocked`. A public documentation page is not by itself proof of self-serve credentials.

## Evidence and confidence

- Prefer current first-party developer, help, pricing, and product pages.
- Every promoted automated claim should have a claim-level URL.
- `Verified` in the UI means a human-audit override exists.
- `High`, `Medium`, and `Low` describe the automated finding's evidence quality, not the provider's reliability.
- “Not evidenced” means the inspected pages did not prove the feature; it is not a universal claim that the feature does not exist.
- Product access, API access, marketplace publication, and MCP access must be evaluated separately.

## Repository map

- `index.html`, `styles.css`, `app.js` — static report
- `research/apps.json` — canonical 100-app input list and starting URLs
- `research/deep-findings.json` — promoted automated evidence snapshot
- `research/human-audit.json` — append-only reviewed corrections and overrides
- `research/runs/` — immutable JSONL research and review checkpoints
- `agent/research-agent*.mjs` — OpenAI, local-model, deterministic, and deep research workflows
- `agent/review.mjs` — terminal review queue
- `agent/promote-deep.mjs` — complete-run promotion guard
- `agent/validate-data.mjs` — maintained-data integrity checks
- `docs/DATA-MODEL.md` — field definitions and precedence rules
- `docs/MAINTENANCE.md` — update and stale-evidence procedure
- `docs/RESEARCH-METHODOLOGY.md` — research and review methodology

## Important limitation

This is a dated research snapshot, not a guarantee of current provider behavior. Recheck first-party evidence before implementation or commercial commitment, especially for pricing, trials, partner programs, enterprise licensing, OAuth registration, rate limits, and recently launched MCP products.
