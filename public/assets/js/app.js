const translations = {
  am: {
    navLatest:"አዳዲስ ሥራዎች",navSources:"ምንጮች",navAbout:"ስለ እኛ",
    eyebrow:"የኢትዮጵያ የሥራ ዕድሎች ማዕከል",heroTitle:"ትክክለኛውን የሥራ ዕድል<br>በቀላሉ ያግኙ",
    heroText:"ከጋዜጦችና ከታመኑ ምንጮች የወጡ የሥራ ማስታወቂያዎችን በአንድ ቦታ ይፈልጉ።",
    searchLabel:"የሥራ ስም ወይም ድርጅት",searchPlaceholder:"ለምሳሌ፦ Accountant",locationLabel:"ከተማ / ክልል",locationPlaceholder:"Addis Ababa",searchButton:"ፈልግ",
    heroNote:"የማስታወቂያዎች ምንጭ በግልጽ ይጠቀሳል",statOne:"የተለያዩ የሥራ ምንጮች",statTwo:"በአማርኛና በእንግሊዝኛ",statThree:"የመጀመሪያ ማመልከቻ መመሪያ",
    latestEyebrow:"አሁን ይመልከቱ",latestTitle:"የቅርብ ጊዜ ማስታወቂያዎች",phaseLabel:"Phase 1 · መሠረታዊ ዝግጅት",
    emptyTitle:"የሥራ ማስታወቂያዎች በቅርቡ ይጨመራሉ",emptyText:"የመጀመሪያው የመሠረት ደረጃ እየተዘጋጀ ነው። የተረጋገጡ ማስታወቂያዎች ከተጨመሩ በኋላ እዚህ ይታያሉ።",
    sourceEyebrow:"ታማኝ ምንጮች",sourceTitle:"ምንጩን እናሳያለን።",sourceText:"የሥራ ማስታወቂያው የታተመበትን ጋዜጣ፣ ቀንና የመጀመሪያ የማመልከቻ መንገድ በግልጽ እናቀርባለን።",
    aboutTitle:"ቀላል፣ ግልጽ፣ የታመነ",aboutText:"Ethiopia Jobs የሥራ ማስታወቂያዎችን ያሰባስባል፤ ማመልከቻውን ግን በዋናው ማስታወቂያ ላይ በተገለጸው መንገድ ያከናውኑ።",footerText:"መብቱ የተጠበቀ ነው።"
  },
  en: {
    navLatest:"Latest jobs",navSources:"Sources",navAbout:"About",
    eyebrow:"ETHIOPIA'S CAREER OPPORTUNITY HUB",heroTitle:"Find the right<br>opportunity with ease",
    heroText:"Discover job announcements published by newspapers and trusted sources, all in one place.",
    searchLabel:"Job title or organization",searchPlaceholder:"e.g. Accountant",locationLabel:"City / Region",locationPlaceholder:"Addis Ababa",searchButton:"Search",
    heroNote:"Every listing clearly identifies its source",statOne:"Multiple job sources",statTwo:"Amharic and English",statThree:"Original application instructions",
    latestEyebrow:"EXPLORE",latestTitle:"Latest announcements",phaseLabel:"Phase 1 · Foundation",
    emptyTitle:"Job announcements are coming soon",emptyText:"The foundation is being prepared. Verified listings will appear here once they are added.",
    sourceEyebrow:"TRUSTED SOURCES",sourceTitle:"The source matters.",sourceText:"We show the newspaper, publication date, and the original application method for each announcement.",
    aboutTitle:"Simple. Clear. Trusted.",aboutText:"Ethiopia Jobs brings job announcements together. Apply only through the method stated in the original announcement.",footerText:"All rights reserved."
  }
};

let currentLanguage = "am";
const languageButton = document.getElementById("language-toggle");

function setLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = translations[language][element.dataset.i18n];
    if (value) element.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const value = translations[language][element.dataset.i18nPlaceholder];
    if (value) element.placeholder = value;
  });
  languageButton.textContent = language === "am" ? "EN" : "አማ";
}

languageButton?.addEventListener("click", () => setLanguage(currentLanguage === "am" ? "en" : "am"));
document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("search-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = currentLanguage === "am"
    ? "የፍለጋ ተግባር በPhase 2 ይገነባል።"
    : "Search functionality will be implemented in Phase 2.";
  window.alert(message);
});

setLanguage("am");