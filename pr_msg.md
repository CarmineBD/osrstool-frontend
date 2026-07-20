## Summary

- add global theme infrastructure with persisted light/dark preference handling, DOM synchronization, and an early bootstrap script to prevent theme flashing on first paint
- define the dark semantic token palette so existing shared surfaces, cards, and method-detail theme tokens can inherit dark mode without per-component rewrites
- add a reusable header theme switch and strengthen test coverage and accessibility labels so theme and admin switches remain queryable and stable

## How to test

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run dev`
- open the app, toggle the theme from the header, and refresh the page to confirm the selected mode persists

## Notes

- no business logic changes beyond persisted theme preference handling and the accessibility label used by the skilling admin toggle test
