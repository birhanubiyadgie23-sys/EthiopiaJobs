
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
    categoryLabel: "የሥራ ዘርፍ",
    allCategories: "ሁሉም ዘርፎች",
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
    categoryLabel: "Job category",
    allCategories: "All categories",
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

let categories = [];
let locations = [];

let jobSuggestionTimer = null;
let jobSuggestionRequest = 0;

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

  const dateValue = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(dateValue.getTime())) return "";

  return dateValue.toLocaleDateString(
    language === "am" ? "am-ET" : "en-ET"
  );
}

function updateStatus() {
  const status = $("#jobs-status");
  if (!status) return;

  if (loadingFailed) {
    status.textContent = translations[language].loadError;
  } else if (totalJobs > 0) {
    status.textContent =
      `${totalJobs} ${translations[language].announcements}`;
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

  $("#jobs-page-label").textContent =
    `${translations[language].page} ${currentPage} / ${totalPages}`;
}

function renderJobs() {
  const list = $("#jobs-list");
  if (!list) return;

  if (!jobs.length) {
    list.innerHTML =
      `<div class="jobs-empty">${escapeHtml(translations[language].noJobs)}</div>`;
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

// =========================================
// CATEGORY DROPDOWN
// =========================================

function renderCategories() {
  const select = $("#category-search");
  if (!select) return;

  const selectedValue = select.value;
  select.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = translations[language].allCategories;

  select.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = String(category.id);

    option.textContent = language === "am"
      ? (category.name_am || category.name_en || "")
      : (category.name_en || category.name_am || "");

    select.appendChild(option);
  });

  if (
    [...select.options].some(
      (option) => option.value === selectedValue
    )
  ) {
    select.value = selectedValue;
  }
}

async function loadCategories() {
  try {
    const response = await fetch("/api/categories", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    const result = await response.json();

    if (
      !response.ok ||
      result.ok !== true ||
      !Array.isArray(result.data)
    ) {
      throw new Error("The categories API returned an invalid response.");
    }

    categories = result.data;
    renderCategories();

  } catch (error) {
    console.error("Unable to load categories:", error);
  }
}

// =========================================
// LOCATION AUTOCOMPLETE
// =========================================

function renderLocationSuggestions() {
  const datalist = $("#location-suggestions");
  if (!datalist) return;

  const values = new Set();

  locations.forEach((location) => {
    [
      location.city_am,
      location.city_en,
      location.region_am,
      location.region_en
    ].forEach((value) => {
      const cleanValue = String(value || "").trim();

      if (cleanValue) {
        values.add(cleanValue);
      }
    });
  });

  datalist.replaceChildren();

  [...values]
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      datalist.appendChild(option);
    });
}

async function loadLocations() {
  try {
    const response = await fetch("/api/locations", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    const result = await response.json();

    if (
      !response.ok ||
      result.ok !== true ||
      !Array.isArray(result.data)
    ) {
      throw new Error("The locations API returned an invalid response.");
    }

    locations = result.data;
    renderLocationSuggestions();

  } catch (error) {
    console.error("Unable to load locations:", error);
  }
}

// =========================================
// JOB TITLE / ORGANIZATION AUTOCOMPLETE
// =========================================

function renderJobSuggestions(suggestions) {
  const datalist = $("#job-suggestions");
  if (!datalist) return;

  const values = new Set();

  suggestions.forEach((item) => {
    const value = String(item?.value || "").trim();

    if (value) {
      values.add(value);
    }
  });

  datalist.replaceChildren();

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    datalist.appendChild(option);
  });
}

async function loadJobSuggestions(query = "") {
  const thisRequest = ++jobSuggestionRequest;

  const params = new URLSearchParams({
    suggestions: "1"
  });

  if (query.trim()) {
    params.set("q", query.trim());
  }

  try {
    const response = await fetch(
      `/api/jobs?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      result.ok !== true ||
      !Array.isArray(result.data)
    ) {
      throw new Error("The job suggestions API returned an invalid response.");
    }

    // Ignore old requests that finish after a newer request.
    if (thisRequest !== jobSuggestionRequest) {
      return;
    }

    renderJobSuggestions(result.data);

  } catch (error) {
    if (thisRequest === jobSuggestionRequest) {
      console.warn("Unable to load job suggestions:", error);
    }
  }
}

function scheduleJobSuggestions(query) {
  window.clearTimeout(jobSuggestionTimer);

  jobSuggestionTimer = window.setTimeout(() => {
    loadJobSuggestions(query);
  }, 180);
}

// =========================================
// LANGUAGE
// =========================================

function setLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translation =
      translations[language][element.dataset.i18n];

    if (translation !== undefined) {
      element.innerHTML = translation;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const translation =
      translations[language][element.dataset.i18nPlaceholder];

    if (translation !== undefined) {
      element.placeholder = translation;
    }
  });

  const languageButton = $("#language-toggle");

  if (languageButton) {
    languageButton.textContent = language === "am" ? "EN" : "አማ";
  }

  renderCategories();
  updateStatus();
  updatePagination();
  renderJobs();
}

// =========================================
// JOB SEARCH
// =========================================

async function loadJobs() {
  const thisRequest = ++requestNumber;

  const status = $("#jobs-status");

  if (status) {
    status.textContent = translations[language].loading;
  }

  const params = new URLSearchParams({
    page: String(currentPage),
    limit: "10"
  });

  const keyword =
    $("#job-search")?.value.trim() || "";

  const location =
    $("#location-search")?.value.trim() || "";

  const categoryId =
    $("#category-search")?.value || "";

  if (keyword) {
    params.set("q", keyword);
  }

  if (location) {
    params.set("location", location);
  }

  if (categoryId) {
    params.set("category_id", categoryId);
  }

  try {
    const response = await fetch(
      `/api/jobs?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      data.ok !== true ||
      !Array.isArray(data.data)
    ) {
      throw new Error("The jobs API returned an invalid response.");
    }

    if (thisRequest !== requestNumber) {
      return;
    }

    jobs = data.data;
    totalJobs = Number(data.pagination?.total || 0);
    totalPages = Math.max(
      1,
      Number(data.pagination?.pages || 1)
    );

    currentPage = Math.min(currentPage, totalPages);
    loadingFailed = false;

  } catch (error) {
    if (thisRequest !== requestNumber) {
      return;
    }

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

// =========================================
// EVENT LISTENERS
// =========================================

$("#language-toggle")?.addEventListener("click", () => {
  setLanguage(language === "am" ? "en" : "am");
});

$("#job-search")?.addEventListener("focus", (event) => {
  loadJobSuggestions(event.currentTarget.value.trim());
});

$("#job-search")?.addEventListener("input", (event) => {
  scheduleJobSuggestions(event.currentTarget.value);
});

$("#search-form")?.addEventListener("submit", (event) => {
  event.preventDefault();

  currentPage = 1;
  loadJobs();

  $("#latest")?.scrollIntoView({
    behavior: "smooth"
  });
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

// =========================================
// INITIALIZE
// =========================================

const yearElement = $("#year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

setLanguage("am");
loadCategories();
loadLocations();
loadJobs();
