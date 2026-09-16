# MyFinance — Day 4: Goals

Day 4 adds a complete financial Goals experience using the existing Supabase `goals` and `goal_contributions` tables.

## Included

- Create goals with name, target amount, target date and description.
- View target, saved, remaining and progress percentage.
- Add contributions with amount, date and note.
- Contribution history per goal.
- Edit and safely delete goals.
- Goal status: In progress, Completed, Past target date.
- Dashboard Goals quick access and Goals navigation link.
- Light/dark mode compatible with Day 3 theme system.
- Poppins typography and smaller placeholders than labels.
- Goal contributions are stored separately and do not create duplicate expenses.

## Supabase SQL

No new SQL migration is required. This phase uses the existing `goals` and `goal_contributions` tables created during the foundation phase.

## Test

1. Open `goals.html` while logged in.
2. Create a goal.
3. Confirm the goal card shows Target / Saved / Remaining / Progress.
4. Add a contribution.
5. Confirm Saved, Remaining and Progress update.
6. Open History and confirm the contribution is listed.
7. Edit the goal.
8. Delete the goal and confirm both the goal and its contributions are removed.
9. Refresh and confirm data persists.
10. Test the page in light and dark mode.
