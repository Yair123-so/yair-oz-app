import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(
  session({
    name: "admin.sid",
    secret: process.env.SESSION_SECRET || "change_me_now_please",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר." },
});

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  return res.status(401).json({ error: "לא מורשה" });
}

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  try {
    const password = String(req.body?.password || "").trim();

    if (!password) {
      return res.status(400).json({ error: "יש להזין סיסמה" });
    }

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
      return res.status(500).json({ error: "חסר ADMIN_PASSWORD_HASH" });
    }

    const ok = await bcrypt.compare(password, hash);

    if (!ok) {
      return res.status(401).json({ error: "סיסמה שגויה" });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error("session regenerate error:", err);
        return res.status(500).json({ error: "שגיאת התחברות" });
      }

      req.session.isAdmin = true;
      return res.json({ ok: true });
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ error: "שגיאת שרת" });
  }
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("logout error:", err);
      return res.status(500).json({ error: "שגיאת התנתקות" });
    }

    res.clearCookie("admin.sid");
    return res.json({ ok: true });
  });
});

app.get("/api/admin/session", (req, res) => {
  return res.json({ isAdmin: !!req.session?.isAdmin });
});

app.get("/api/admin/appointments", requireAdmin, async (req, res) => {
  try {
    const data = await convexClient.query(api.appointments.listAll, {});

    const bookedOnly = data
      .filter((item) => item.status === "booked")
      .sort((a, b) => {
        const aKey = `${a.date} ${a.time}`;
        const bKey = `${b.date} ${b.time}`;
        return aKey.localeCompare(bKey, "he");
      });

    return res.json(bookedOnly);
  } catch (error) {
    console.error("get appointments error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת התורים" });
  }
});

app.delete("/api/admin/appointments/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ error: "מזהה תור חסר" });
    }

    await convexClient.mutation(api.appointments.remove, { id });
    return res.json({ ok: true });
  } catch (error) {
    console.error("delete appointment error:", error);
    return res.status(500).json({ error: "שגיאה במחיקת התור" });
  }
});

app.get("/api/public/weekly-availability", async (req, res) => {
  try {
    const data = await convexClient.query(api.weeklyAvailability.listAll, {});
    return res.json(data);
  } catch (error) {
    console.error("public weekly availability error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת הזמינות" });
  }
});

app.get("/api/public/appointments/by-date", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();

    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    const data = await convexClient.query(api.appointments.listByDate, { date });
    return res.json(data);
  } catch (error) {
    console.error("public appointments by date error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת התורים" });
  }
});

app.post("/api/admin/weekly-availability", requireAdmin, async (req, res) => {
  try {
    const dayOfWeek = String(req.body?.dayOfWeek || "").trim();
    const time = String(req.body?.time || "").trim();
    const isOpen = !!req.body?.isOpen;

    if (!dayOfWeek || !time) {
      return res.status(400).json({ error: "חסרים dayOfWeek או time" });
    }

    await convexClient.mutation(api.weeklyAvailability.setSlot, {
      dayOfWeek,
      time,
      isOpen,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("weekly availability set error:", error);
    return res.status(500).json({ error: "שגיאה בשמירת הזמינות" });
  }
});
const ADMIN_TIMES = [
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

app.get("/api/admin/availability/by-date", requireAdmin, async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();
    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    const data = await convexClient.query(api.availability.getByDate, { date });
    return res.json(data);
  } catch (error) {
    console.error("admin availability by date error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת הזמינות" });
  }
});

app.post("/api/admin/availability/set", requireAdmin, async (req, res) => {
  try {
    const date = String(req.body?.date || "").trim();
    const time = String(req.body?.time || "").trim();
    const isOpen = !!req.body?.isOpen;

    if (!date || !time) {
      return res.status(400).json({ error: "חסרים date או time" });
    }

    await convexClient.mutation(api.availability.setAvailability, {
      date,
      time,
      isOpen,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("admin availability set error:", error);
    return res.status(500).json({ error: "שגיאה בשמירת הזמינות" });
  }
});

app.post("/api/admin/availability/open-all", requireAdmin, async (req, res) => {
  try {
    const date = String(req.body?.date || "").trim();
    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    await convexClient.mutation(api.availability.openAllForDate, {
      date,
      times: ADMIN_TIMES,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("admin open all error:", error);
    return res.status(500).json({ error: "שגיאה בפתיחת כל היום" });
  }
});

app.post("/api/admin/availability/close-all", requireAdmin, async (req, res) => {
  try {
    const date = String(req.body?.date || "").trim();
    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    await convexClient.mutation(api.availability.closeAllForDate, {
      date,
      times: ADMIN_TIMES,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("admin close all error:", error);
    return res.status(500).json({ error: "שגיאה בסגירת כל היום" });
  }
});

app.post("/api/admin/availability/reset-all", requireAdmin, async (req, res) => {
  try {
    const date = String(req.body?.date || "").trim();
    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    await convexClient.mutation(api.availability.resetAllForDate, { date });
    return res.json({ ok: true });
  } catch (error) {
    console.error("admin reset all error:", error);
    return res.status(500).json({ error: "שגיאה באיפוס היום" });
  }
});

app.post("/api/admin/availability/copy-day", requireAdmin, async (req, res) => {
  try {
    const sourceDate = String(req.body?.sourceDate || "").trim();
    const targetDate = String(req.body?.targetDate || "").trim();

    if (!sourceDate || !targetDate) {
      return res.status(400).json({ error: "חסרים sourceDate או targetDate" });
    }

    await convexClient.mutation(api.availability.copyDateToDate, {
      sourceDate,
      targetDate,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("admin copy day error:", error);
    return res.status(500).json({ error: "שגיאה בהעתקת יום" });
  }
});

app.get("/api/public/availability/by-date", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();

    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    const data = await convexClient.query(api.availability.getByDate, { date });
    return res.json(data);
  } catch (error) {
    console.error("public availability by date error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת הזמינות" });
  }
});

app.get("/api/public/appointments/by-date", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();

    if (!date) {
      return res.status(400).json({ error: "חסר תאריך" });
    }

    const data = await convexClient.query(api.appointments.listByDate, { date });
    return res.json(data);
  } catch (error) {
    console.error("public appointments by date error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת התורים" });
  }
});
app.get("/api/public/availability/all", async (req, res) => {
  try {
    const data = await convexClient.query(api.availability.listAll, {});
    return res.json(data);
  } catch (error) {
    console.error("public availability all error:", error);
    return res.status(500).json({ error: "שגיאה בטעינת הימים" });
  }
});
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});