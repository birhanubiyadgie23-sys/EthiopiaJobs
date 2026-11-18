import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db.js";

function getSessionToken(req) {
  const cookieHeader = req.headers?.cookie;

  if (typeof cookieHeader !== "string") {
    return null;
  }

  let token = null;

  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (name === "admin_session") {
      if (token !== null) return null;
      token = value;
    }
  }

  return token;
}

function rejectSession(res) {
  res.setHeader("Cache-Control", "no-store");

  res.status(401).json({
    ok: false,
    authenticated: false
  });

  return null;
}

export async function requireAdmin(req, res) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Admin session configuration is invalid");
  }

  const token = getSessionToken(req);

  if (
    !token ||
    token.length > 4096
  ) {
    return rejectSession(res);
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return rejectSession(res);
  }

  const [payload, signature] = parts;

  if (
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return rejectSession(res);
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();

  const providedSignature = Buffer.from(
    signature,
    "base64url"
  );

  if (
    providedSignature.length !== expectedSignature.length ||
    providedSignature.toString("base64url") !== signature ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return rejectSession(res);
  }

  let session;

  try {
    const decoded = Buffer.from(payload, "base64url");

    if (
      decoded.toString("base64url") !== payload ||
      decoded.length > 2048
    ) {
      return rejectSession(res);
    }

    session = JSON.parse(decoded.toString("utf8"));
  } catch {
    return rejectSession(res);
  }

  if (
    !session ||
    typeof session.sub !== "string" ||
    !/^[1-9]\d{0,18}$/.test(session.sub) ||
    typeof session.email !== "string" ||
    session.email.length < 3 ||
    session.email.length > 254 ||
    !Number.isSafeInteger(session.exp) ||
    session.exp <= Math.floor(Date.now() / 1000)
  ) {
    return rejectSession(res);
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
    return rejectSession(res);
  }

  return {
    id: admins[0].id,
    email: admins[0].email
  };
}
