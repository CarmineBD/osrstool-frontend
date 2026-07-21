## Summary

- add a filters switch on the methods search page to let users enable or ignore username-based stat filtering
- keep the new switch enabled by default when a username is present and disable it with concise guidance when no username is available
- extend critical coverage for the new filter behavior, including disabled and toggle-on/off states

## How to test

- `npm run lint`
- `$env:CI='true'; npm test`
- `npm run build`

## Notes

- This change updates methods list filtering behavior when a username is present.
