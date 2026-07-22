## Summary

- add reusable variant sort metrics for profit, xp, and afk ordering
- cover the new variant ordering rules with targeted unit tests
- add sort controls to the method detail variant selector and show the active metric in each tab

## How to test

- `npm run lint`
- `$env:CI='true'; npm test`
- `npm run build`

## Notes

- No business logic changes.
