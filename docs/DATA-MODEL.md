# Data model

The report combines three layers. Each layer has a different purpose and update policy.

## `research/apps.json`

The canonical scope. It contains 10 category objects, each with an `apps` array of `[name, starting_url]` pairs. App names are stable identifiers across all research files.

The URL is a research starting point, not necessarily the best final evidence page. Changing it affects future crawls but does not rewrite existing findings.

## `research/deep-findings.json`

The promoted automated snapshot.

| Field | Meaning |
| --- | --- |
| `generated_at` | UTC timestamp for the promoted run. |
| `source_run` | JSONL checkpoint promoted into this file. |
| `method` | Research method used for the snapshot. |
| `rows` | Exactly one automated finding per canonical app. |

Important row fields:

- `auth`: authentication mechanisms explicitly evidenced.
- `access`: normalized credential/access status such as `self-serve`, `approval-gated`, or `unclear`.
- `api_surface`: evidenced REST, GraphQL, MCP, or webhook surfaces.
- `verdict`: `build-now`, `needs-outreach`, `blocked`, or `unclear`.
- `blocker`: reason the row is gated or unresolved.
- `evidence`: claim/URL pairs, not a generic bibliography.
- `confidence`: automated evidence quality.
- `needs_human`: whether review is required.
- `pages`: fetch outcome for each inspected page.
- `contradiction`: whether conflicting access signals were found.

## `research/human-audit.json`

The curated correction layer. Each object identifies an app and records the automated claim, reviewed finding, decision, evidence, and review date.

Optional override fields are consumed by the UI:

- `description_override`
- `access_override`
- `auth_override`
- `surface_override`

`decision` overrides the automated verdict. The audit record does not mutate the original automated finding.

## UI precedence

For each app, `app.js` applies values in this order:

1. Human-audit override, when present.
2. Promoted deep finding.
3. Canonical starting URL or category fallback.

Any app with a human audit is labeled `Verified`; other confidence labels come from the deep finding.

## Invariants

`npm run check` enforces:

- 10 categories and 100 canonical apps
- unique app names
- valid HTTPS starting and audit evidence URLs
- exactly 100 unique deep findings
- every audit refers to a canonical app
- every audit has evidence

Run validation after every data or documentation change that mentions snapshot counts.
