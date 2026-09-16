# MyFinance Day 9 — Profile + Settings

## Added
- `profile.html` — edit full name/mobile, view email, change password, currency/timezone.
- `settings.html` — appearance status, browser notification controls, helpful account links.
- `css/profile-settings.css`
- `js/profile.js`
- `js/settings.js`

## Database
No SQL migration required. Uses existing `profiles` columns: `full_name`, `mobile_number`, `email`, `currency_code`, `timezone`.

## Run
Replace the previous Day 8 folder with this package and serve it through a local web server.

## Test
1. Profile dropdown → My Profile → edit name/mobile → Save.
2. Settings → toggle theme from profile menu → theme remains consistent.
3. Profile → change password → sign out → use new password to login.
4. Settings → Enable Browser Alerts → confirm permission / test notification.
