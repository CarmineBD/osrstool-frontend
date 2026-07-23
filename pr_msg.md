## Summary

- remove the custom `manualChunks` function from the Vite build configuration
- fall back to Vite and Rollup default chunking behavior for production builds

## How to test

- `npm run lint`
- `CI=true npm test`
- `npm run build`

## Notes

- No business logic changes.
