"use strict";

const translations = {
  am: {
    navLatest: "አዳዲስ ሥራዎች",
    navSources: "ምንጮች",
    navAbout: "ስለ እኛ",
    eyebrow: "የኢትዮጵያ የሥራ ዕድሎች ማዕከል",
    heroTitle: "ትክክለኛውን የሥራ ዕድል<br>በቀላሉ ያግኙ",
    heroText: "ከጋዜጦችና ከታመኑ ምንጮች የወጡ የሥራ ማስታወቂያዎችን በአንድ ቦታ ይፈልጉ።",
    searchLabel: "የሥራ ስም ወይም ድርጅት",
    searchPlaceholder: "ለምሳሌ፦ Accountant",
    locationLabel: "ከተማ / ክልል",
    locationPlaceholder: "Addis Ababa",
    searchButton: "ፈልግ",
    heroNote: "የማስታወቂያዎች ምንጭ በግልጽ ይጠቀሳል",
    statOne: "የተለያዩ የሥራ ምንጮች",
    statTwo: "በአማርኛና በእንግሊዝኛ",
    statThree: "የመጀመሪያ ማመልከቻ መመሪያ",
    latestEyebrow: "አሁን ይመልከቱ",
    latestTitle: "የቅርብ ጊዜ ማስታወቂያዎች",
    phaseLabel: "Phase 2 · የሥራ ፍለጋ",
    sourceEyebrow: "ታማኝ ምንጮች",
    sourceTitle: "ምንጩን እናሳያለን።",
    sourceText: "የሥራ ማስታወቂያው የታተመበትን ጋዜጣ፣ ቀንና የመጀመሪያ የማመልከቻ መንገድ በግልጽ እናቀርባለን።",
    aboutTitle: "ቀላል፣ ግልጽ፣ የታመነ",
    aboutText: "Ethiopia Jobs የሥራ ማስታወቂያዎችን ያሰባስባል፤ ማመልከቻውን ግን በዋናው ማስታወቂያ ላይ በተገለጸው መንገድ ያከናውኑ።",
    footerText: "መብቱ የተጠበቀ ነው።",
    loading: "በመጫን ላይ...",
    loadError: "ማስታወቂያዎችን ማምጣት አልተቻለም።",
    noJobs: "የሚዛመድ የሥራ ማስታወቂያ አልተገኘም።",
    deadline: "የመጨረሻ ቀን",
    previous: "ቀዳሚ",
    next: "ቀጣይ",
    page: "ገጽ",
    announcements: "ማስታወቂያዎች"
  },
  en: {
    navLatest: "Latest jobs",
    navSources: "Sources",
    navAbout: "About",
    eyebrow: "ETHIOPIA'S CAREER OPPORTUNITY HUB",
    heroTitle: "Find the right<br>opportunity with ease",
    heroText: "Discover job announcements published by newspapers and trusted sources, all in one place.",
    searchLabel: "Job title or organization",
    searchPlaceholder: "e.g. Accountant",
    locationLabel: "City / Region",
    locationPlaceholder: "Addis Ababa",
    searchButton: "Search",
    heroNote: "Every listing clearly identifies its source",
    statOne: "Multiple job sources",
    statTwo: "Amharic and English",
    statThree: "Original application instructions",
    latestEyebrow: "EXPLORE",
    latestTitle: "Latest announcements",
    phaseLabel: "Phase 2 · Job search",
    sourceEyebrow: "TRUSTED SOURCES",
    sourceTitle: "The source matters.",
    sourceText: "We show the newspaper, publication date, and the original application method for each announcement.",
    aboutTitle: "Simple. Clear. Trusted.",
    aboutText: "Ethiopia Jobs brings job announcements together. Apply only through the method stated in the original announcement.",
    footerText: "All rights reserved.",
    loading: "Loading...",
    loadError: "Unable to load announcements. Please try again.",
    noJobs: "No matching job announcements were found.",
    deadline: "Deadline",
    previous: "Previous",
    next: "Next",
    page: "Page",
    announcements: "announcements"
  }
};

let language = "am";
let currentPage = 1;
let totalPages = 1;
let totalJobs = 0;
let jobs = [];
let loadingFailed = false;
let requestNumber = 0;

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "";
  const dateValue = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) return "";
  return dateValue.toLocaleDateString(language === "am" ? "am-ET" : "en-ET");
}

function updateStatus() {
  const status = $("#jobs-status");
  if (!status) return;

  if (loadingFailed) {
    status.textContent = translations[language].loadError;
  } else if (totalJobs > 0) {
    status.textContent = `${totalJobs} ${translations[language].announcements}`;
  } else {
    status.textContent = "";
  }
}

function updatePagination() {
  const pagination = $("#jobs-pagination");
  if (!pagination) return;

  pagination.hidden = totalPages <= 1;
  $("#jobs-prev").disabled = currentPage <= 1;
  $("#jobs-next").disabled = currentPage >= totalPages;
  $("#jobs-prev").textContent = translations[language].previous;
  $("#jobs-next").textContent = translations[language].next;
  $("#jobs-page-label").textContent = `${translations[language].page} ${currentPage} / ${totalPages}`;
}

function renderJobs() {
  const list = $("#jobs-list");
  if (!list) return;

  if (!jobs.length) {
    list.innerHTML = `<div class="jobs-empty">${escapeHtml(translations[language].noJobs)}</div>`;
    return;
  }

  list.innerHTML = jobs.map((job) => {
    const title = language === "am"
      ? (job.title_am || job.title_en)
      : (job.title_en || job.title_am);
    const city = language === "am"
      ? (job.city_am || job.city_en)
      : (job.city_en || job.city_am);
    const region = language === "am"
      ? (job.region_am || job.region_en)
      : (job.region_en || job.region_am);
    const category = language === "am"
      ? (job.category_am || job.category_en)
      : (job.category_en || job.category_am);
    const place = [city, region].filter(Boolean).join(" · ");

    return `
      <a class="job-card" href="/job.html?id=${encodeURIComponent(job.id)}">
        <h3>${escapeHtml(title)}</h3>
        <div class="job-org">${escapeHtml(job.organization_name)}</div>
        <div class="job-meta">
          ${category ? `<span>${escapeHtml(category)}</span>` : ""}
          ${place ? `<span>${escapeHtml(place)}</span>` : ""}
          ${job.employment_type ? `<span>${escapeHtml(job.employment_type)}</span>` : ""}
        </div>
        ${job.deadline_at
          ? `<div class="job-deadline">${escapeHtml(translations[language].deadline)}: ${escapeHtml(formatDate(job.deadline_at))}</div>`
          : ""}
      </a>
    `;
  }).join("");
}

function setLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translation = translations[language][element.dataset.i18n];
    if (translation !== undefined) element.innerHTML = translation;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const translation = translations[language][element.dataset.i18nPlaceholder];
    if (translation !== undefined) element.placeholder = translation;
  });

  const languageButton = $("#language-toggle");
  if (languageButton) languageButton.textContent = language === "am" ? "EN" : "አማ";

  updateStatus();
  updatePagination();
  renderJobs();
}

async function loadJobs() {
  const thisRequest = ++requestNumber;
  const status = $("#jobs-status");
  if (status) status.textContent = translations[language].loading;

  const params = new URLSearchParams({
    page: String(currentPage),
    limit: "10"
  });
  const keyword = $("#job-search")?.value.trim() || "";
  const location = $("#location-search")?.value.trim() || "";

  if (keyword) params.set("q", keyword);
  if (location) params.set("location", location);

  try {
    const response = await fetch(`/api/jobs?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok || data.ok !== true || !Array.isArray(data.data)) {
      throw new Error("The jobs API returned an invalid response.");
    }

    if (thisRequest !== requestNumber) return;

    jobs = data.data;
    totalJobs = Number(data.pagination?.total || 0);
    totalPages = Math.max(1, Number(data.pagination?.pages || 1));
    currentPage = Math.min(currentPage, totalPages);
    loadingFailed = false;
  } catch (error) {
    if (thisRequest !== requestNumber) return;
    console.error("Unable to load jobs:", error);
    jobs = [];
    totalJobs = 0;
    totalPages = 1;
    loadingFailed = true;
  }

  updateStatus();
  updatePagination();
  renderJobs();
}

$("#language-toggle")?.addEventListener("click", () => {
  setLanguage(language === "am" ? "en" : "am");
});

$("#search-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  loadJobs();
  $("#latest")?.scrollIntoView({ behavior: "smooth" });
});

$("#jobs-prev")?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadJobs();
  }
});

$("#jobs-next")?.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadJobs();
  }
});

const yearElement = $("#year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

setLanguage("am");
loadJobs();
