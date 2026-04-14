const path = require("path");
const { pathToFileURL } = require("url");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(
  session({
    name: "admin.sid",
    secret: process.env.SESSION_SECRET,
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

let convexClient = null;
let api = null;
let convexReady = null;

async function initConvex() {
  const convexModule = await import("convex/browser");
  const apiUrl = pathToFileURL(
    path.join(__dirname, "..", "convex", "_generated", "api.js")
  ).href;
  const apiModule = await import(apiUrl);

  convexClient = new convexModule.ConvexHttpClient(process.env.CONVEX_URL);
  api = apiModule.api;
}

convexReady = initConvex().catch((error) => {
  console.error("Failed to initialize Convex:", error);
  process.exit(1);
});

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
    await convexReady;

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
    await convexReady;

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

app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(3000, "0.0.0.0", () => {
  console.log("SERVER IS RUNNING ON PORT 3000");
});