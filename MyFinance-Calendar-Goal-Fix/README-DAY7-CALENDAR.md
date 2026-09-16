# MyFinance Day 7 — Calendar

Adds a monthly financial calendar on top of the working Day 6 build.

## Includes
- Previous / next / current month navigation
- Local-date-safe calendar rendering
- Daily income, expense and savings indicators
- Click any date to see its transactions
- Monthly income / expense / savings / net summary
- Light / dark mode using existing theme
- Profile dropdown with Calendar added to secondary navigation

## Supabase
No SQL migration is required. The page reads the existing `transactions` table using the logged-in user's RLS.

## Test
Login → profile → Calendar → switch months → click dates with transactions → verify daily details and monthly totals.
