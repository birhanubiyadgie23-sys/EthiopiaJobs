import { requireAdmin } from "../_lib/admin-auth.js";

const MAX_TEXT_LENGTH = 12000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { text, source, target } = req.body || {};
    if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ ok: false, error: "Text is required and must be under 12,000 characters" });
    }
    if (!["am", "en"].includes(source) || !["am", "en"].includes(target) || source === target) {
      return res.status(400).json({ ok: false, error: "Choose Amharic to English or English to Amharic" });
    }

    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) {
      return res.status(503).json({ ok: false, error: "Translation is not configured. Add GOOGLE_TRANSLATE_API_KEY in Vercel Environment Variables." });
    }

    const response = await fetch("https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target, format: "text" })
    });
    const result = await response.json();
    if (!response.ok || !result?.data?.translations?.[0]?.translatedText) {
      console.error("Translation provider error:", result?.error?.message || response.status);
      return res.status(502).json({ ok: false, error: "Translation provider could not translate this text" });
    }
    return res.status(200).json({ ok: true, translatedText: result.data.translations[0].translatedText });
  } catch (error) {
    console.error("Admin translation error:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Translation failed" });
  }
}
