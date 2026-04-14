const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const appointmentsDiv = document.getElementById("appointments");
const adminStatus = document.getElementById("adminStatus");
const logoutBtn = document.getElementById("logoutBtn");
const adminSection = document.getElementById("adminSection");

const availabilityDate = document.getElementById("availabilityDate");
const copyTargetDate = document.getElementById("copyTargetDate");
const availabilityGrid = document.getElementById("availabilityGrid");

const openAllBtn = document.getElementById("openAllBtn");
const closeAllBtn = document.getElementById("closeAllBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const copyDayBtn = document.getElementById("copyDayBtn");

const HOURS = [
  "10:00", "10:30",
  "11:00", "11:30",
  "12:00", "12:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00", "18:30",
  "19:00", "19:30",
  "20:00", "20:30",
  "21:00", "21:30",
  "22:00", "22:30",
  "23:00", "23:30",
  "00:00", "00:30",
  "01:00", "01:30",
  "02:00", "02:30",
  "03:00", "03:30",
  "04:00"
];

function showAdminStatus(message, type = "") {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.className = "form-message";
  if (type) adminStatus.classList.add(type);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setAdminUI(isLoggedIn) {
  if (adminSection) {
    adminSection.style.display = isLoggedIn ? "block" : "none";
  }
}

async function checkSession() {
  const res = await fetch("/api/admin/session", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new Error("Session check failed");
  }

  return res.json();
}

async function loadAppointments() {
  if (!appointmentsDiv) return;

  appointmentsDiv.innerHTML = `
    <div class="empty-state">
      <p>טוען תורים...</p>
    </div>
  `;

  const res = await fetch("/api/admin/appointments", {
    method: "GET",
    credentials: "same-origin",
  });

  if (res.status === 401) {
    showAdminStatus("יש להתחבר כדי לצפות בתורים.", "error");
    return;
  }

  const data = await res.json().catch(() => ([]));

  if (!res.ok) {
    appointmentsDiv.innerHTML = `
      <div class="empty-state">
        <p>שגיאה בטעינת התורים.</p>
      </div>
    `;
    return;
  }

  if (!data.length) {
    appointmentsDiv.innerHTML = `
      <div class="empty-state">
        <p>אין תורים כרגע.</p>
      </div>
    `;
    return;
  }

  appointmentsDiv.innerHTML = data.map((a) => `
    <div class="appointment-item">
      <div class="appointment-top">
        <div>
          <h3 class="appointment-name">${escapeHtml(a.fullName)}</h3>
          <div class="appointment-service">${escapeHtml(a.service)}</div>
        </div>
        <button class="delete-btn" data-id="${a._id}">מחק</button>
      </div>

      <div class="appointment-meta">
        <div>📞 ${escapeHtml(a.phone)}</div>
        <div>📅 ${escapeHtml(a.date)}</div>
        <div>🕒 ${escapeHtml(a.time)}</div>
        <div>📝 ${escapeHtml(a.notes || "ללא הערות")}</div>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;

      const confirmed = window.confirm("למחוק את התור?");
      if (!confirmed) return;

      const res = await fetch(`/api/admin/appointments/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAdminStatus(data.error || "שגיאה במחיקת התור.", "error");
        return;
      }

      showAdminStatus("התור נמחק בהצלחה.", "success");
      await loadAppointments();
    });
  });
}

async function loadAvailability() {
  const date = availabilityDate?.value;
  if (!date || !availabilityGrid) return;

  const res = await fetch(`/api/admin/availability/by-date?date=${encodeURIComponent(date)}`, {
    method: "GET",
    credentials: "same-origin",
  });

  const data = await res.json().catch(() => ([]));

  if (!res.ok) {
    availabilityGrid.innerHTML = `
      <div class="empty-state">
        <p>שגיאה בטעינת הזמינות.</p>
      </div>
    `;
    return;
  }

  availabilityGrid.innerHTML = "";

  HOURS.forEach((time) => {
    const existing = data.find((item) => item.time === time);
    const isOpen = !!existing?.isOpen;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `time-slot ${isOpen ? "time-open" : "time-closed"}`;
    btn.textContent = time;

    btn.addEventListener("click", async () => {
      const res = await fetch("/api/admin/availability/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          date,
          time,
          isOpen: !isOpen,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAdminStatus(data.error || "שגיאה בשמירת הזמינות.", "error");
        return;
      }

      showAdminStatus("הזמינות עודכנה.", "success");
      await loadAvailability();
    });

    availabilityGrid.appendChild(btn);
  });
}

async function handleLogin(event) {
  event.preventDefault();

  const password = passwordInput?.value?.trim() || "";
  if (!password) {
    showAdminStatus("יש להזין סיסמה.", "error");
    return;
  }

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAdminStatus(data.error || "שגיאת התחברות.", "error");
    setAdminUI(false);
    return;
  }

  showAdminStatus("כניסה בוצעה בהצלחה.", "success");
  passwordInput.value = "";
  setAdminUI(true);
  await loadAppointments();
}

async function handleLogout() {
  const res = await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
  });

  if (!res.ok) {
    showAdminStatus("שגיאת התנתקות.", "error");
    return;
  }

  showAdminStatus("התנתקת בהצלחה.", "success");
  setAdminUI(false);
}

availabilityDate?.addEventListener("change", loadAvailability);

openAllBtn?.addEventListener("click", async () => {
  const date = availabilityDate?.value;
  if (!date) {
    showAdminStatus("יש לבחור תאריך קודם.", "error");
    return;
  }

  const res = await fetch("/api/admin/availability/open-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ date }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAdminStatus(data.error || "שגיאה בפתיחת כל היום.", "error");
    return;
  }

  showAdminStatus("כל היום נפתח.", "success");
  await loadAvailability();
});

closeAllBtn?.addEventListener("click", async () => {
  const date = availabilityDate?.value;
  if (!date) {
    showAdminStatus("יש לבחור תאריך קודם.", "error");
    return;
  }

  const res = await fetch("/api/admin/availability/close-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ date }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAdminStatus(data.error || "שגיאה בסגירת כל היום.", "error");
    return;
  }

  showAdminStatus("כל היום נסגר.", "success");
  await loadAvailability();
});

resetAllBtn?.addEventListener("click", async () => {
  const date = availabilityDate?.value;
  if (!date) {
    showAdminStatus("יש לבחור תאריך קודם.", "error");
    return;
  }

  const confirmed = window.confirm("לאפס את כל הזמינות של היום?");
  if (!confirmed) return;

  const res = await fetch("/api/admin/availability/reset-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ date }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAdminStatus(data.error || "שגיאה באיפוס היום.", "error");
    return;
  }

  showAdminStatus("היום אופס.", "success");
  await loadAvailability();
});

copyDayBtn?.addEventListener("click", async () => {
  const sourceDate = availabilityDate?.value;
  const targetDate = copyTargetDate?.value;

  if (!sourceDate || !targetDate) {
    showAdminStatus("יש לבחור גם תאריך מקור וגם תאריך יעד.", "error");
    return;
  }

  const res = await fetch("/api/admin/availability/copy-day", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ sourceDate, targetDate }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAdminStatus(data.error || "שגיאה בהעתקת היום.", "error");
    return;
  }

  showAdminStatus("היום הועתק בהצלחה.", "success");
});

loginForm?.addEventListener("submit", handleLogin);
logoutBtn?.addEventListener("click", handleLogout);

window.addEventListener("load", async () => {
  try {
    const session = await checkSession();
    if (session.isAdmin) {
      setAdminUI(true);
      await loadAppointments();
    } else {
      setAdminUI(false);
    }
  } catch (error) {
    console.error("admin init error:", error);
    showAdminStatus("שגיאה בטעינת אזור הניהול.", "error");
    setAdminUI(false);
  }
});