# MyFinance — Day 2

Day 2 features:
- Email/password login
- Self-service registration
- Continue with Google scaffold
- Google first-login mobile completion
- Forgot password
- Reset password
- Profile lookup
- Mobile number
- Profile dropdown
- Logout
- Light/dark mode
- Loading/error/success states
- Why 50/30/20 page
- Help/FAQ page
- Responsive layout

## Supabase configuration

1. Edit `js/supabase.js`.
2. Add the NEW MyFinance Production Project URL and publishable key.

## Google OAuth

In Supabase:
Authentication -> Providers -> Google -> enable Google.

Create a Google OAuth web client in Google Cloud Console and use the callback URL shown by Supabase.

In Supabase Authentication -> URL Configuration add your app URLs, for example:
- http://localhost:5500/auth-callback.html
- https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/auth-callback.html

Use the exact URLs for your actual environment.

## Email confirmation

If Confirm email is enabled:
- normal signup will create the Auth user
- the user confirms the email
- the email redirect returns to `auth-callback.html`
- the profile trigger creates the profile row

## Local testing

Use a local web server. Do not open files using `file://`.

Example:
python -m http.server 5500

Then open:
http://localhost:5500/

## Phase 2 note

Business features such as transactions, categories UI, goals, vehicles, analytics and reports are intentionally not included yet.
