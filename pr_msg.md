## Summary

- add a Vercel route that forwards `/api/*` requests to the Railway backend
- keep the filesystem and SPA fallback routes in place after the API proxy rule

## How to test

- `npm run lint`
- `CI=true npm test`
- `npm run build`

## Notes

- No business logic changes.
