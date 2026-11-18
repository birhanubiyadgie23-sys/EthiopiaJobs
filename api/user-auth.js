import { sql } from "./_lib/db.js";
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE = "user_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function validEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function ensureUsersTable() {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function getCookie(req) {
  const header = req.headers?.cookie;
  if (typeof header !== "string") return null;
  const found = header.split(";").map(x => x.trim())
    .filter(x => x.startsWith(COOKIE + "="));
  return found.length === 1 ? found[0].slice(COOKIE.length + 1) : null;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeSession(user, secret) {
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id),
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  return payload + "." + sign(payload, secret);
}

async function readSession(req, secret) {
  const token = getCookie(req);
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0])) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(payload, secret));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const decoded = Buffer.from(payload, "base64url");
    if (decoded.toString("base64url") !== payload) return null;
    const session = JSON.parse(decoded.toString("utf8"));
    if (!session || typeof session.sub !== "string" ||
        !/^[1-9]\d{0,18}$/.test(session.sub) ||
        typeof session.email !== "string" ||
        !Number.isSafeInteger(session.exp) ||
        session.exp <= Math.floor(Date.now() / 1000)) return null;
    const rows = await sql`SELECT id, display_name, email FROM users
      WHERE id = ${session.sub} AND LOWER(email) = LOWER(${session.email}) LIMIT 1`;
    return rows.length === 1 ? rows[0] : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt" ||
      !/^[0-9a-f]{32}$/i.test(parts[1]) ||
      !/^[0-9a-f]{128}$/i.test(parts[2])) return false;
  const actual = await scrypt(password, Buffer.from(parts[1], "hex"), 64);
  return timingSafeEqual(Buffer.from(parts[2], "hex"), actual);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(500).json({ ok: false, error: "User account service is not configured" });
  }

  try {
    await ensureUsersTable();

    if (req.method === "GET") {
      const user = await readSession(req, secret);
      return res.status(200).json({ ok: true, authenticated: Boolean(user), user });
    }

    if (req.method === "DELETE") {
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, DELETE");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = req.body || {};
    const action = body.action;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (!validEmail(email) || typeof password !== "string" ||
        password.length < 12 || password.length > 128) {
      return res.status(400).json({
        ok: false,
        error: "የኢሜይል አድራሻ ያስገቡ፤ Password ከ12 እስከ 128 ቁምፊ መሆን አለበት።"
      });
    }

    let user;
    if (action === "register") {
      const displayName = typeof body.display_name === "string"
        ? body.display_name.trim().slice(0, 100) : "";
      if (displayName.length < 2) {
        return res.status(400).json({ ok: false, error: "ሙሉ ስምዎን ያስገቡ።" });
      }
      const passwordHash = await hashPassword(password);
      try {
        const created = await sql`INSERT INTO users
          (display_name, email, password_hash)
          VALUES (${displayName}, ${email}, ${passwordHash})
          RETURNING id, display_name, email`;
        user = created[0];
      } catch (error) {
        if (error?.code === "23505" || /unique|duplicate/i.test(error?.message || "")) {
          return res.status(409).json({ ok: false, error: "ይህ ኢሜይል አስቀድሞ ተመዝግቧል።" });
        }
        throw error;
      }
    } else if (action === "login") {
      const rows = await sql`SELECT id, display_name, email, password_hash
        FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
      if (rows.length !== 1 || !(await verifyPassword(password, rows[0].password_hash))) {
        return res.status(401).json({ ok: false, error: "ኢሜይል ወይም Password ትክክል አይደለም።" });
      }
      user = { id: rows[0].id, display_name: rows[0].display_name, email: rows[0].email };
    } else {
      return res.status(400).json({ ok: false, error: "ትክክለኛ የመግቢያ ወይም የምዝገባ ምርጫ ይምረጡ።" });
    }

    setSessionCookie(res, makeSession(user, secret));
    return res.status(action === "register" ? 201 : 200).json({ ok: true, user });
  } catch (error) {
    console.error("User authentication error:", error?.message || error);
    return res.status(500).json({ ok: false, error: "የአገልግሎት ስህተት ተፈጥሯል።" });
  }
}
