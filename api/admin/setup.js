
import { sql } from "../_lib/db.js";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
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
    const { email, password, setupSecret } = req.body || {};

    const expectedSecret = process.env.ADMIN_SETUP_SECRET;

    if (!expectedSecret || typeof setupSecret !== "string") {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    const provided = Buffer.from(setupSecret);
    const expected = Buffer.from(expectedSecret);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);

    const passwordHash =
      `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;

    const result = await sql`
      UPDATE admins
      SET
        password_hash = ${passwordHash},
        is_active = true,
        updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email.trim()})
        AND is_active = false
        AND password_hash = 'TEMPORARY_HASH_NOT_SET'
      RETURNING id, email, is_active
    `;

    if (result.length === 0) {
      return res.status(409).json({
        ok: false,
        error: "Admin setup unavailable or already completed"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Admin account created successfully"
    });
  } catch (error) {
    console.error("Admin setup error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
