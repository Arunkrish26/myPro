# MyFinance Day 8 — EMI, Loans, Reminders & UI QA

## Supabase migration
Run `database/day8_emi_reminders.sql` in Supabase Dashboard -> SQL Editor.

## New page
- `reminders.html`
- `css/reminders.css`
- `js/reminders.js`
- `js/emi-utils.js`

## Calendar changes
- `calendar.html` includes `+ Track EMI / Loan`.
- Active EMI/loan schedules are shown on the calendar by monthly due date.
- Future dates remain disabled for selection.
- Scheduled EMI does not alter transaction totals.
- Reminders page shows upcoming unpaid occurrences and a 2-day reminder window.
- Optional browser alerts can be enabled from the Reminders page.

## Accounting rule
Do not let a scheduled EMI automatically become an expense. Record the actual payment in Transactions. Then mark the reminder as paid. This avoids double counting.


## Day 8 behavior clarification
- Calendar shows a 📌 marker on every date that has a scheduled EMI/loan payment, including future dates.
- Future dates cannot be selected for transaction activity, but users can navigate to future months when an active EMI/loan schedule exists so scheduled dates remain visible.
- Reminder page shows the next 30 days of unpaid occurrences.
- An occurrence can be marked paid up to 30 days before its due date. Marking it paid stops that occurrence from appearing as unpaid and prevents duplicate payment rows.
- Scheduled EMI/loan rows do not automatically create expenses; actual payment is still recorded as a normal Expense transaction.
