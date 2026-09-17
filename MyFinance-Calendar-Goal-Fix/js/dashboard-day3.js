import { sb } from "./supabase.js";
import { appUrl, setupTheme, setupAppMenu, setupProfileMenu, loadProfileUI, requireUser, formatCurrency, formatDate, monthBounds, transactionIcon, transactionClass, escapeHtml, showToast, friendlySupabaseError } from "./day3-shared.js";

const loader = document.getElementById("pageLoader");
const showLoader = () => loader?.classList.remove("hidden");
const hideLoader = () => loader?.classList.add("hidden");

// function monthStartEnd() {
//     // return monthBounds(new Date());
//     return monthBounds(new Date("2026-10-01"));
// }
function monthStartEnd() {
    const testDate = new Date(2026, 9, 1);

    console.log("TEST DATE:", testDate);
    console.log("MONTH BOUNDS:", monthBounds(testDate));

    return monthBounds(testDate);
}
function currentMonthKey() {
  return monthStartEnd().start;
}

// async function fetchMonthlyBudget(userId) {
//   const { data, error } = await sb.from("monthly_budgets")
//     .select("id,month,previous_balance")
//     .eq("user_id", userId)
//     .eq("month", currentMonthKey())
//     .maybeSingle();
//   if (error) throw error;
//   return data || { id: null, month: currentMonthKey(), previous_balance: 0 };
// }
async function fetchMonthlyBudget(userId) {
  const currentMonth = currentMonthKey();

  // First check whether the current month already has a saved previous balance
  const { data: currentBudget, error: currentError } = await sb.from("monthly_budgets")
    .select("id,month,previous_balance")
    .eq("user_id", userId)
    .eq("month", currentMonth)
    .maybeSingle();

  if (currentError) throw currentError;

  // If current month already has a previous balance, use it as it is.
  // This preserves the existing Set Balance functionality.
  if (currentBudget) {
    return currentBudget;
  }

  // Current month has no previous balance.
  // Find the latest previous month's budget.
  const { data: previousBudget, error: previousError } = await sb.from("monthly_budgets")
    .select("id,month,previous_balance")
    .eq("user_id", userId)
    .lt("month", currentMonth)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) throw previousError;

  if (!previousBudget) {
    return {
      id: null,
      month: currentMonth,
      previous_balance: 0
    };
  }

  // Calculate the previous month's closing balance
  const previousMonthStart = new Date(`${previousBudget.month}T00:00:00`);
  const previousMonthEnd = new Date(previousMonthStart);
  previousMonthEnd.setMonth(previousMonthEnd.getMonth() + 1);

  const previousStart = previousBudget.month;
  const previousEnd = previousMonthEnd.toISOString().slice(0, 10);

  const { data: previousTransactions, error: transactionError } = await sb.from("transactions")
    .select("transaction_type, amount")
    .eq("user_id", userId)
    .gte("transaction_date", previousStart)
    .lt("transaction_date", previousEnd);

  if (transactionError) throw transactionError;

  const previousIncome = amountFor(previousTransactions || [], "income");
  const previousExpenses = amountFor(previousTransactions || [], "expense");
  const previousSavingsTransactions = amountFor(previousTransactions || [], "savings");

  const { data: previousGoalContributions, error: goalError } = await sb.from("goal_contributions")
    .select("amount")
    .eq("user_id", userId)
    .gte("contribution_date", previousStart)
    .lt("contribution_date", previousEnd);

  if (goalError) throw goalError;

  const previousGoalTotal = (previousGoalContributions || [])
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const previousSavings = previousIncome - previousExpenses;

  const closingBalance =
    Math.max(0, Number(previousBudget.previous_balance || 0))
    + previousSavings
    - previousSavingsTransactions
    - previousGoalTotal;

  return {
    id: null,
    month: currentMonth,
    previous_balance: closingBalance
  };
}
async function fetchMonthGoalContributions(userId) {
  const bounds = monthStartEnd();
  const { data, error } = await sb.from("goal_contributions")
    .select("amount, contribution_date")
    .eq("user_id", userId)
    .gte("contribution_date", bounds.start)
    .lt("contribution_date", bounds.endExclusive);
  if (error) throw error;
  return data || [];
}

async function fetchMonthTransactions(userId) {
  const bounds = monthStartEnd();
  const { data, error } = await sb.from("transactions")
    .select("id, transaction_type, amount, category_id, transaction_date, description, budget_type, categories(name)")
    .eq("user_id", userId)
    .gte("transaction_date", bounds.start)
    .lt("transaction_date", bounds.endExclusive)
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchRecent(userId) {
  const { data, error } = await sb.from("transactions")
    .select("id, transaction_type, amount, transaction_date, description, budget_type, categories(name)")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(8);
  if (error) throw error;
  return data || [];
}

function amountFor(rows, type) {
  return rows.filter(x => x.transaction_type === type).reduce((sum, x) => sum + Number(x.amount || 0), 0);
}

function expenseByBudget(rows, budgetType) {
  return rows.filter(x => x.transaction_type === "expense" && x.budget_type === budgetType).reduce((sum, x) => sum + Number(x.amount || 0), 0);
}

function setProgress(id, textId, percent) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  document.getElementById(id).style.width = `${safe}%`;
  document.getElementById(textId).textContent = `${Math.round(Number(percent) || 0)}%`;
}

function renderRecent(rows, currency) {
  const target = document.getElementById("recentTransactions");
  if (!rows.length) {
    target.innerHTML = `<div class="empty-state"><strong>No transactions yet</strong>Add your first income or expense to see it here.</div>`;
    return;
  }
  target.innerHTML = rows.map(row => {
    const type = row.transaction_type;
    const label = row.description?.trim() || row.categories?.name || (type === "income" ? "Income" : type === "savings" ? "Savings" : "Expense");
    const prefix = type === "income" ? "+" : type === "savings" ? "↗" : "−";
    return `<div class="transaction-row"><div class="tx-icon icon-${type}">${transactionIcon(type)}</div><div class="tx-main"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(formatDate(row.transaction_date))} · ${escapeHtml(row.categories?.name || "Uncategorized")}</span></div><div class="tx-amount ${transactionClass(type)}">${prefix}${escapeHtml(formatCurrency(row.amount, currency))}</div></div>`;
  }).join("");
}

async function loadDashboard() {
  showLoader();
  try {
    const { user, currency } = await loadProfileUI();
    const [monthRows, recentRows, monthlyBudget, goalContributions] = await Promise.all([fetchMonthTransactions(user.id), fetchRecent(user.id), fetchMonthlyBudget(user.id), fetchMonthGoalContributions(user.id)]);
    const income = amountFor(monthRows, "income");
    const expenses = amountFor(monthRows, "expense");
    const savingsTransactions = amountFor(monthRows, "savings");
    const goalContributionTotal = goalContributions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const savings = income - expenses;
    const previousBalance = Math.max(0, Number(monthlyBudget?.previous_balance || 0));
    const balance = previousBalance + savings - savingsTransactions - goalContributionTotal;

    document.getElementById("totalBalance").textContent = formatCurrency(balance, currency);
    const balanceNote = document.getElementById("balanceNote");
    if (balanceNote) {
      const balanceParts = [];
      if (previousBalance > 0) balanceParts.push(`previous balance ${formatCurrency(previousBalance, currency)}`);
      if (goalContributionTotal > 0) balanceParts.push(`goal contributions ${formatCurrency(goalContributionTotal, currency)}`);
      balanceNote.textContent = balanceParts.length
        ? ` ${balanceParts.join(" · ")}.`
        : "No previous balance or goal contribution adjustments for this month.";
    }
    document.getElementById("monthlyIncome").textContent = formatCurrency(income, currency);
    document.getElementById("monthlyExpenses").textContent = formatCurrency(expenses, currency);
    document.getElementById("monthlySavings").textContent = formatCurrency(savings, currency);
    document.getElementById("budgetIncomeLabel").textContent = `Income: ${formatCurrency(income, currency)}`;

    const needs = expenseByBudget(monthRows, "needs");
    const wants = expenseByBudget(monthRows, "wants");
    const needTarget = income * 0.50;
    const wantTarget = income * 0.30;
    const savingTarget = income * 0.20;
    setProgress("needsProgress", "needsProgressText", needTarget ? (needs / needTarget) * 100 : 0);
    setProgress("wantsProgress", "wantsProgressText", wantTarget ? (wants / wantTarget) * 100 : 0);
    setProgress("savingsProgress", "savingsProgressText", savingTarget ? (savings / savingTarget) * 100 : 0);
    document.getElementById("budgetHelp").textContent = income > 0
        ? `Needs: ${formatCurrency(needs, currency)} ---- Wants: ${formatCurrency(wants, currency)} --- Savings: ${formatCurrency(savings, currency)}.       Use this as a guide, not a strict limit.`
      : "Add income for this month to calculate your 50/30/20 guide.";

    renderRecent(recentRows, currency);
  } catch (error) {
    if (String(error?.message) === "AUTH_REQUIRED") return;
    console.error(error);
    showToast(friendlySupabaseError(error), "error");
  } finally {
    hideLoader();
  }
}

async function openPreviousBalanceModal() {
  const modal = document.getElementById("previousBalanceModal");
  if (!modal) return;
  try {
    showLoader();
    const { user } = await loadProfileUI();
    const monthlyBudget = await fetchMonthlyBudget(user.id);
    document.getElementById("previousBalanceInput").value = Number(monthlyBudget.previous_balance || 0) || "";
    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("previousBalanceInput")?.focus(), 50);
  } catch (error) {
    console.error(error);
    showToast(friendlySupabaseError(error), "error");
  } finally {
    hideLoader();
  }
}

function closePreviousBalanceModal() {
  document.getElementById("previousBalanceModal")?.classList.add("hidden");
}

async function savePreviousBalance() {
  const input = document.getElementById("previousBalanceInput");
  const amount = input?.value === "" ? 0 : Number(input?.value);
  if (!Number.isFinite(amount) || amount < 0) {
    showToast("Previous balance must be 0 or more.", "warning");
    input?.focus();
    return;
  }

  const button = document.getElementById("previousBalanceSave");
  button.disabled = true;
  try {
    const { user } = await loadProfileUI();
    showLoader();
    const payload = { user_id: user.id, month: currentMonthKey(), previous_balance: amount };
    const { error } = await sb.from("monthly_budgets").upsert(payload, { onConflict: "user_id,month" });
    if (error) throw error;
    closePreviousBalanceModal();
    showToast(amount > 0 ? "Previous balance saved." : "Previous balance cleared.", amount > 0 ? "success" : "info");
    await loadDashboard();
  } catch (error) {
    console.error(error);
    showToast(friendlySupabaseError(error), "error");
  } finally {
    button.disabled = false;
    hideLoader();
  }
}

setupAppMenu(); setupTheme();
setupProfileMenu();
document.getElementById("floatingDashboardAdd")?.addEventListener("click", () => {
  window.location.href = appUrl("transactions.html");
});
document.getElementById("previousBalanceButton")?.addEventListener("click", openPreviousBalanceModal);
document.getElementById("previousBalanceClose")?.addEventListener("click", closePreviousBalanceModal);
document.getElementById("previousBalanceClear")?.addEventListener("click", () => {
  const input = document.getElementById("previousBalanceInput");
  if (input) input.value = "";
  input?.focus();
});
document.getElementById("previousBalanceSave")?.addEventListener("click", savePreviousBalance);
document.getElementById("previousBalanceModal")?.addEventListener("click", event => {
  if (event.target.id === "previousBalanceModal") closePreviousBalanceModal();
});
sb.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_OUT" || !session) window.location.replace(appUrl("index.html")); });
loadDashboard();
