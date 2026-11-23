# Agent Instructions

These instructions apply to the entire repository.

## Goal

Maintain a trustworthy, evidence-backed catalog of 100 integrations. Prefer first-party documentation, preserve human review history, and keep the site runnable without a local LLM.

## Required runtime

- Node.js 20 or newer and npm.
- Install dependencies with `npm install` (or `npm ci` when a lockfile-controlled clean install is appropriate).
- Internet access is required only when refreshing external documentation.
- Do not require Ollama, a downloaded model, a GPU, or any other local inference service.

## Default agent workflow (no local LLM)

Use the deterministic evidence agent for routine research:

```sh
npm run research:rules -- --limit 10 --concurrency 6
```

Useful options are `--offset`, `--limit`, and `--concurrency`. For a deeper multi-page crawl, use:

```sh
npm run research:deep -- --limit 10 --pages 4 --concurrency 4
```

Both commands fetch the first-party seed URLs in `research/apps.json` and write immutable JSONL checkpoints under `research/runs/`. They do not need an LLM or an API key. Treat `unclear` as a valid result when the evidence is insufficient; never invent access, authentication, pricing, webhook, or MCP claims.

Do not use `npm run research:local` in automated or default workflows. That command is an optional developer convenience which depends on Ollama and is not part of the repository's required execution path.

## Optional hosted enrichment

`npm run research` may be used only when `OPENAI_API_KEY` is explicitly available. It uses the hosted OpenAI API and therefore still does not depend on a local LLM. `OPENAI_MODEL` may select the hosted model.

`COMPOSIO_API_KEY` and `COMPOSIO_MCP_URL` are optional. Missing Composio credentials must not prevent deterministic research, validation, review, or serving the site.

Never commit `.env`, API keys, access tokens, or credentials.

## Evidence and data rules

- Prefer canonical first-party developer documentation over blogs, search-result pages, mirrors, or aggregators.
- Keep each seed URL in `research/apps.json` on the correct provider domain and as close as possible to its authentication/API overview.
- Record uncertainty instead of inferring that public documentation means self-service or free access.
- Preserve `research/human-audit.json` as append-only review history. Do not delete or rewrite earlier audits to make automated output win.
- Human-audit corrections override automated findings in the rendered report.
- Do not manually edit generated `research/deep-findings.json` rows. Promote only a complete reviewed deep run.
- Do not promote partial or failed research runs.

## Review and promotion

Review a generated checkpoint interactively:

```sh
npm run review -- research/runs/<run>.jsonl
```

Promotion is allowed only after confirming the deep run contains exactly 100 unique apps, matches the seed app set, and has adequate claim-level first-party evidence:

```sh
npm run promote:deep
```

Promotion overwrites the generated snapshot, so inspect the candidate and working-tree diff first. Never promote merely because the command can run.

## Verification before handoff

Run all of the following after changing code or research data:

```sh
npm run check
node --check app.js
node --check agent/research-agent-rules.mjs
node --check agent/research-agent-deep.mjs
node --check agent/research-agent.mjs
node --check agent/review.mjs
node --check agent/promote-deep.mjs
node --check agent/validate-data.mjs
git diff --check
```

When changing URLs or fetch logic, also run a scoped `research:rules` checkpoint against the affected apps and confirm successful HTTP responses. A generated checkpoint is evidence for review, not permission to promote it.

For a site smoke test, run `npm run dev` and confirm that `/`, `/app.js`, `/research/apps.json`, `/research/human-audit.json`, and `/research/deep-findings.json` return successfully.

## Git hygiene

- Do not commit unless the user explicitly requests it.
- Do not include unrelated working-tree changes in a commit.
- Keep generated research checkpoints uncommitted unless the user explicitly asks to preserve a particular run.
- Summarize modified files, verification results, unresolved `unclear` findings, and whether anything was promoted.
