# MyFinance — Day 5: Vehicles

Day 5 adds vehicle management and vehicle expense reporting while preserving the existing Day 1–4 flows.

## Included
- Add/edit bike, car or other vehicles.
- Vehicle name, brand, model and optional registration number.
- View vehicle expense details and history.
- Link an expense transaction to an optional vehicle.
- Vehicle filter ranges: All Time, This Month, Last Month, This Year, Custom.
- Category-wise vehicle spending based on actual linked transactions.
- No duplicate transaction is created for vehicle reporting; the same transaction is shown in main history and vehicle history.
- Safe vehicle deletion: a vehicle with linked transactions is protected from deletion so history is not silently detached.
- Light/dark mode, Poppins and existing theme/toast/profile patterns preserved.

## Supabase
No table migration is required because `vehicles` already exists and `transactions.vehicle_id` already exists.
Optional: run `database/day5_vehicle_categories.sql` in Supabase Dashboard > SQL Editor to add standard vehicle expense categories. Existing users can also create their own categories.

## Test
1. Open Vehicles and add a bike.
2. Add a car.
3. Edit a vehicle.
4. Go to Transactions. Choose Expense and confirm Vehicle is available.
5. Link Petrol / Maintenance / Service etc. expense to a vehicle and save.
6. Confirm the transaction appears once in main Transaction History.
7. Open Vehicle > View Expenses and confirm the same transaction appears.
8. Test All Time / This Month / Last Month / This Year / Custom.
9. Confirm category-wise totals change with the filter.
10. Try deleting a vehicle with linked expenses; it should be blocked.
11. Test light/dark mode and mobile layout.
