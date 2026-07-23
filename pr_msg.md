## Summary

- add dedicated `.env.remote-tst.example` and `.env.remote-prod.example` templates for local frontend runs against deployed backends
- clarify the local proxy defaults and optional query settings in `.env.example`
- expand the README with environment selection steps, variable guidance, and Vercel TST/PRO setup recipes

## How to test

- `npm run lint`
- `npm test`
- `npm run build`
- Copy any of the provided `.env*.example` files to `.env` and verify the expected backend target before running `npm run dev`

## Notes

- No business logic changes.
