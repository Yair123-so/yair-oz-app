require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const session = require("express-session");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;



  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  req.session.isAdmin = true;
  return res.json({ message: "Login successful" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout successful" });
  });
});

app.get("/api/admin/check", (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.get("/api/admin/appointments", requireAdmin, (req, res) => {
  db.all(
    "SELECT * FROM appointments ORDER BY date ASC, time ASC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database read error" });
      }

      res.json(rows);
    }
  );
});

app.delete("/api/admin/appointments/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM appointments WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Database delete error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted successfully" });
  });
});

app.get("/api/appointments", (req, res) => {
  const { date } = req.query;

  let sql = "SELECT * FROM appointments";
  const params = [];

  if (date) {
    sql += " WHERE date = ?";
    params.push(date);
  }

  sql += " ORDER BY date ASC, time ASC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database read error" });
    }

    res.json(rows);
  });
});

app.post("/api/appointments", (req, res) => {
  const { fullName, phone, service, date, time, notes } = req.body;

  if (!fullName || !phone || !service || !date || !time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.get(
    "SELECT id FROM appointments WHERE date = ? AND time = ?",
    [date, time],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Database check error" });
      }

      if (row) {
        return res.status(409).json({ error: "Time slot already booked" });
      }

      db.run(
        `INSERT INTO appointments (full_name, phone, service, date, time, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [fullName, phone, service, date, time, notes || ""],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: "Database insert error" });
          }

          res.status(201).json({
            id: this.lastID,
            message: "Appointment created successfully"
          });
        }
      );
    }
  );
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});