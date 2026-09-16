# MyFinance — Day 3

Day 3 adds the finance tracking foundation on top of the tested Day 2 authentication.

## Included
- Dashboard with total balance, monthly income, expenses, savings and 50/30/20 progress.
- Quick Add flow for Expense, Income and Savings.
- Transactions page with create, edit, delete, search and type filter.
- Expense Need/Want is transaction-specific.
- Savings is a separate transaction type and does not count as an expense.
- Dynamic category management for expense, income and savings categories.
- System categories are read-only; user categories can be created, edited, activated/deactivated and safely deleted when unused.
- Consistent Poppins typography.
- Every form label is intentionally larger than its placeholder text.
- Responsive desktop/tablet/mobile layout.

## Supabase SQL
Run `database/day3_previous_balance_migration.sql` in the Supabase SQL Editor once. This adds an optional `previous_balance` field to `monthly_budgets` with a default of 0, so existing data and behavior remain unchanged.

### Previous Balance
The Dashboard Total Balance can optionally include a carry-forward amount from a previous month. Click **Set previous balance** on the Total Balance card, enter the amount (or leave it blank/clear to use 0), and save. The value is stored for the current month in `monthly_budgets.previous_balance`.

Current month Total Balance = Previous Balance + Income − Expenses − recorded Savings allocations.

## Testing order
1. Login.
2. Open Dashboard and confirm profile loads.
3. Dashboard → Add Transaction → add an Expense.
4. Add an Income.
5. Add a Savings transaction such as Gold Chit.
6. Verify Dashboard totals change immediately after refresh/navigation.
7. Open Transactions → edit and delete a transaction.
8. Open Categories → create custom Expense, Income and Savings categories.
9. Deactivate a custom category and confirm it disappears from new transaction choices.
10. Try deleting a used category; the app should tell you to deactivate it instead.
11. Test light/dark mode on Dashboard, Transactions and Categories.
12. Test on narrow mobile width and confirm buttons/forms remain accessible.

## Important accounting behavior
- Expense: budget_type is `needs` or `wants`.
- Income: budget_type is null.
- Savings: budget_type is null.
- Dashboard monthly Savings = income minus expenses.
- Dashboard Total Balance = income minus expenses minus recorded savings allocations.
- Goal contributions will be implemented in the Goals phase and are intentionally not duplicated here.


### Final Day 3 UX decisions
- Dashboard owns the single bottom-right `+` quick action.
- Transactions is now an input-only page reached from the Dashboard `+`; Expense is selected by default.
- Transaction history is intentionally not shown on the transaction input page.
- Dashboard summary cards use two columns on small screens.
- 50/30/20 cards use soft semantic pastel colors.
- Poppins remains the global font and placeholders stay smaller than labels.
- New Supabase frontend configuration uses the supplied MyFinance production project credentials.
