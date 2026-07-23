## Summary

- add a `vercel.json` configuration that preserves filesystem handling first and rewrites unmatched routes to `index.html`
- ensure client-side routes resolve correctly when the frontend is deployed on Vercel as a single-page application

## How to test

- `npm run lint`
- `CI=true npm test`
- `npm run build`

## Notes

- No business logic changes.
