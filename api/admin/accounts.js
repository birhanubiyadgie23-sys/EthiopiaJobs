import { sql } from "../_lib/db.js";
import { requireAdmin } from "../_lib/admin-auth.js";
import {
  randomBytes,
  scrypt as scryptCallback
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

function validEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validId(value) {
  const id = String(value ?? "");
  return /^[1-9]\d{0,18}$/.test(id) ? id : null;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const currentAdmin = await requireAdmin(req, res);
    if (!currentAdmin) return;

    if (req.method === "GET") {
      const admins = await sql`
        SELECT id, email, is_active, created_at, updated_at
        FROM admins
        ORDER BY id ASC
      `;
      return res.status(200).json({ ok: true, data: admins });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = body.password;

      if (!validEmail(email) || typeof password !== "string" ||
          password.length < 12 || password.length > 128) {
        return res.status(400).json({
          ok: false,
          error: "Valid email and a password of 12–128 characters are required"
        });
      }

      const passwordHash = await hashPassword(password);
      try {
        const created = await sql`
          INSERT INTO admins (email, password_hash, is_active, created_at, updated_at)
          VALUES (${email}, ${passwordHash}, true, NOW(), NOW())
          RETURNING id, email, is_active, created_at, updated_at
        `;
        return res.status(201).json({ ok: true, data: created[0] });
      } catch (error) {
        if (error?.code === "23505" || /unique|duplicate/i.test(error?.message || "")) {
          return res.status(409).json({ ok: false, error: "An admin with this email already exists" });
        }
        throw error;
      }
    }

    const body = req.body || {};
    const id = validId(body.id);
    if (!id || typeof body.is_active !== "boolean") {
      return res.status(400).json({ ok: false, error: "A valid admin ID and active status are required" });
    }

    if (String(currentAdmin.id) === id && body.is_active === false) {
      return res.status(409).json({ ok: false, error: "You cannot deactivate your own account" });
    }

    const updated = await sql`
      UPDATE admins
      SET is_active = ${body.is_active}, updated_at = NOW()
      WHERE id = ${id}
        AND (
          ${body.is_active} = true
          OR (SELECT COUNT(*) FROM admins WHERE is_active = true) > 1
        )
      RETURNING id, email, is_active, created_at, updated_at
    `;

    if (updated.length !== 1) {
      const exists = await sql`SELECT id FROM admins WHERE id = ${id} LIMIT 1`;
      if (exists.length === 0) {
        return res.status(404).json({ ok: false, error: "Admin account not found" });
      }
      return res.status(409).json({ ok: false, error: "At least one active admin account must remain" });
    }

    return res.status(200).json({ ok: true, data: updated[0] });
  } catch (error) {
    console.error("Admin accounts API error:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
