# Research methodology

## Research question

For each application, determine what it does, how an integration authenticates, whether credentials are practically obtainable, which programmatic surfaces exist, and whether implementation can begin without provider coordination.

## Evidence hierarchy

Use evidence in this order:

1. Official developer and API references
2. Official authentication, access, partner, and marketplace documentation
3. Official pricing, plan-comparison, and product pages
4. Official help-center articles and release announcements
5. Reviewer-observed product screens, clearly labeled as observations

Third-party summaries may help locate a source but should not support a promoted claim when first-party evidence exists.

## Automated passes

The project supports four passes:

- OpenAI-assisted structured research
- Local Ollama extraction from fetched first-party text
- Deterministic single-page signal extraction
- Deterministic multi-page evidence discovery

All passes write or derive immutable run evidence before curation. Automated findings should prefer `unclear` over guessing.

## Human review

Review is required for weak evidence, contradictions, commercial gating, unreadable pages, and material product changes. A reviewer may accept the central claim or append a correction with direct evidence.

The human audit deliberately remains separate from the automated snapshot. This preserves provenance and makes corrections visible in the report.

## Interpretation rules

- Public documentation does not prove self-serve credential access.
- A paid API is not automatically blocked.
- An integration marketplace listing does not prove a general-purpose public API.
- REST, GraphQL, webhooks, event streams, SDKs, and MCP are distinct surfaces.
- A hosted MCP server and an API used to build an MCP server are distinct products.
- OAuth for end-user authorization and client-credentials OAuth for server access must not be conflated.
- “No MCP evidenced” is scoped to inspected pages and the snapshot date.

## Confidence

- `Verified`: a human-audit record supplies or confirms the rendered claim.
- `Medium`: the automated pass found readable, claim-level evidence without unresolved contradictions.
- `Low`: evidence is incomplete, inaccessible, weak, or contradictory.

Confidence concerns the evidence behind the row. It is not an assessment of product quality or vendor trustworthiness.

## Reproducibility

Run metadata and raw results live under `research/runs/`. The promoted snapshot records its source run and generation timestamp. `npm run check` verifies structural integrity but does not make live network requests; link freshness still requires periodic research and human review.
