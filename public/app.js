const CONVEX_URL = "https://greedy-akita-874.convex.cloud";

const client = new convex.ConvexClient(CONVEX_URL);
const api = convex.anyApi;

const calendarSelectedLine = document.getElementById("calendarSelectedLine");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const calendarPrev = document.getElementById("calendarPrev");
const calendarNext = document.getElementById("calendarNext");

const navToggle = document.getElementById("navToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileLinks = document.querySelectorAll(".mobile-links a");

const bookingForm = document.getElementById("bookingForm");
const formMessage = document.getElementById("formMessage");
const timeSelect = document.getElementById("time");
const dateInput = document.getElementById("date");
let calendarCurrentMonth = null;
const datePlaceholder = document.getElementById("datePlaceholder");
const dateFieldWrap = dateInput?.closest(".date-field-wrap");
const dateButton = document.getElementById("dateButton");
const sendWhatsappBtn = document.getElementById("sendWhatsappBtn");
const yearEl = document.getElementById("year");
const phoneInput = document.getElementById("phone");

const openDaysList = document.getElementById("openDaysList");
const closedDaysList = document.getElementById("closedDaysList");
const dateStatusMessage = document.getElementById("dateStatusMessage");
const bookingWindowMessage = document.getElementById("bookingWindowMessage");

const serviceSelect = document.getElementById("service");
const vipNotice = document.getElementById("vipNotice");
const vipWhatsappBtn = document.getElementById("vipWhatsappBtn");
const homeVisitNotice = document.getElementById("homeVisitNotice");
const homeVisitWhatsappBtn = document.getElementById("homeVisitWhatsappBtn");

const fullNameInput = document.getElementById("fullName");
const notesInput = document.getElementById("notes");
const submitBookingBtn = document.getElementById("submitBookingBtn");



function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sameMonth(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

function getAvailabilityData() {
  return window.availabilityData || [];
}
function getAllowedDateMap() {
  const allowedDates = getAllowedBookingDates();
  const availability = getAvailabilityData();
  const map = new Map();

  allowedDates.forEach((date) => {
    const daySlots = availability.filter(
      (item) => item.date === date && item.isOpen === true
    );

    map.set(date, daySlots.length > 0 ? "open" : "closed");
  });

  return map;
}

function updateCalendarSelectedLine() {
  if (!calendarSelectedLine || !dateInput) return;

  if (!dateInput.value) {
    calendarSelectedLine.textContent = "בחר תאריך";
    return;
  }

  const selected = parseLocalDate(dateInput.value);

  calendarSelectedLine.textContent = selected.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCalendarMonth(dateObj) {
  return dateObj.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

function initCalendarMonth() {
  const allowedDates = getAllowedBookingDates();
  if (!allowedDates.length) {
    calendarCurrentMonth = new Date();
    return;
  }

  if (dateInput?.value) {
    calendarCurrentMonth = parseLocalDate(dateInput.value);
    return;
  }

  calendarCurrentMonth = parseLocalDate(allowedDates[0]);
}

function renderCustomCalendar() {
  try {
    if (!calendarGrid || !calendarMonthLabel || !dateInput) return;

    const allowedDates = getAllowedBookingDates();
    const allowedMap = getAllowedDateMap();

    if (!calendarCurrentMonth) {
      initCalendarMonth();
    }

    if (!calendarCurrentMonth) return;

    calendarGrid.innerHTML = "";

    const year = calendarCurrentMonth.getFullYear();
    const month = calendarCurrentMonth.getMonth();

    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);

    calendarMonthLabel.textContent = calendarCurrentMonth.toLocaleDateString("he-IL", {
      month: "long",
      year: "numeric",
    });

    const startWeekday = firstDay.getDay();

    for (let i = 0; i < startWeekday; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-day-empty";
      calendarGrid.appendChild(empty);
    }

    const today = new Date();
    const todayKey = toDateKey(
      new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
    );

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day, 12, 0, 0);
      const dateKey = toDateKey(currentDate);
      const state = allowedMap.get(dateKey);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      btn.textContent = String(day);

      if (dateKey === todayKey) {
        btn.classList.add("calendar-day-today");
      }

      if (dateInput.value === dateKey) {
        btn.classList.add("calendar-day-selected");
      }

      if (state === "open") {
        btn.classList.add("calendar-day-open");
        btn.addEventListener("click", async () => {
          dateInput.value = dateKey;
          updateCalendarSelectedLine();
          renderCustomCalendar();
          await updateDateStatusMessage(dateKey);
          await renderTimeOptions(dateKey);
        });
      } else if (state === "closed") {
        btn.classList.add("calendar-day-closed");
        btn.addEventListener("click", async () => {
          dateInput.value = dateKey;
          updateCalendarSelectedLine();
          renderCustomCalendar();
          await updateDateStatusMessage(dateKey);
          if (timeSelect) {
            timeSelect.innerHTML = '<option value="">בחר שעה</option>';
          }
        });
      } else {
        btn.classList.add("calendar-day-disabled");
        btn.disabled = true;
      }

      calendarGrid.appendChild(btn);
    }

    const allowedMonthDates = allowedDates.map(parseLocalDate);

    const hasPrevMonth = allowedMonthDates.some((d) => {
      const prev = new Date(year, month - 1, 1, 12, 0, 0);
      return sameMonth(d, prev);
    });

    const hasNextMonth = allowedMonthDates.some((d) => {
      const next = new Date(year, month + 1, 1, 12, 0, 0);
      return sameMonth(d, next);
    });

    if (calendarPrev) {
      calendarPrev.disabled = !hasPrevMonth;
      calendarPrev.style.opacity = hasPrevMonth ? "1" : "0.35";
    }

    if (calendarNext) {
      calendarNext.disabled = !hasNextMonth;
      calendarNext.style.opacity = hasNextMonth ? "1" : "0.35";
    }
  } catch (error) {
    console.error("renderCustomCalendar error:", error);
  }
}

function updateDateFieldUI() {
  if (!dateInput || !datePlaceholder || !dateFieldWrap) return;

  if (!dateInput.value) {
    datePlaceholder.textContent = "בחר תאריך";
    dateFieldWrap.classList.remove("has-value");
    return;
  }

  const date = new Date(dateInput.value + "T12:00:00");

  const formatted = date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  datePlaceholder.textContent = formatted;
  dateFieldWrap.classList.add("has-value");
}

function showMessage(message, type = "") {
  if (!formMessage) return;

  formMessage.innerHTML = "";
  formMessage.textContent = message;
  formMessage.className = "form-message";

  if (type) formMessage.classList.add(type);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHebrewDateLabel(dateString) {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatDateLabel(dateString) {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getCurrentBookingWindow() {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 6=Saturday

  const isSaturdayAfter20 =
    currentDay === 6 &&
    (now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 0));

  let openingSaturday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    20,
    0,
    0,
    0
  );

  if (isSaturdayAfter20) {
    // מוצ"ש הנוכחי
  } else if (currentDay >= 0 && currentDay <= 4) {
    // ראשון עד חמישי -> חלון פתוח מאז מוצ"ש האחרון
    const daysBackToSaturday = currentDay + 1;
    openingSaturday.setDate(openingSaturday.getDate() - daysBackToSaturday);
  } else {
    // שישי או שבת לפני 20:00 -> מוצ"ש הקרוב
    const daysUntilSaturday = currentDay === 6 ? 0 : 6 - currentDay;
    openingSaturday.setDate(openingSaturday.getDate() + daysUntilSaturday);
  }

  const startDate = new Date(
    openingSaturday.getFullYear(),
    openingSaturday.getMonth(),
    openingSaturday.getDate() + 1,
    0,
    0,
    0,
    0
  );

  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + 4,
    23,
    59,
    59,
    999
  );

  const isOpenNow = now >= openingSaturday && now <= endDate;

  return {
    isOpenNow,
    opensAt: openingSaturday,
    startDate: formatYMD(startDate),
    endDate: formatYMD(endDate),
  };
}

function getNextSaturdayAt20() {
  const now = new Date();
  const currentDay = now.getDay();

  const result = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    20,
    0,
    0,
    0
  );

  const daysUntilSaturday = currentDay === 6 ? 0 : 6 - currentDay;
  result.setDate(result.getDate() + daysUntilSaturday);

  if (now > result) {
    result.setDate(result.getDate() + 7);
  }

  return result;
}

function getAllowedBookingDates() {
  const windowInfo = getCurrentBookingWindow();

  if (!windowInfo.isOpenNow) {
    return [];
  }

  const dates = [];
  const start = new Date(windowInfo.startDate + "T12:00:00");

  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatYMD(d));
  }

  return dates;
}

function isDateAllowed(dateString) {
  return getAllowedBookingDates().includes(dateString);
}

function updateBookingWindowUI() {
  if (!bookingWindowMessage || !dateInput || !timeSelect) return;

  const windowInfo = getCurrentBookingWindow();
  const allowedDates = getAllowedBookingDates();

  if (!windowInfo.isOpenNow) {
    const nextOpen = getNextSaturdayAt20();

    bookingWindowMessage.textContent =
      `ההזמנות סגורות כרגע. ההזמנות לשבוע הקרוב ייפתחו ב־${nextOpen.toLocaleDateString("he-IL")} בשעה 20:00.`;
    bookingWindowMessage.className = "booking-window-message booking-window-closed";

    dateInput.disabled = true;
    timeSelect.disabled = true;
    return;
  }

  bookingWindowMessage.textContent =
    `ההזמנות פתוחות כעת עבור ${getHebrewDateLabel(allowedDates[0])} עד ${getHebrewDateLabel(allowedDates[allowedDates.length - 1])}.`;
  bookingWindowMessage.className = "booking-window-message booking-window-open";

  dateInput.disabled = false;
  timeSelect.disabled = false;

  dateInput.min = allowedDates[0];
  dateInput.max = allowedDates[allowedDates.length - 1];
}

async function fetchAllAvailability() {
  const res = await fetch("/api/public/availability/all");
  if (!res.ok) throw new Error("שגיאה בטעינת הימים");
  return res.json();
}

async function fetchAvailabilityByDate(date) {
  const res = await fetch(`/api/public/availability/by-date?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error("שגיאה בטעינת הזמינות");
  return res.json();
}

async function fetchAppointmentsByDate(date) {
  const res = await fetch(`/api/public/appointments/by-date?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error("שגיאה בטעינת התורים");
  return res.json();
}

async function renderAvailabilitySummary() {
  if (!openDaysList || !closedDaysList) return;

  try {
    const availability = await fetchAllAvailability();

    // חשוב: לשמור את הנתונים בשביל הלוח
    window.availabilityData = availability || [];

    const allowedDates = getAllowedBookingDates();

    openDaysList.innerHTML = "";
    closedDaysList.innerHTML = "";

    if (!allowedDates.length) {
      renderCustomCalendar();
      updateCalendarSelectedLine();
      return;
    }

    allowedDates.forEach((date) => {
      const daySlots = availability.filter(
        (item) => item.date === date && item.isOpen
      );
      const isOpen = daySlots.length > 0;

      const chip = document.createElement("div");
      chip.className = `day-chip ${isOpen ? "day-chip-open" : "day-chip-closed"}`;
      chip.textContent = formatDateLabel(date);

      if (isOpen) {
        openDaysList.appendChild(chip);
      } else {
        closedDaysList.appendChild(chip);
      }
    });

    renderCustomCalendar();
    updateCalendarSelectedLine();
  } catch (error) {
    console.error("renderAvailabilitySummary error:", error);
  }
}

async function updateDateStatusMessage(selectedDate) {
  if (!dateStatusMessage) return;

  if (!selectedDate) {
    dateStatusMessage.textContent = "";
    dateStatusMessage.className = "date-status-message";
    return;
  }

  if (!isDateAllowed(selectedDate)) {
    dateStatusMessage.textContent = "אפשר להזמין רק בטווח הימים הפתוח של השבוע הקרוב.";
    dateStatusMessage.className = "date-status-message date-status-closed";
    return;
  }

  try {
    const availability = await fetchAvailabilityByDate(selectedDate);
    const hasOpen = availability.some((item) => item.isOpen);

    if (hasOpen) {
      dateStatusMessage.textContent = "המספרה פתוחה ביום זה.";
      dateStatusMessage.className = "date-status-message date-status-open";
    } else {
      dateStatusMessage.textContent = "המספרה סגורה ביום זה.";
      dateStatusMessage.className = "date-status-message date-status-closed";
    }
  } catch (error) {
    console.error("updateDateStatusMessage error:", error);
    dateStatusMessage.textContent = "";
    dateStatusMessage.className = "date-status-message";
  }
}

async function renderTimeOptions(selectedDate) {
  if (!timeSelect) return;

  timeSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "בחר שעה";
  defaultOption.selected = true;
  timeSelect.appendChild(defaultOption);

  if (!selectedDate) return;

  if (!isDateAllowed(selectedDate)) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "לא ניתן להזמין בתאריך זה";
    option.disabled = true;
    timeSelect.appendChild(option);
    return;
  }

  try {
    const [availability, appointments] = await Promise.all([
      fetchAvailabilityByDate(selectedDate),
      fetchAppointmentsByDate(selectedDate),
    ]);

    const openSlots = availability
      .filter((item) => item.isOpen)
      .map((item) => item.time)
      .sort();

    const bookedTimes = appointments
      .filter((a) => a.status === "booked")
      .map((a) => a.time);

    if (!openSlots.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "אין שעות זמינות ביום זה";
      option.disabled = true;
      timeSelect.appendChild(option);
      return;
    }

    openSlots.forEach((time) => {
      const option = document.createElement("option");
      option.value = time;

      if (bookedTimes.includes(time)) {
        option.textContent = `${time} - תפוס`;
        option.disabled = true;
      } else {
        option.textContent = time;
      }

      timeSelect.appendChild(option);
    });
  } catch (error) {
    console.error("renderTimeOptions error:", error);
    showMessage("שגיאה בטעינת שעות פנויות.", "error");
  }
}

function formatPhone(value) {
  let digits = value.replace(/\D/g, "");
  digits = digits.slice(0, 10);

  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return digits;
  }
}

function updateSpecialServiceUI() {
  if (!serviceSelect) return;

  const value = serviceSelect.value;
  const isVip = value.includes("VIP");
  const isHomeVisit = value.includes("הגעה לבית הלקוח");
  const shouldBlockBooking = isVip || isHomeVisit;

  if (vipNotice) {
    vipNotice.style.display = isVip ? "block" : "none";
  }

  if (homeVisitNotice) {
    homeVisitNotice.style.display = isHomeVisit ? "block" : "none";
  }

  const fullNameGroup = fullNameInput?.closest(".form-group");
  const phoneGroup = phoneInput?.closest(".form-group");
  const dateGroup = dateInput?.closest(".form-group");
  const timeGroup = timeSelect?.closest(".form-group");
  const notesGroup = notesInput?.closest(".form-group");
  const submitGroup = submitBookingBtn?.closest(".form-group") || submitBookingBtn?.parentElement;

  if (fullNameInput) {
    fullNameInput.required = !shouldBlockBooking;
    if (shouldBlockBooking) fullNameInput.value = "";
  }

  if (phoneInput) {
    phoneInput.required = !shouldBlockBooking;
    if (shouldBlockBooking) phoneInput.value = "";
  }

  if (dateInput) {
    dateInput.required = !shouldBlockBooking;
    if (shouldBlockBooking) dateInput.value = "";
  }

  if (timeSelect) {
    timeSelect.required = !shouldBlockBooking;
    if (shouldBlockBooking) {
      timeSelect.value = "";
      timeSelect.innerHTML = '<option value="">בחר שעה</option>';
    }
  }

  if (notesInput && shouldBlockBooking) {
    notesInput.value = "";
  }

  if (fullNameGroup) fullNameGroup.style.display = shouldBlockBooking ? "none" : "";
  if (phoneGroup) phoneGroup.style.display = shouldBlockBooking ? "none" : "";
  if (dateGroup) dateGroup.style.display = shouldBlockBooking ? "none" : "";
  if (timeGroup) timeGroup.style.display = shouldBlockBooking ? "none" : "";
  if (notesGroup) notesGroup.style.display = shouldBlockBooking ? "none" : "";

  if (submitBookingBtn) {
    submitBookingBtn.disabled = shouldBlockBooking;
    submitBookingBtn.style.display = shouldBlockBooking ? "none" : "";
    submitBookingBtn.textContent = "שמור תור";
  }

  if (shouldBlockBooking) {
    showMessage("לשירות זה יש לבצע תיאום מראש בוואטסאפ בלבד.", "error");
  } else if (formMessage?.textContent.includes("תיאום מראש")) {
    showMessage("", "");
  }
}

function buildVipWhatsappMessage() {
  const fullName = bookingForm?.fullName?.value || "";
  const phone = bookingForm?.phone?.value || "";
  const date = bookingForm?.date?.value || "";
  const time = bookingForm?.time?.value || "";
  const notes = bookingForm?.notes?.value || "";

  const text = [
    "שלום יאיר, אני מעוניין בתספורת VIP.",
    `שם: ${fullName || "-"}`,
    `טלפון: ${phone || "-"}`,
    `תאריך מועדף: ${date || "-"}`,
    `שעה מועדפת: ${time || "-"}`,
    `הערות: ${notes || "-"}`,
    "אשמח לתיאום מראש."
  ].join("\n");

  return `https://wa.me/972556873544?text=${encodeURIComponent(text)}`;
}

function buildHomeVisitWhatsappMessage() {
  const fullName = bookingForm?.fullName?.value || "";
  const phone = bookingForm?.phone?.value || "";
  const date = bookingForm?.date?.value || "";
  const time = bookingForm?.time?.value || "";
  const notes = bookingForm?.notes?.value || "";

  const text = [
    "שלום יאיר, אני מעוניין בתספורת הגעה לבית הלקוח.",
    `שם: ${fullName || "-"}`,
    `טלפון: ${phone || "-"}`,
    `תאריך מועדף: ${date || "-"}`,
    `שעה מועדפת: ${time || "-"}`,
    `הערות: ${notes || "-"}`,
    "אשמח לתיאום מראש להגעה לבית הלקוח."
  ].join("\n");

  return `https://wa.me/972556873544?text=${encodeURIComponent(text)}`;
}

function buildWhatsappMessage() {
  if (!bookingForm) return "#";

  const text = [
    "שלום יאיר, אני רוצה לקבוע תור:",
    `שם: ${bookingForm.fullName.value || "-"}`,
    `טלפון: ${bookingForm.phone.value || "-"}`,
    `סוג תספורת: ${bookingForm.service.value || "-"}`,
    `תאריך: ${bookingForm.date.value || "-"}`,
    `שעה: ${bookingForm.time.value || "-"}`,
    `הערות: ${bookingForm.notes.value || "-"}`
  ].join("\n");

  return `https://wa.me/972556873544?text=${encodeURIComponent(text)}`;
}

function showLimitWhatsappButton() {
  let btn = document.getElementById("limitWhatsappBtn");

  if (btn) return;

  btn = document.createElement("button");
  btn.id = "limitWhatsappBtn";
  btn.className = "btn btn-whatsapp btn-full";
  btn.style.marginTop = "10px";
  btn.textContent = "פנה בוואטסאפ";

  btn.onclick = () => {
    const message = encodeURIComponent(
      "היי, ניסיתי לקבוע תור באתר והגעתי למגבלת תורים. אשמח לעזרה."
    );

    window.open(`https://wa.me/972556873544?text=${message}`, "_blank");
  };

  formMessage.appendChild(btn);
}
async function handleFormSubmit(event) {
  event.preventDefault();

  if (!bookingForm) return;

  const data = {
    fullName: bookingForm.fullName.value.trim(),
    phone: bookingForm.phone.value.replace(/\D/g, ""),
    service: bookingForm.service.value,
    date: bookingForm.date.value,
    time: bookingForm.time.value,
    notes: bookingForm.notes.value.trim()
  };

  if (!data.fullName || !data.phone || !data.service || !data.date || !data.time) {
    showMessage("יש למלא את כל שדות החובה.", "error");
    return;
  }

  if (data.phone.length !== 10) {
    showMessage("מספר טלפון חייב להיות 10 ספרות.", "error");
    return;
  }

  if (!isDateAllowed(data.date)) {
    showMessage("אפשר להזמין רק בטווח הימים הפתוח של השבוע הקרוב.", "error");
    return;
  }

  if (data.service.includes("VIP")) {
    showMessage("לתספורת VIP יש לבצע תיאום מראש בוואטסאפ.", "error");
    updateSpecialServiceUI();
    return;
  }

  if (data.service.includes("הגעה לבית הלקוח")) {
    showMessage("לתספורת הגעה לבית הלקוח יש לבצע תיאום מראש בוואטסאפ.", "error");
    updateSpecialServiceUI();
    return;
  }

  try {
    await client.mutation(api.appointments.create, data);

    showMessage("התור נשמר בהצלחה.", "success");
    bookingForm.reset();

    if (timeSelect) {
      timeSelect.innerHTML = '<option value="">בחר שעה</option>';
    }

    updateSpecialServiceUI();
    await renderAvailabilitySummary();
  } catch (error) {
    console.error("handleFormSubmit error:", error);

    const rawMessage =
      error?.data ??
      error?.message ??
      error?.toString?.() ??
      "";

    const msg = String(rawMessage);

    if (msg.includes("ALREADY_BOOKED")) {
      showMessage("השעה שבחרת כבר תפוסה.", "error");
      await renderTimeOptions(data.date);
    } else if (msg.includes("SLOT_NOT_OPEN")) {
      showMessage("השעה שבחרת אינה פתוחה להזמנה.", "error");
    } else if (msg.includes("MAX_APPOINTMENTS")) {
      showMessage(
        "לא ניתן לקבוע יותר מ-4 תורים למספר הזה. לבירור ניתן לפנות בוואטסאפ.",
        "error"
      );
      showLimitWhatsappButton();
    } else {
      showMessage(`שגיאה בשמירת התור: ${msg}`, "error");
    }
  }
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

dateInput?.addEventListener("change", async (event) => {
  const selectedDate = event.target.value;
  updateDateFieldUI();
  await updateDateStatusMessage(selectedDate);
  await renderTimeOptions(selectedDate);
});

phoneInput?.addEventListener("input", (e) => {
  e.target.value = formatPhone(e.target.value);
});

serviceSelect?.addEventListener("change", () => {
  updateSpecialServiceUI();
});

vipWhatsappBtn?.addEventListener("click", () => {
  window.open(buildVipWhatsappMessage(), "_blank", "noopener");
});

homeVisitWhatsappBtn?.addEventListener("click", () => {
  window.open(buildHomeVisitWhatsappMessage(), "_blank", "noopener");
});

bookingForm?.addEventListener("submit", handleFormSubmit);

sendWhatsappBtn?.addEventListener("click", () => {
  window.open(buildWhatsappMessage(), "_blank", "noopener");
});

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

calendarPrev?.addEventListener("click", () => {
  if (!calendarCurrentMonth) return;
  calendarCurrentMonth = new Date(
    calendarCurrentMonth.getFullYear(),
    calendarCurrentMonth.getMonth() - 1,
    1,
    12,
    0,
    0
  );
  renderCustomCalendar();
});

calendarNext?.addEventListener("click", () => {
  if (!calendarCurrentMonth) return;
  calendarCurrentMonth = new Date(
    calendarCurrentMonth.getFullYear(),
    calendarCurrentMonth.getMonth() + 1,
    1,
    12,
    0,
    0
  );
  renderCustomCalendar();
});

updateBookingWindowUI();
renderAvailabilitySummary();

if (dateInput?.value) {
  updateDateStatusMessage(dateInput.value);
  renderTimeOptions(dateInput.value);
}

updateSpecialServiceUI();
updateDateFieldUI();

initReveal();
initMobileMenu();

initCalendarMonth();
updateCalendarSelectedLine();
renderCustomCalendar();