import { sql } from "./_lib/db.js";
import { requireAdmin } from "./_lib/admin-auth.js";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureTable();

    if (req.method === "POST") {
      const body = req.body || {};
      // Honeypot: silently accept automated submissions without storing them.
      if (cleanText(body.website, 200)) {
        return res.status(200).json({ ok: true });
      }

      const name = cleanText(body.name, 100);
      const email = cleanText(body.email, 254).toLowerCase();
      const subject = cleanText(body.subject, 160);
      const message = cleanText(body.message, 5000);

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ ok: false, error: "ሁሉንም አስፈላጊ መስኮች ይሙሉ።" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: "ትክክለኛ ኢሜይል ያስገቡ።" });
      }
      if (name.length < 2 || subject.length < 2 || message.length < 5) {
        return res.status(400).json({ ok: false, error: "የገባው መረጃ በጣም አጭር ነው።" });
      }

      await sql`
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (${name}, ${email}, ${subject}, ${message})
      `;
      return res.status(201).json({ ok: true, message: "Message received" });
    }

    if (req.method === "GET") {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const rows = await sql`
        SELECT id, name, email, subject, message, is_read, created_at
        FROM contact_messages
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return res.status(200).json({ ok: true, data: rows });
    }

    if (req.method === "PATCH") {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const id = Number(req.body?.id);
      const isRead = req.body?.is_read;
      if (!Number.isSafeInteger(id) || id < 1 || typeof isRead !== "boolean") {
        return res.status(400).json({ ok: false, error: "Invalid message update" });
      }
      const rows = await sql`
        UPDATE contact_messages
        SET is_read = ${isRead}
        WHERE id = ${id}
        RETURNING id
      `;
      if (!rows.length) return res.status(404).json({ ok: false, error: "Message not found" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Contact messages API error:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to process contact message" });
  }
}
