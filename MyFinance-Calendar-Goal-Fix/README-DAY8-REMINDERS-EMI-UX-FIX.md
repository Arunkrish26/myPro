# Day 8 Fix

- Mark as Paid now checks the occurrence first and inserts it when needed; it supports up to 10 days early.
- Calendar shows financial activity/details first and the EMI/Loan schedule section after the selected-date details.
- Browser alerts use the service-worker notification API when permission is granted.
- The Enable browser alerts button sends a test notification immediately, so permission/browser issues are visible.
- Notifications still require HTTPS (or localhost). True background alerts while the site is completely closed require a push subscription + server/backend; this package does not claim otherwise.

Run `database/day8_emi_mark_paid_fix.sql` in Supabase SQL Editor once if your EMI payment table does not already have the unique `(emi_id, due_date)` index.
