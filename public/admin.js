const loginForm = document.getElementById("loginForm");
const appointmentsDiv = document.getElementById("appointments");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value.trim();

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({ password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(data.error || "סיסמה שגויה");
    return;
  }

  loadAppointments();
});

async function loadAppointments() {
  const res = await fetch("/api/admin/appointments", {
    credentials: "same-origin"
  });

  if (!res.ok) {
    appointmentsDiv.innerHTML = "אין גישה";
    return;
  }

  const data = await res.json();

  appointmentsDiv.innerHTML = data.map(a => `
    <div>
      ${escapeHtml(a.full_name)} - ${escapeHtml(a.date)} ${escapeHtml(a.time)}
      <button onclick="deleteAppointment(${a.id})">מחק</button>
    </div>
  `).join("");
}

async function deleteAppointment(id) {
  await fetch(`/api/admin/appointments/${id}`, {
    method: "DELETE",
    credentials: "same-origin"
  });

  loadAppointments();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}