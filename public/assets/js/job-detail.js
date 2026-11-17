"use strict";

let language = "am";
let job = null;

const root = document.getElementById("job-detail");
const rawId = new URLSearchParams(window.location.search).get("id");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function pick(amharic, english) {
  return language === "am"
    ? (amharic || english || "")
    : (english || amharic || "");
}

function formatDate(value) {
  if (!value) return "";
  const dateValue = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) return "";
  return dateValue.toLocaleDateString(language === "am" ? "am-ET" : "en-ET");
}

function safeHttpUrl(value) {
  if (!value) return "";

  try {
    const parsed = new URL(String(value), window.location.origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function render() {
  if (!job || !root) return;

  const place = [
    pick(job.city_am, job.city_en),
    pick(job.region_am, job.region_en)
  ].filter(Boolean).join(" · ");

  const sources = (Array.isArray(job.sources) ? job.sources : []).map((source) => {
    const sourceUrl = safeHttpUrl(source.source_url);
    const newspaper = pick(source.newspaper_am, source.newspaper_en);
    const editionDate = source.edition_date ? ` · ${escapeHtml(formatDate(source.edition_date))}` : "";
    const pageNumber = source.page_number
      ? ` · ${language === "am" ? "ገጽ " : "Page "}${escapeHtml(source.page_number)}`
      : "";
    const sourceLink = sourceUrl
      ? ` · <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${language === "am" ? "የመጀመሪያ ምንጭ" : "Original source"}</a>`
      : "";

    return `<li>${escapeHtml(newspaper)}${editionDate}${pageNumber}${sourceLink}</li>`;
  }).join("");

  const applicationMethod = pick(job.application_method_am, job.application_method_en);
  const applicationUrl = safeHttpUrl(job.application_url);
  const category = pick(job.category_am, job.category_en);
  const description = pick(job.description_am, job.description_en);
  const requirements = pick(job.requirements_am, job.requirements_en);

  root.innerHTML = `
    <h1>${escapeHtml(pick(job.title_am, job.title_en))}</h1>
    <p><strong>${escapeHtml(job.organization_name)}</strong></p>
    <div class="detail-meta">
      ${place ? `<span>${escapeHtml(place)}</span>` : ""}
      ${category ? `<span>${escapeHtml(category)}</span>` : ""}
      ${job.employment_type ? `<span>${escapeHtml(job.employment_type)}</span>` : ""}
      ${job.deadline_at
        ? `<span>${language === "am" ? "የመጨረሻ ቀን" : "Deadline"}: ${escapeHtml(formatDate(job.deadline_at))}</span>`
        : ""}
    </div>

    <h2>${language === "am" ? "የሥራ መግለጫ" : "Description"}</h2>
    <p>${escapeHtml(description || "—")}</p>

    <h2>${language === "am" ? "መስፈርቶች" : "Requirements"}</h2>
    <p>${escapeHtml(requirements || "—")}</p>

    <h2>${language === "am" ? "የማመልከቻ መንገድ" : "How to apply"}</h2>
    <div class="apply-note">
      <p>${escapeHtml(applicationMethod || (language === "am"
        ? "በዋናው ማስታወቂያ ላይ የተገለጸውን ይከተሉ።"
        : "Follow the original announcement."))}</p>
      ${applicationUrl
        ? `<p><a href="${escapeHtml(applicationUrl)}" target="_blank" rel="noopener noreferrer">${language === "am" ? "የማመልከቻ አገናኝ" : "Application link"}</a></p>`
        : ""}
      ${job.application_email ? `<p>Email: ${escapeHtml(job.application_email)}</p>` : ""}
      ${job.application_phone ? `<p>Phone: ${escapeHtml(job.application_phone)}</p>` : ""}
      <strong>${language === "am"
        ? "ማመልከቻ በዚህ ድረገጽ አይቀርብም።"
        : "Applications are not submitted on this website."}</strong>
    </div>

    ${sources ? `<h2>${language === "am" ? "ምንጮች" : "Sources"}</h2><ul>${sources}</ul>` : ""}
  `;
}

async function loadJob() {
  if (!rawId || !/^[1-9]\d{0,18}$/.test(rawId)) {
    root.textContent = language === "am" ? "የማስታወቂያው ቁጥር ትክክል አይደለም።" : "Invalid job ID.";
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(rawId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok || data.ok !== true || !data.data) {
      throw new Error("Job not found");
    }

    job = data.data;
    render();
  } catch (error) {
    console.error("Unable to load job details:", error);
    root.textContent = language === "am"
      ? "ይህ ማስታወቂያ አልተገኘም ወይም ጊዜው አልፎታል።"
      : "Job not found or expired.";
  }
}

const languageButton = document.getElementById("language-toggle");
languageButton?.addEventListener("click", () => {
  language = language === "am" ? "en" : "am";
  document.documentElement.lang = language;
  languageButton.textContent = language === "am" ? "EN" : "አማ";
  document.getElementById("back-label").textContent = language === "am"
    ? "ወደ ዋናው ገጽ"
    : "Back to home";
  if (job) render();
});

loadJob();
