## Summary

- switch shared tooltips to semantic popover surfaces so secondary helper copy keeps proper contrast
- restore the desktop "Not viable" divider in the collapsed variant selector and prevent horizontal overflow
- add extra collapsed spacing between variant items without changing the expanded selector layout

## How to test

- `npm run lint`
- `$env:CI='true'; npm test`
- `npm run build`

## Notes

- No business logic changes.
