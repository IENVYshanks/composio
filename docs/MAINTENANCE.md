# Maintenance guide

Use this procedure when pricing, authentication, API access, MCP support, or product positioning changes.

## Update one app

1. Check current first-party developer, help, pricing, product, and partner pages.
2. Separate product availability from API availability and marketplace publication.
3. Record the correction as a new object in `research/human-audit.json`.
4. Include direct evidence URLs and the review date.
5. Add only the override fields that improve the rendered row.
6. Run `npm run check` and inspect `git diff --check`.

Do not edit `research/deep-findings.json` by hand to hide an automated miss. The audit layer exists to preserve that history.

## Choose the verdict

- Use `Build now` when developers can obtain credentials through a practical documented route. A paid self-serve plan may still qualify.
- Use `Needs outreach` when a contract, sales conversation, account administrator, partner approval, enterprise license, or provider enablement is required.
- Use `Blocked` when no usable programmatic surface or credential path is evidenced for the intended use.
- Use `Unclear` when evidence is missing, unreadable, stale, or contradictory.

## Detect stale evidence

Prioritize rechecking rows when:

- the evidence page returns 404, 403, or redirects to an unrelated page;
- a source is older than a major product or API launch;
- pricing, trial length, or plan names are copied into an override;
- the row says MCP is unavailable or undocumented;
- OAuth app-registration rules or marketplace programs have changed;
- the provider renamed, merged, or split the product;
- a human screenshot conflicts with the public page.

Treat a screenshot as useful observed evidence, but note conflicts with current first-party documentation rather than silently choosing one.

## Refresh the automated snapshot

```bash
npm run research:deep -- --pages 4 --concurrency 4
npm run review
npm run promote:deep
npm run check
```

`promote:deep` selects the latest complete deep-run checkpoint and refuses fewer than 100 rows. Review files remain immutable checkpoints; human-audit overrides continue to take precedence.

## Documentation hygiene

- Keep volatile totals dynamic in the UI when possible.
- Do not maintain app lists in JavaScript when the JSON already supplies them.
- Use UTF-8 punctuation directly; reject mojibake such as `â€™`, `â†’`, or `Â·`.
- Update the snapshot date only when the maintained dataset is actually reviewed or regenerated.
- Link to this guide instead of duplicating the procedure in multiple files.

## Release checklist

```bash
npm run check
git diff --check
git status --short
```

Then confirm that the report loads through `npm run dev`, filters work, evidence links point to first-party pages, and audit totals match `research/human-audit.json`.
