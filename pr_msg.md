## Summary

- move like and unlike actions from method-level controls to individual variants in the method detail flow
- update optimistic like handling and API integration to target variant endpoints and keep detail state in sync
- show method list likes as aggregated variant totals, including a fallback when the backend omits the method-level aggregate
- add API and critical flow coverage for variant likes and aggregated list counts

## How to test

- `npm run lint`
- `CI=true npm test`
- `npm run build`

## Notes

- `npm run lint` still reports the existing `react-refresh/only-export-components` warnings in shared files, but exits with code `0`
