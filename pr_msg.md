## Summary

- animate the method variant rail so reordered entries transition smoothly and the expanded state stays open while the rail, sort menu, or info panel is active
- show the current runtime environment in the main navigation for local and TST deployments
- add automated coverage for runtime environment label detection

## How to test

- `npm run lint`
- `npm test`
- `npm run build`
- Open a method detail page, change the variant sort mode, and verify the variant buttons animate into their new positions
- Hover the desktop variant rail, open the sort menu, and open the not viable info popover to confirm the rail remains expanded while each control is active
- Run the app locally and confirm the header shows `(LOCAL)`; deploy or simulate a TST hostname and confirm the header shows `(TST)`

## Notes

- The PR targets `develop` and is intended for the TST deployment flow.
