import { sb } from "./supabase.js";
import { setupAppMenu } from "./day3-shared.js";

const loader = document.getElementById("pageLoader");

function showLoader() { loader?.classList.remove("hidden"); }
function hideLoader() { loader?.classList.add("hidden"); }

function firstLetter(name) {
  return (name || "U").trim().charAt(0).toUpperCase() || "U";
}

function url(file) {
  return new URL(file, window.location.href).href;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("myfinance-theme", theme);

  const button = document.getElementById("themeToggle");

  if (button) {
    button.textContent = theme === "dark" ? "☀️" : "🌙";
    button.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode"
    );
  }
}

function closeProfile() {
  document.getElementById("profileMenu")?.classList.add("hidden");
  document.getElementById("profileButton")?.setAttribute("aria-expanded", "false");
}

async function loadProfile() {
  showLoader();

  try {
    const { data: sessionData, error: sessionError } =
      await sb.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session?.user) {
      window.location.replace(url("index.html"));
      return;
    }

    const user = session.user;

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("full_name, mobile_number, email, currency_code, timezone")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile query error:", profileError);
    }

    const name =
      profile?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      user.email?.split("@")[0] ||
      "User";

    const email = profile?.email || user.email || "—";
    const mobile =
      profile?.mobile_number ||
      user.user_metadata?.mobile_number ||
      "—";
    const currency = profile?.currency_code || "INR";
    const timezone = profile?.timezone || "Asia/Kolkata";
    const initial = firstLetter(name);

    document.getElementById("headerName").textContent = name;
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = email;
    document.getElementById("menuName").textContent = name;
    document.getElementById("menuEmail").textContent = email;

    document.getElementById("profileInitial").textContent = initial;
    document.getElementById("menuInitial").textContent = initial;

    document.getElementById("cardFullName").textContent = name;
    document.getElementById("cardMobile").textContent = mobile;
    document.getElementById("cardCurrency").textContent = currency;
    document.getElementById("cardTimezone").textContent = timezone;
  } catch (error) {
    console.error(error);
    alert("Unable to load your profile. Please login again.");

    try {
      await sb.auth.signOut();
    } catch {}

    window.location.replace(url("index.html"));
  } finally {
    hideLoader();
  }
}

setupAppMenu();
applyTheme(localStorage.getItem("myfinance-theme") || "light");

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

document.getElementById("profileButton")?.addEventListener("click", () => {
  const menu = document.getElementById("profileMenu");
  const button = document.getElementById("profileButton");

  if (menu?.classList.contains("hidden")) {
    menu.classList.remove("hidden");
    button?.setAttribute("aria-expanded", "true");
  } else {
    closeProfile();
  }
});

document.addEventListener("click", (event) => {
  const button = document.getElementById("profileButton");
  const menu = document.getElementById("profileMenu");

  if (
    button &&
    menu &&
    !button.contains(event.target) &&
    !menu.contains(event.target)
  ) {
    closeProfile();
  }
});

document.getElementById("logoutButton")?.addEventListener("click", async () => {
  closeProfile();
  showLoader();

  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    window.location.replace(url("index.html"));
  } catch (error) {
    console.error(error);
    hideLoader();
    alert("Unable to logout right now.");
  }
});

document.getElementById("myProfileLink")?.addEventListener("click", () => {
  closeProfile();
  alert("Profile editing will be added in the Settings/Profile phase.");
});

document.getElementById("settingsLink")?.addEventListener("click", () => {
  closeProfile();
  alert("Settings will be added in the Settings phase.");
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    window.location.replace(url("index.html"));
  }
});

loadProfile();
