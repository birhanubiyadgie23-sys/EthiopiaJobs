import { sql } from "../_lib/db.js";
import {
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const { email, password } = req.body || {};
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!sessionSecret || sessionSecret.length < 32) {
      console.error("Admin session configuration is invalid");
      return res.status(500).json({
        ok: false,
        error: "Internal server error"
      });
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length < 1 ||
      password.length > 128
    ) {
      return res.status(401).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const rows = await sql`
      SELECT id, email, password_hash
      FROM admins
      WHERE LOWER(email) = LOWER(${email.trim()})
        AND is_active = true
      LIMIT 1
    `;

    if (rows.length !== 1) {
      return res.status(401).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const admin = rows[0];
    const parts = admin.password_hash.split("$");

    if (
      parts.length !== 3 ||
      parts[0] !== "scrypt" ||
      !/^[0-9a-f]{32}$/i.test(parts[1]) ||
      !/^[0-9a-f]{128}$/i.test(parts[2])
    ) {
      return res.status(401).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const salt = Buffer.from(parts[1], "hex");
    const storedHash = Buffer.from(parts[2], "hex");
    const suppliedHash = await scrypt(password, salt, 64);

    if (!timingSafeEqual(storedHash, suppliedHash)) {
      return res.status(401).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const payload = Buffer.from(JSON.stringify({
      sub: String(admin.id),
      email: admin.email,
      exp: Math.floor(Date.now() / 1000) + 28800
    })).toString("base64url");

    const signature = createHmac("sha256", sessionSecret)
      .update(payload)
      .digest("base64url");

    const token = `${payload}.${signature}`;

    res.setHeader(
      "Set-Cookie",
      `admin_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
    );

    return res.status(200).json({
      ok: true,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("Admin login error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
