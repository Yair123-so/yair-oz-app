const API_URL = "/api/appointments";

const navToggle = document.getElementById("navToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileLinks = document.querySelectorAll(".mobile-links a");
const bookingForm = document.getElementById("bookingForm");
const appointmentsList = document.getElementById("appointmentsList");
const formMessage = document.getElementById("formMessage");
const timeSelect = document.getElementById("time");
const dateInput = document.getElementById("date");
const sendWhatsappBtn = document.getElementById("sendWhatsappBtn");
const yearEl = document.getElementById("year");

const availableTimes = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00"
];

function showMessage(message, type = "") {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = "form-message";
  if (type) formMessage.classList.add(type);
}

function setMinDate() {
  if (!dateInput) return;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

async function fetchAppointments(date = "") {
  const url = date ? `${API_URL}?date=${encodeURIComponent(date)}` : API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return await res.json();
}

async function renderTimeOptions(selectedDate) {
  if (!timeSelect) return;

  timeSelect.innerHTML = '<option value="">בחר שעה</option>';
  if (!selectedDate) return;

  try {
    const appointments = await fetchAppointments(selectedDate);
    const bookedTimes = appointments.map((a) => a.time);

    availableTimes.forEach((time) => {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = bookedTimes.includes(time) ? `${time} - תפוס` : time;
      option.disabled = bookedTimes.includes(time);
      timeSelect.appendChild(option);
    });
  } catch (error) {
    showMessage("שגיאה בטעינת שעות פנויות.", "error");
  }
}

async function renderAppointments() {
  if (!appointmentsList) return;

  try {
    const appointments = await fetchAppointments();

    if (!appointments.length) {
      appointmentsList.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-calendar"></i>
          <p>עדיין לא נשמרו תורים.</p>
        </div>
      `;
      return;
    }

    appointmentsList.innerHTML = appointments.map((item) => `
      <article class="appointment-item">
        <div class="appointment-top">
          <div>
            <h3 class="appointment-name">${escapeHtml(item.full_name)}</h3>
            <div class="appointment-service">${escapeHtml(item.service)}</div>
          </div>
        </div>

        <div class="appointment-meta">
          <div><i class="fa-solid fa-phone"></i> ${escapeHtml(item.phone)}</div>
          <div><i class="fa-solid fa-calendar-days"></i> ${escapeHtml(item.date)}</div>
          <div><i class="fa-solid fa-clock"></i> ${escapeHtml(item.time)}</div>
          <div><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(item.notes || "ללא הערות")}</div>
        </div>
      </article>
    `).join("");
  } catch (error) {
    appointmentsList.innerHTML = `
      <div class="empty-state">
        <p>שגיאה בטעינת התורים.</p>
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!bookingForm) return;

  const data = {
    fullName: bookingForm.fullName.value.trim(),
    phone: bookingForm.phone.value.trim(),
    service: bookingForm.service.value,
    date: bookingForm.date.value,
    time: bookingForm.time.value,
    notes: bookingForm.notes.value.trim()
  };

  if (!data.fullName || !data.phone || !data.service || !data.date || !data.time) {
    showMessage("יש למלא את כל שדות החובה.", "error");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (res.status === 409) {
      showMessage("השעה שבחרת כבר תפוסה.", "error");
      await renderTimeOptions(data.date);
      return;
    }

    if (!res.ok) {
      showMessage("שגיאה בשמירת התור.", "error");
      return;
    }

    showMessage("התור נשמר בהצלחה.", "success");
    bookingForm.reset();

    await renderAppointments();
    await renderTimeOptions(dateInput?.value || "");
  } catch (error) {
    showMessage("שגיאה בחיבור לשרת.", "error");
  }
}

function buildWhatsappMessage() {
  if (!bookingForm) return "#";

  const text = [
    "שלום Yair Oz, אני רוצה לקבוע תור:",
    `שם: ${bookingForm.fullName.value || "-"}`,
    `טלפון: ${bookingForm.phone.value || "-"}`,
    `שירות: ${bookingForm.service.value || "-"}`,
    `תאריך: ${bookingForm.date.value || "-"}`,
    `שעה: ${bookingForm.time.value || "-"}`,
    `הערות: ${bookingForm.notes.value || "-"}`
  ].join("\n");

  return `https://wa.me/972500000000?text=${encodeURIComponent(text)}`;
}

function initReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((el) => observer.observe(el));
}

function initMobileMenu() {
  if (!navToggle || !mobileMenu) return;

  navToggle.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
}

dateInput?.addEventListener("change", async (event) => {
  await renderTimeOptions(event.target.value);
});

bookingForm?.addEventListener("submit", handleFormSubmit);

sendWhatsappBtn?.addEventListener("click", () => {
  window.open(buildWhatsappMessage(), "_blank", "noopener");
});

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

setMinDate();
renderAppointments();
renderTimeOptions(dateInput?.value || "");
initReveal();
initMobileMenu();
initServiceWorker();