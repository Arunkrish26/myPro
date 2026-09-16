# MyFinance — Analytics Page

This package adds a separate Analytics page on top of the working Day 6 Reports build.

## What it adds
- Separate `analytics.html` page
- Animated expense category doughnut chart
- Animated income category doughnut chart
- Needs vs Wants vs Savings bar chart
- Monthly money-flow bar chart
- Period filters matching Reports
- Light/dark theme-aware chart colors
- Summary statistics and percentage insights
- Dashboard Quick Access link to Analytics
- Analytics link added to logged-in navigation

## Database
No new SQL is required. Analytics reads the existing `transactions` table and related categories/vehicles using the current RLS-protected Supabase session.

Previous balance is intentionally not included in 50/30/20 percentages.

## Chart library
The page uses Chart.js from a CDN. This is a JavaScript charting library only; the application remains HTML + CSS + Vanilla JavaScript.

## Test
1. Login.
2. Open Analytics from navigation or Dashboard Quick Access.
3. Test Today, Last 7 Days, Last 30 Days, This Month and Custom Range.
4. Verify expense and income category charts match Transactions/Reports.
5. Verify Needs/Wants/Savings totals.
6. Verify monthly chart for longer periods such as Last 30 Days or This Year.
7. Switch light/dark mode and confirm chart text/axes/legend stay readable.
