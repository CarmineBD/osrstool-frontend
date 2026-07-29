## Summary

- Translate historical changelog entries, metadata, and changelog screens to English.
- Update landing, account, skilling, footer, and SEO copy so user-facing text is consistently English.
- Translate wiki categories and explanations to English while preserving legacy Spanish wiki category slugs.
- Refresh critical route tests to match the updated English copy.

## User-facing changelog

- The landing page, changelog, wiki, account screens, and skilling views now use consistent English copy.
- Older wiki links that used Spanish category slugs still open the correct content.

## How to test

- `npm run lint`
- `npm test`
- `npm run build`
- Open `/`, `/changelog`, `/changelog/2026-02-22-v0.3.0`, `/account`, and `/skilling` and verify the visible copy is in English.
- Open `/wiki/metrics` and `/wiki/usage`, then confirm `/wiki/metricas` and `/wiki/uso` still resolve to the same categories.

## Notes

- No business logic changes beyond preserving legacy wiki category aliases.
