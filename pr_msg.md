## Summary

- add forgot password and reset password routes, including a recovery entry point from the login form
- extend the auth provider with password reset requests, password updates, and recovery-session tracking for Supabase recovery links
- add critical route coverage and test helpers for the password recovery flow

## How to test

- `npm run lint`
- `$env:CI='true'; npm test`
- `npm run build`

## Notes

- The reset flow expects Supabase recovery emails to redirect users to `/reset-password`.
