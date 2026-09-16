import { sb } from "./supabase.js";
import {
  appUrl, setupTheme, setupAppMenu, setupProfileMenu,
  formatCurrency, formatDate, localDateInputValue,
  monthBounds, startOfThisWeek, transactionClass,
  escapeHtml, showToast, friendlySupabaseError
} from "./day3-shared.js";

const loader = document.getElementById("pageLoader");
const state = {
  user: null,
  currency: "INR",
  range: "this-month",
  from: null,
  to: null,
  rows: [],
  goalContributions: []
};

const showLoader = () => loader?.classList.remove("hidden");
const hideLoader = () => loader?.classList.add("hidden");

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function rangeDates(key) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (key === "today") {
    const from = localDateInputValue(now);
    return { from, to: localDateInputValue(addDays(now, 1)), label: "Today" };
  }
  if (key === "last-7") {
    const from = addDays(now, -6);
    return { from: localDateInputValue(from), to: localDateInputValue(addDays(now, 1)), label: "Last 7 Days" };
  }
  if (key === "last-30") {
    const from = addDays(now, -29);
    return { from: localDateInputValue(from), to: localDateInputValue(addDays(now, 1)), label: "Last 30 Days" };
  }
  if (key === "this-week") {
    return { from: startOfThisWeek(now), to: localDateInputValue(addDays(now, 1)), label: "This Week" };
  }
  if (key === "this-month") {
    return monthBounds(now) && {
      from: monthBounds(now).start,
      to: monthBounds(now).endExclusive,
      label: monthBounds(now).label
    };
  }
  if (key === "last-month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const next = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: localDateInputValue(first),
      to: localDateInputValue(next),
      label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(first)
    };
  }
  if (key === "this-year") {
    const first = new Date(now.getFullYear(), 0, 1);
    const next = new Date(now.getFullYear() + 1, 0, 1);
    return { from: localDateInputValue(first), to: localDateInputValue(next), label: String(now.getFullYear()) };
  }
  return { from: null, to: null, label: "Custom range" };
}

function percent(value, total) {
  return total > 0 ? (Number(value) / total) * 100 : 0;
}

function amount(rows, type) {
  return rows
    .filter(r => r.transaction_type === type)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

function amountBudget(rows, budget) {
  return rows
    .filter(r => r.transaction_type === "expense" && r.budget_type === budget)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

function setBar(id, pct) {
  const element = document.getElementById(id);
  if (element) element.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function setHidden(id, hidden) {
  document.getElementById(id)?.classList.toggle("hidden", hidden);
}

function applyRange(key, shouldLoad = true) {
  state.range = key;
  const d = rangeDates(key);
  state.from = d.from;
  state.to = d.to;

  const select = document.getElementById("rangeSelect");
  if (select) select.value = key;
  document.getElementById("customRange")?.classList.toggle("hidden", key !== "custom");
  if (shouldLoad && key !== "custom") loadReport();
}

function renderSummary(rows) {
  const income = amount(rows, "income");
  const expenses = amount(rows, "expense");
  const savingsTransactions = amount(rows, "savings");
  const goalContrib = state.goalContributions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalSavingsAllocation = savingsTransactions + goalContrib;
  const savings = income - expenses;
  const net = income - expenses - totalSavingsAllocation;

  document.getElementById("reportIncome").textContent = formatCurrency(income, state.currency);
  document.getElementById("reportExpenses").textContent = formatCurrency(expenses, state.currency);
  document.getElementById("reportSavings").textContent = formatCurrency(savings, state.currency);
  document.getElementById("reportNet").textContent = formatCurrency(net, state.currency);

  const needs = amountBudget(rows, "needs");
  const wants = amountBudget(rows, "wants");
  document.getElementById("needsAmount").textContent = formatCurrency(needs, state.currency);
  document.getElementById("wantsAmount").textContent = formatCurrency(wants, state.currency);
  document.getElementById("allocatedSavings").textContent = formatCurrency(totalSavingsAllocation, state.currency);
  document.getElementById("goalContributionAmount").textContent = formatCurrency(goalContrib, state.currency);

  const base = income;
  const nPct = percent(needs, base);
  const wPct = percent(wants, base);
  const sPct = percent(totalSavingsAllocation, base);
  setBar("needsBar", nPct);
  setBar("wantsBar", wPct);
  setBar("savingsBar", sPct);
  document.getElementById("needsPct").textContent = `${nPct.toFixed(1)}% of income`;
  document.getElementById("wantsPct").textContent = `${wPct.toFixed(1)}% of income`;
  document.getElementById("savingsPct").textContent = `${sPct.toFixed(1)}% of income`;
}

function renderCategories(rows, type, targetId, emptyId) {
  const map = {};
  rows.filter(r => r.transaction_type === type).forEach(row => {
    const name = row.category_name || "Uncategorized";
    map[name] = (map[name] || 0) + Number(row.amount || 0);
  });
  const items = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = items.reduce((sum, item) => sum + item[1], 0);
  setHidden(emptyId, items.length > 0);
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = items.map(([name, value]) => {
    const pct = percent(value, total);
    return `<div class="category-report-row">
      <div class="category-report-head"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(formatCurrency(value, state.currency))}</span></div>
      <div class="category-report-track"><span style="width:${Math.min(100, pct)}%"></span></div>
    </div>`;
  }).join("");
}

function renderVehicles(rows) {
  const items = rows.filter(r => r.transaction_type === "expense" && r.vehicle_id);
  const total = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  document.getElementById("vehicleTotal").textContent = formatCurrency(total, state.currency);
  setHidden("emptyVehicleExpenses", items.length > 0);
  document.getElementById("vehicleRows").innerHTML = items.map(row => `<tr>
    <td>${escapeHtml(row.vehicle_name || "Vehicle")}</td>
    <td>${escapeHtml(row.category_name || "Other Expense")}</td>
    <td>${escapeHtml(formatDate(row.transaction_date))}</td>
    <td>${escapeHtml(row.budget_type === "needs" ? "Need" : row.budget_type === "wants" ? "Want" : "—")}</td>
    <td class="expense">−${escapeHtml(formatCurrency(row.amount, state.currency))}</td>
  </tr>`).join("");
}

function renderDetails(rows) {
  const count = rows.length;
  document.getElementById("transactionCount").textContent = `${count} transaction${count === 1 ? "" : "s"}`;
  setHidden("emptyReportTransactions", count > 0);
  document.getElementById("reportTransactionRows").innerHTML = rows.map((row, index) => {
    const prefix = row.transaction_type === "income" ? "+" : row.transaction_type === "savings" ? "↗" : "−";
    return `<tr>
      <td class="report-row-number">${index + 1}</td>
      <td>${escapeHtml(formatDate(row.transaction_date))}</td>
      <td>${escapeHtml(row.transaction_type)}</td>
      <td>${escapeHtml(row.category_name || "Uncategorized")}</td>
      <td>${escapeHtml(row.budget_type === "needs" ? "Need" : row.budget_type === "wants" ? "Want" : "—")}</td>
      <td>${escapeHtml(row.vehicle_name || "—")}</td>
      <td>${escapeHtml(row.description || row.notes || "—")}</td>
      <td class="${transactionClass(row.transaction_type)}">${prefix}${escapeHtml(formatCurrency(row.amount, state.currency))}</td>
    </tr>`;
  }).join("");
}

async function fetchRows() {
  const { data, error } = await sb
    .from("transactions")
    .select("id,transaction_type,amount,category_id,budget_type,vehicle_id,transaction_date,description,notes")
    .eq("user_id", state.user.id)
    .gte("transaction_date", state.from)
    .lt("transaction_date", state.to)
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const categoryIds = [...new Set(rows.map(r => r.category_id).filter(Boolean))];
  const vehicleIds = [...new Set(rows.map(r => r.vehicle_id).filter(Boolean))];

  const [categoryResult, vehicleResult] = await Promise.all([
    categoryIds.length
      ? sb.from("categories").select("id,name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    vehicleIds.length
      ? sb.from("vehicles").select("id,name").in("id", vehicleIds).eq("user_id", state.user.id)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (categoryResult.error) throw categoryResult.error;
  if (vehicleResult.error) throw vehicleResult.error;

  const categories = new Map((categoryResult.data || []).map(c => [c.id, c.name]));
  const vehicles = new Map((vehicleResult.data || []).map(v => [v.id, v.name]));

  return rows.map(row => ({
    ...row,
    category_name: categories.get(row.category_id) || "Uncategorized",
    vehicle_name: vehicles.get(row.vehicle_id) || null
  }));
}

async function fetchGoalContributions() {
  const { data, error } = await sb
    .from("goal_contributions")
    .select("id,goal_id,amount,contribution_date,note")
    .eq("user_id", state.user.id)
    .gte("contribution_date", state.from)
    .lt("contribution_date", state.to)
    .order("contribution_date", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const goalIds = [...new Set(rows.map(row => row.goal_id).filter(Boolean))];
  if (!goalIds.length) return rows;

  const { data: goals, error: goalError } = await sb
    .from("goals")
    .select("id,name")
    .eq("user_id", state.user.id)
    .in("id", goalIds);
  if (goalError) throw goalError;

  const goalMap = new Map((goals || []).map(goal => [goal.id, goal.name]));
  return rows.map(row => ({ ...row, goal_name: goalMap.get(row.goal_id) || "Goal" }));
}

async function loadReport() {
  if (!state.user) return;
  showLoader();
  try {
    const label = state.range === "custom"
      ? `Custom: ${state.from} to ${localDateInputValue(addDays(new Date(`${state.to}T00:00:00`), -1))}`
      : rangeDates(state.range).label;
    document.getElementById("periodLabel").textContent = label;

    const results = await Promise.allSettled([fetchRows(), fetchGoalContributions()]);

    if (results[0].status === "rejected") {
      throw results[0].reason;
    }
    state.rows = results[0].value || [];

    if (results[1].status === "fulfilled") {
      state.goalContributions = results[1].value || [];
    } else {
      console.warn("Goal contributions could not be loaded", results[1].reason);
      state.goalContributions = [];
    }

    renderSummary(state.rows);
    renderCategories(state.rows, "expense", "expenseCategories", "emptyExpenseCategories");
    renderCategories(state.rows, "income", "incomeCategories", "emptyIncomeCategories");
    renderVehicles(state.rows);
    renderDetails(state.rows);
  } catch (error) {
    console.error("Report load failed:", error);
    showToast(friendlySupabaseError(error), "error");
  } finally {
    hideLoader();
  }
}

function money(value) {
  const number = Number(value || 0);
  return `${state.currency === "INR" ? "Rs." : state.currency} ${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function currentPeriodLabel() {
  if (state.range === "custom") {
    return `Custom: ${state.from} to ${localDateInputValue(addDays(new Date(`${state.to}T00:00:00`), -1))}`;
  }
  return rangeDates(state.range).label;
}

function aggregate(rows, type) {
  const map = {};
  rows.filter(row => row.transaction_type === type).forEach(row => {
    const name = row.category_name || "Uncategorized";
    map[name] = (map[name] || 0) + Number(row.amount || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function buildReportPdf() {
  if (!window.pdfMake) {
    showToast("PDF generator is still loading. Please try again.", "warning");
    return;
  }

  const rows = state.rows || [];
  const income = amount(rows, "income");
  const expenses = amount(rows, "expense");
  const savingsTransactions = amount(rows, "savings");
  const goalContrib = state.goalContributions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalSavingsAllocation = savingsTransactions + goalContrib;
  const savings = income - expenses;
  const net = income - expenses - totalSavingsAllocation;
  const needs = amountBudget(rows, "needs");
  const wants = amountBudget(rows, "wants");
  const expenseItems = aggregate(rows, "expense");
  const incomeItems = aggregate(rows, "income");
  const vehicleItems = rows.filter(row => row.transaction_type === "expense" && row.vehicle_id);

  const header = labels => labels.map(text => ({ text, style: "tableHeader" }));
  const categoryBody = (items, total) => [
    header(["Category", "Amount", "Share"]),
    ...(items.length
      ? items.map(([name, value]) => [
          { text: name },
          { text: money(value), alignment: "right" },
          { text: `${percent(value, total).toFixed(1)}%`, alignment: "right" }
        ])
      : [[{ text: "No data", colSpan: 3, color: "#6b7280" }, {}, {}]])
  ];

  const budgetBody = [
    header(["Allocation", "Amount", "% of income"]),
    [{ text: "Needs" }, { text: money(needs), alignment: "right" }, { text: `${percent(needs, income).toFixed(1)}%`, alignment: "right" }],
    [{ text: "Wants" }, { text: money(wants), alignment: "right" }, { text: `${percent(wants, income).toFixed(1)}%`, alignment: "right" }],
    [{ text: "Savings" }, { text: money(totalSavingsAllocation), alignment: "right" }, { text: `${percent(totalSavingsAllocation, income).toFixed(1)}%`, alignment: "right" }],
    [{ text: "Goal Contributions" }, { text: money(goalContrib), alignment: "right" }, { text: `${percent(goalContrib, income).toFixed(1)}%`, alignment: "right" }]
  ];

  const goalBody = [
    header(["Goal", "Date", "Amount"]),
    ...(state.goalContributions.length
      ? state.goalContributions.map(row => [
          { text: row.goal_name || "Goal" },
          { text: formatDate(row.contribution_date) },
          { text: money(row.amount), alignment: "right" }
        ])
      : [[{ text: "No goal contributions", colSpan: 3, color: "#6b7280" }, {}, {}]])
  ];

  const vehicleBody = [
    header(["Vehicle", "Category", "Date", "Amount"]),
    ...(vehicleItems.length
      ? vehicleItems.map(row => [
          { text: row.vehicle_name || "Vehicle" },
          { text: row.category_name || "Other Expense" },
          { text: formatDate(row.transaction_date) },
          { text: money(row.amount), alignment: "right" }
        ])
      : [[{ text: "No vehicle expenses", colSpan: 4, color: "#6b7280" }, {}, {}, {}]])
  ];

  const detailBody = [
    header(["#", "Date", "Type", "Category", "Budget", "Vehicle", "Description", "Amount"]),
    ...(rows.length
      ? rows.map((row, index) => [
          { text: String(index + 1), alignment: "center" },
          { text: formatDate(row.transaction_date) },
          { text: row.transaction_type },
          { text: row.category_name || "Uncategorized" },
          { text: row.budget_type === "needs" ? "Need" : row.budget_type === "wants" ? "Want" : "—" },
          { text: row.vehicle_name || "—" },
          { text: row.description || row.notes || "—" },
          { text: money(row.amount), alignment: "right" }
        ])
      : [[{ text: "No transactions", colSpan: 8, color: "#6b7280" }, {}, {}, {}, {}, {}, {}, {}]])
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [34, 34, 34, 42],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#182230" },
    footer: (page, pageCount) => ({
      columns: [
        { text: `MyFinance · ${currentPeriodLabel()}`, fontSize: 8, color: "#6b7280" },
        { text: `Page ${page} of ${pageCount}`, alignment: "right", fontSize: 8, color: "#6b7280" }
      ],
      margin: [34, 0, 34, 18]
    }),
    content: [
      { text: "MyFinance", style: "brand" },
      { text: "Financial Report", style: "title" },
      { text: currentPeriodLabel(), style: "period" },
      { text: `${rows.length} transaction${rows.length === 1 ? "" : "s"}`, style: "periodCount", margin: [0, 2, 0, 12] },
      { columns: [
          { stack: [{ text: "Income", style: "cardLabel" }, { text: money(income), style: "incomeValue" }], style: "summaryCard" },
          { stack: [{ text: "Expenses", style: "cardLabel" }, { text: money(expenses), style: "expenseValue" }], style: "summaryCard" },
          { stack: [{ text: "Savings", style: "cardLabel" }, { text: money(savings), style: "savingsValue" }], style: "summaryCard" },
          { stack: [{ text: "Net", style: "cardLabel" }, { text: money(net), style: "netValue" }], style: "summaryCard" }
        ], columnGap: 8, margin: [0, 0, 0, 16] },
      { columns: [
          { stack: [{ text: "Expense Breakdown", style: "sectionTitle" }, { table: { widths: ["*", "auto", "auto"], body: categoryBody(expenseItems, expenses), headerRows: 1 }, layout: "lightHorizontalLines" }] },
          { stack: [{ text: "Income Breakdown", style: "sectionTitle" }, { table: { widths: ["*", "auto", "auto"], body: categoryBody(incomeItems, income), headerRows: 1 }, layout: "lightHorizontalLines" }] }
        ], columnGap: 18 },
      { text: "Needs / Wants / Savings", style: "sectionTitle", margin: [0, 18, 0, 6] },
      { table: { widths: ["*", "auto", "auto"], body: budgetBody, headerRows: 1 }, layout: "lightHorizontalLines" },
      { text: "Goal Contributions", style: "sectionTitle", margin: [0, 18, 0, 6] },
      { table: { widths: ["*", "auto", "auto"], body: goalBody, headerRows: 1 }, layout: "lightHorizontalLines" },
      { text: "Vehicle Expenses", style: "sectionTitle", margin: [0, 18, 0, 6] },
      { table: { widths: ["*", "*", "auto", "auto"], body: vehicleBody, headerRows: 1 }, layout: "lightHorizontalLines" },
      { text: "Detailed Transactions", style: "sectionTitle", margin: [0, 18, 0, 6] },
      { table: { widths: [20, 48, 42, 82, 40, 56, "*", 64], body: detailBody, headerRows: 1 }, layout: "lightHorizontalLines" }
    ],
    styles: {
      brand: { fontSize: 15, bold: true, color: "#08a67a", margin: [0, 0, 0, 4] },
      title: { fontSize: 22, bold: true, color: "#14202d" },
      period: { fontSize: 10, color: "#6b7280", margin: [0, 2, 0, 0] },
      periodCount: { fontSize: 9, bold: true, color: "#475467" },
      cardLabel: { fontSize: 8, bold: true, color: "#667085" },
      incomeValue: { fontSize: 15, bold: true, color: "#178f69", margin: [0, 4, 0, 0] },
      expenseValue: { fontSize: 15, bold: true, color: "#c65361", margin: [0, 4, 0, 0] },
      savingsValue: { fontSize: 15, bold: true, color: "#bd6b1e", margin: [0, 4, 0, 0] },
      netValue: { fontSize: 15, bold: true, color: "#3973a5", margin: [0, 4, 0, 0] },
      summaryCard: { margin: [0, 0, 0, 0], fillColor: "#f7f9fb", padding: 9 },
      sectionTitle: { fontSize: 12, bold: true, color: "#1d2939", margin: [0, 0, 0, 6] },
      tableHeader: { fontSize: 8, bold: true, color: "#475467", fillColor: "#f2f4f7", margin: [0, 4, 0, 4] }
    }
  };

  const baseDate = state.from ? new Date(`${state.from}T00:00:00`) : new Date();
  const dynamicLabel = state.range === "custom"
    ? `MyFinance ${state.from} - ${localDateInputValue(addDays(new Date(`${state.to}T00:00:00`), -1))}`
    : `MyFinance ${new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(baseDate)}`;
  window.pdfMake.createPdf(docDefinition).download(`${dynamicLabel}.pdf`);
}

// Init shared UI.
setupAppMenu();
setupTheme();
setupProfileMenu();

document.getElementById("rangeSelect")?.addEventListener("change", event => applyRange(event.target.value));

document.getElementById("applyCustomRange")?.addEventListener("click", async () => {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const today = localDateInputValue(new Date());
  if (!from || !to || from > to) {
    showToast("Please select a valid custom date range.", "warning");
    return;
  }
  if (to > today) {
    showToast("Report end date cannot be in the future.", "warning");
    return;
  }
  state.range = "custom";
  state.from = from;
  state.to = localDateInputValue(addDays(new Date(`${to}T00:00:00`), 1));
  document.getElementById("rangeSelect").value = "custom";
  document.getElementById("customRange")?.classList.remove("hidden");
  await loadReport();
});

document.getElementById("printReport")?.addEventListener("click", buildReportPdf);

sb.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    window.location.replace(appUrl("index.html"));
  }
});

(async () => {
  try {
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      window.location.replace(appUrl("index.html"));
      return;
    }
    state.user = data.user;

    // Profile is optional for report loading; a profile/RLS issue should not blank the report.
    try {
      const { data: profile } = await sb
        .from("profiles")
        .select("currency_code")
        .eq("id", state.user.id)
        .maybeSingle();
      state.currency = profile?.currency_code || "INR";
    } catch (profileError) {
      console.warn("Profile currency unavailable; defaulting to INR.", profileError);
      state.currency = "INR";
    }

    applyRange("this-month", false);
    document.getElementById("rangeSelect").value = "this-month";
    document.getElementById("fromDate").value = state.from;
    document.getElementById("toDate").value = localDateInputValue(addDays(new Date(), 0));
    await loadReport();
  } catch (error) {
    console.error("Report initialization failed:", error);
    showToast(friendlySupabaseError(error), "error");
    hideLoader();
  }
})();
