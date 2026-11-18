import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "../_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || secret.length < 32) {
      return res.status(500).json({
        ok: false,
        error: "Internal server error"
      });
    }

    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return ["", ""];
        return [
          part.slice(0, index).trim(),
          part.slice(index + 1).trim()
        ];
      }).filter(([key]) => key)
    );

    const token = cookies.admin_session;

    if (!token || token.length > 4096) {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    const [payload, signature] = parts;

    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest();

    let providedSignature;

    try {
      providedSignature = Buffer.from(signature, "base64url");
    } catch {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)
    ) {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    let session;

    try {
      session = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
    } catch {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    if (
      !session.sub ||
      !Number.isFinite(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    const admins = await sql`
      SELECT id, email
      FROM admins
      WHERE id = ${session.sub}
        AND LOWER(email) = LOWER(${session.email})
        AND is_active = true
      LIMIT 1
    `;

    if (admins.length !== 1) {
      return res.status(401).json({
        ok: false,
        authenticated: false
      });
    }

    return res.status(200).json({
      ok: true,
      authenticated: true,
      admin: {
        id: admins[0].id,
        email: admins[0].email
      }
    });
  } catch (error) {
    console.error("Admin session verification error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
