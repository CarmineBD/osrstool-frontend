## Summary

- add an `AnimatedProfitValue` primitive and reuse it across profit-heavy method detail, history, table, skilling, and landing views
- animate alert exits for username and admin notices, with focused coverage for the new alert presence behavior
- animate methods table column visibility changes and smooth the method variant selector detail reveal
- refresh the landing page trending cards to match the updated profit presentation and tighter visual hierarchy

## How to test

- `npm run lint`
- `npm test`
- `npm run build`

## Notes

- No business logic changes.
- `npm run lint` still reports the existing `react-refresh/only-export-components` warnings, but exits with code `0`
