## Summary

- Add a Google OAuth sign-in entrypoint to the login page.
- Preserve safe post-login redirects when the Google auth flow returns to `/login`.
- Cover the Google auth provider integration and login page states with automated tests.

## User-facing changelog

- You can now sign in from the login page with your Google account.
- Login now returns you to the page you were trying to access after Google sign-in completes.

## How to test

- `npm run lint`
- `npm test`
- `npm run build`
- Open `/login` and confirm the `Continue with Google` button appears above the email and password form.
- Start from a protected route, continue with Google, and confirm the app returns you to the original page after authentication.
- Simulate a Google OAuth startup failure and confirm the login page shows the error without leaving the screen.

## Notes

- The PR targets `develop` and is intended for TST deployment.
