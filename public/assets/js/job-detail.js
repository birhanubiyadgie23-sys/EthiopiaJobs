"use strict";

(() => {
  const root = document.getElementById("job-detail-content");
  const status = document.getElementById("job-detail-status");
  const languageButton = document.getElementById("language-toggle");
  const backLabel = document.getElementById("back-label");

  let language = "am";
  let currentJob = null;

  const text = {
    am: {
      back: "ወደ ሁሉም ሥራዎች ተመለስ",
      loading: "የሥራ መረጃውን በማምጣት ላይ...",
      notFound: "ይህ የሥራ ማስታወቂያ አልተገኘም ወይም ጊዜው አልፎታል።",
      error: "የሥራ መረጃውን ማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
      description: "የሥራው መግለጫ",
      requirements: "የሥራ መስፈርቶች",
      application: "እንዴት ማመልከት ይቻላል?",
      quickFacts: "የሥራ ዝርዝር መረጃ",
      category: "የሥራ ዘርፍ",
      location: "የሥራ ቦታ",
      type: "የሥራ አይነት",
      education: "የትምህርት ደረጃ",
      experience: "የሥራ ልምድ",
      published: "የታተመበት ቀን",
      deadline: "የማመልከቻ መጨረሻ",
      source: "የማስታወቂያው ምንጭ",
      website: "የማመልከቻ ድረገጽ ክፈት",
      email: "በኢሜይል አመልክት",
      phone: "በስልክ ያግኙ",
      edition: "የወጣበት ቀን",
      page: "ገጽ",
      sourceLink: "ዋናውን ምንጭ ይመልከቱ",
      noSource: "የዋናው ምንጭ ዝርዝር ገና አልተጨመረም።",
      noApplication: "የማመልከቻ መረጃ በዚህ ማስታወቂያ ላይ አልተገለጸም።",
      years: "ዓመት",
      unknown: "አልተገለጸም"
    },

    en: {
      back: "Back to all jobs",
      loading: "Loading job details...",
      notFound: "This job announcement was not found or has expired.",
      error: "Unable to load this job. Please try again.",
      description: "Job description",
      requirements: "Requirements",
      application: "How to apply",
      quickFacts: "Job overview",
      category: "Category",
      location: "Location",
      type: "Employment type",
      education: "Education level",
      experience: "Experience",
      published: "Published date",
      deadline: "Application deadline",
      source: "Original announcement source",
      website: "Open application website",
      email: "Apply by email",
      phone: "Contact by phone",
      edition: "Edition date",
      page: "Page",
      sourceLink: "View original source",
      noSource: "Original source details have not been added yet.",
      noApplication: "Application instructions are not available for this announcement.",
      years: "years",
      unknown: "Not specified"
    }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function localized(amValue, enValue) {
    return language === "am"
      ? (amValue || enValue || "")
      : (enValue || amValue || "");
  }

  function formatDate(value) {
    if (!value) return text[language].unknown;

    const date = new Date(
      `${String(value).slice(0, 10)}T00:00:00`
    );

    if (Number.isNaN(date.getTime())) {
      return text[language].unknown;
    }

    return date.toLocaleDateString(
      language === "am" ? "am-ET" : "en-ET",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );
  }

  function safeHttpUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value));

      return ["http:", "https:"].includes(url.protocol)
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function section(title, content) {
    if (!String(content || "").trim()) return "";

    return `
      <section class="detail-section">
        <h2>${escapeHtml(title)}</h2>
        <p class="detail-copy">${escapeHtml(content)}</p>
      </section>
    `;
  }

  function fact(label, value) {
    if (!String(value || "").trim()) return "";

    return `
      <div class="detail-fact">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function renderSources(sources, sourceReference) {
    const items = Array.isArray(sources) ? sources : [];
    const label = text[language];

    if (!items.length) {
      return sourceReference
        ? `<p class="detail-copy">${escapeHtml(sourceReference)}</p>`
        : `<p class="detail-muted">${escapeHtml(label.noSource)}</p>`;
    }

    return items.map((source) => {
      const name = localized(
        source.newspaper_am,
        source.newspaper_en
      );

      const url = safeHttpUrl(source.source_url);
      const edition = source.edition_date
        ? formatDate(source.edition_date)
        : "";

      const page = source.page_number
        ? String(source.page_number)
        : "";

      const note = source.source_note || "";

      return `
        <div class="source-item">
          <strong>${escapeHtml(name || label.unknown)}</strong>

          ${edition
            ? `<span>${escapeHtml(label.edition)}: ${escapeHtml(edition)}</span>`
            : ""}

          ${page
            ? `<span>${escapeHtml(label.page)}: ${escapeHtml(page)}</span>`
            : ""}

          ${note
            ? `<p>${escapeHtml(note)}</p>`
            : ""}

          ${url
            ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label.sourceLink)} ↗</a>`
            : ""}
        </div>
      `;
    }).join("");
  }

  function renderApplication(job) {
    const label = text[language];

    const method = localized(
      job.application_method_am,
      job.application_method_en
    );

    const website = safeHttpUrl(job.application_url);
    const email = String(job.application_email || "").trim();
    const phone = String(job.application_phone || "").trim();
    const phoneHref = phone.replace(/[^0-9+]/g, "");

    const actions = [];

    if (website) {
      actions.push(`
        <a class="apply-action primary"
           href="${escapeHtml(website)}"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHtml(label.website)} ↗
        </a>
      `);
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      actions.push(`
        <a class="apply-action"
           href="mailto:${escapeHtml(email)}">
          ${escapeHtml(label.email)}
        </a>
      `);
    }

    if (phoneHref && /[0-9]/.test(phoneHref)) {
      actions.push(`
        <a class="apply-action"
           href="tel:${escapeHtml(phoneHref)}">
          ${escapeHtml(label.phone)}
        </a>
      `);
    }

    return `
      <section class="detail-section application-section">
        <h2>${escapeHtml(label.application)}</h2>

        <p class="detail-copy">
          ${escapeHtml(method || label.noApplication)}
        </p>

        ${actions.length
          ? `<div class="apply-actions">${actions.join("")}</div>`
          : ""}
      </section>
    `;
  }

  function render() {
    if (!currentJob || !root) return;

    const job = currentJob;
    const label = text[language];

    const title = localized(job.title_am, job.title_en);
    const organization = job.organization_name || label.unknown;

    const location = [
      localized(job.city_am, job.city_en),
      localized(job.region_am, job.region_en)
    ].filter(Boolean).join(" · ");

    const category = localized(
      job.category_am,
      job.category_en
    );

    const employmentType = job.employment_type || "";
    const education = job.education_level || "";

    const experience =
      job.experience_years !== null &&
      job.experience_years !== undefined
        ? `${job.experience_years} ${label.years}`
        : "";

    const facts = [
      fact(label.category, category),
      fact(label.location, location),
      fact(label.type, employmentType),
      fact(label.education, education),
      fact(label.experience, experience),
      fact(
        label.published,
        job.published_at ? formatDate(job.published_at) : ""
      ),
      fact(
        label.deadline,
        job.deadline_at ? formatDate(job.deadline_at) : ""
      )
    ].filter(Boolean).join("");

    root.innerHTML = `
      <article class="detail-main">

        <div class="detail-heading">
          <span class="detail-kicker">
            ETHIOPIA JOBS · ${escapeHtml(label.source)}
          </span>

          <h1>${escapeHtml(title || label.unknown)}</h1>

          <p class="detail-organization">
            ${escapeHtml(organization)}
          </p>

          <div class="detail-tags">
            ${category
              ? `<span>${escapeHtml(category)}</span>`
              : ""}

            ${location
              ? `<span>${escapeHtml(location)}</span>`
              : ""}

            ${employmentType
              ? `<span>${escapeHtml(employmentType)}</span>`
              : ""}
          </div>
        </div>

        ${section(
          label.description,
          localized(job.description_am, job.description_en)
        )}

        ${section(
          label.requirements,
          localized(job.requirements_am, job.requirements_en)
        )}

        ${renderApplication(job)}

        <section class="detail-section">
          <h2>${escapeHtml(label.source)}</h2>

          ${renderSources(
            job.sources,
            job.source_reference
          )}
        </section>

      </article>

      <aside class="detail-aside">

        <div class="detail-facts-card">
          <h2>${escapeHtml(label.quickFacts)}</h2>

          ${facts || `
            <p class="detail-muted">
              ${escapeHtml(label.unknown)}
            </p>
          `}
        </div>

        <div class="detail-trust-card">
          <span class="trust-mark">✓</span>

          <strong>
            ${language === "am"
              ? "በዋናው ምንጭ ያመልክቱ"
              : "Apply through the original source"}
          </strong>

          <p>
            ${language === "am"
              ? "ከማመልከትዎ በፊት የማስታወቂያውን ዝርዝርና ቀን ያረጋግጡ።"
              : "Review the announcement and deadline before applying."}
          </p>
        </div>

      </aside>
    `;

    document.title =
      `${title || "Job details"} | Ethiopia Jobs`;
  }

  function showMessage(message, isError = false) {
    if (!status) return;

    status.hidden = false;
    status.classList.toggle("detail-error", isError);
    status.textContent = message;
  }

  async function loadJob() {
    const params = new URLSearchParams(
      window.location.search
    );

    const id = params.get("id");

    if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
      showMessage(text[language].notFound, true);
      return;
    }

    showMessage(text[language].loading);

    try {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(id)}`,
        {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

      const result = await response.json();

      if (response.status === 404) {
        throw new Error("NOT_FOUND");
      }

      if (
        !response.ok ||
        result.ok !== true ||
        !result.data
      ) {
        throw new Error("LOAD_FAILED");
      }

      currentJob = result.data;

      status.hidden = true;
      root.hidden = false;

      render();

    } catch (error) {
      console.error("Job detail request failed:", error);

      const isNotFound =
        error.message === "NOT_FOUND";

      showMessage(
        isNotFound
          ? text[language].notFound
          : text[language].error,
        true
      );
    }
  }

  function setLanguage() {
    if (languageButton) {
      languageButton.textContent =
        language === "am" ? "EN" : "አማ";
    }

    if (backLabel) {
      backLabel.textContent = text[language].back;
    }

    if (currentJob) {
      render();
    }
  }

  languageButton?.addEventListener("click", () => {
    language = language === "am" ? "en" : "am";
    setLanguage();
  });

  if (backLabel) {
    backLabel.textContent = text[language].back;
  }

  loadJob();
})();
