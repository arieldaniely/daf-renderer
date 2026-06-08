import dafRenderer from "../dist/daf-renderer.esm.js";

const TRACTATES = [
  { name: "Berakhot", he: "ברכות", start: 2, end: 64 },
  { name: "Shabbat", he: "שבת", start: 2, end: 157 },
  { name: "Eruvin", he: "עירובין", start: 2, end: 105 },
  { name: "Pesachim", he: "פסחים", start: 2, end: 121 },
  { name: "Shekalim", he: "שקלים", start: 2, end: 22 },
  { name: "Yoma", he: "יומא", start: 2, end: 88 },
  { name: "Sukkah", he: "סוכה", start: 2, end: 56 },
  { name: "Beitzah", he: "ביצה", start: 2, end: 40 },
  { name: "Rosh Hashanah", he: "ראש השנה", start: 2, end: 35 },
  { name: "Taanit", he: "תענית", start: 2, end: 31 },
  { name: "Megillah", he: "מגילה", start: 2, end: 32 },
  { name: "Moed Katan", he: "מועד קטן", start: 2, end: 29 },
  { name: "Chagigah", he: "חגיגה", start: 2, end: 27 },
  { name: "Yevamot", he: "יבמות", start: 2, end: 122 },
  { name: "Ketubot", he: "כתובות", start: 2, end: 112 },
  { name: "Nedarim", he: "נדרים", start: 2, end: 91 },
  { name: "Nazir", he: "נזיר", start: 2, end: 66 },
  { name: "Sotah", he: "סוטה", start: 2, end: 49 },
  { name: "Gittin", he: "גיטין", start: 2, end: 90 },
  { name: "Kiddushin", he: "קידושין", start: 2, end: 82 },
  { name: "Bava Kamma", he: "בבא קמא", start: 2, end: 119 },
  { name: "Bava Metzia", he: "בבא מציעא", start: 2, end: 119 },
  { name: "Bava Batra", he: "בבא בתרא", start: 2, end: 176 },
  { name: "Sanhedrin", he: "סנהדרין", start: 2, end: 113 },
  { name: "Makkot", he: "מכות", start: 2, end: 24 },
  { name: "Shevuot", he: "שבועות", start: 2, end: 49 },
  { name: "Avodah Zarah", he: "עבודה זרה", start: 2, end: 76 },
  { name: "Horayot", he: "הוריות", start: 2, end: 14 },
  { name: "Zevachim", he: "זבחים", start: 2, end: 120 },
  { name: "Menachot", he: "מנחות", start: 2, end: 110 },
  { name: "Chullin", he: "חולין", start: 2, end: 142 },
  { name: "Bekhorot", he: "בכורות", start: 2, end: 61 },
  { name: "Arakhin", he: "ערכין", start: 2, end: 34 },
  { name: "Temurah", he: "תמורה", start: 2, end: 34 },
  { name: "Keritot", he: "כריתות", start: 2, end: 28 },
  { name: "Meilah", he: "מעילה", start: 2, end: 22 },
  { name: "Kinnim", he: "קינים", start: 23, end: 25 },
  { name: "Tamid", he: "תמיד", start: 25, end: 33 },
  { name: "Middot", he: "מידות", start: 34, end: 37 },
  { name: "Niddah", he: "נידה", start: 2, end: 73 }
];

const refs = {
  tractate: document.querySelector("#tractate"),
  daf: document.querySelector("#daf-select"),
  amud: document.querySelector("#amud"),
  load: document.querySelector("#load"),
  prev: document.querySelector("#prev"),
  next: document.querySelector("#next"),
  status: document.querySelector("#status"),
  subtitle: document.querySelector("#subtitle"),
  toggleVowels: document.querySelector("#toggle-vowels"),
  toggleVowelsLabel: document.querySelector("#toggle-vowels-label"),
  dafHeading: document.querySelector("#daf-heading"),
  dafRefLabel: document.querySelector("#daf-ref-label"),
  chapterLabel: document.querySelector("#chapter-label")
};

let renderer;
let activeResult;
let activeFormatted;
let activeContinuationFormatted;
let activeChapter;
let showVowels = true;
const indexCache = new Map();

const HEBREW_CHAPTERS = [
  "",
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שביעי",
  "שמיני",
  "תשיעי",
  "עשירי",
  "אחד עשר",
  "שנים עשר",
  "שלושה עשר",
  "ארבעה עשר",
  "חמישה עשר",
  "שישה עשר",
  "שבעה עשר",
  "שמונה עשר",
  "תשעה עשר",
  "עשרים",
  "אחד ועשרים",
  "שניים ועשרים",
  "שלושה ועשרים",
  "עשרים וארבעה"
];

function findTractate(name) {
  return TRACTATES.find(tractate => tractate.name === name) || TRACTATES[0];
}

function setStatus(message, isError = false) {
  refs.status.textContent = message;
  refs.status.classList.toggle("error", isError);
}

function setBusy(isBusy) {
  refs.load.disabled = isBusy;
  refs.prev.disabled = isBusy;
  refs.next.disabled = isBusy;
  refs.toggleVowels.disabled = isBusy && !activeFormatted;
}

function populateTractates() {
  refs.tractate.innerHTML = TRACTATES
    .map(tractate => `<option value="${tractate.name}">${tractate.he}</option>`)
    .join("");
}

function populateDafim(selectedDaf) {
  const tractate = findTractate(refs.tractate.value);
  let options = "";
  for (let daf = tractate.start; daf <= tractate.end; daf++) {
    options += `<option value="${daf}">${daf}</option>`;
  }
  refs.daf.innerHTML = options;
  refs.daf.value = String(Math.min(Math.max(Number(selectedDaf) || tractate.start, tractate.start), tractate.end));
}

function readSelectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tractate = findTractate(params.get("tractate"));
  refs.tractate.value = tractate.name;
  populateDafim(params.get("daf"));
  refs.amud.value = params.get("amud") === "b" ? "b" : "a";
}

function writeSelectionToUrl() {
  const params = new URLSearchParams({
    tractate: refs.tractate.value,
    daf: refs.daf.value,
    amud: refs.amud.value
  });
  window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
}

function stripNikkud(html) {
  return html.replace(/[\u0591-\u05bd\u05bf-\u05c7]/g, "");
}

function renderFormattedDaf() {
  if (!activeFormatted) return;
  const main = showVowels ? activeFormatted.main : stripNikkud(activeFormatted.main);
  const continuation = activeContinuationFormatted
    ? Object.assign({}, activeContinuationFormatted, {
      main: showVowels ? activeContinuationFormatted.main : stripNikkud(activeContinuationFormatted.main)
    })
    : {};
  renderer.render(main, activeFormatted.inner, activeFormatted.outer, activeFormatted.amud, undefined, undefined, undefined, continuation);
}

function hebrewNumber(number) {
  return HEBREW_CHAPTERS[Number(number)] || number;
}

function hebrewDafNumber(number) {
  const value = Number(number);
  const letters = [
    [400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"],
    [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"],
    [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"]
  ];
  let remaining = value;
  let output = "";
  for (const [amount, letter] of letters) {
    while (remaining >= amount) {
      output += letter;
      remaining -= amount;
    }
  }
  return output.replace("יה", "טו").replace("יו", "טז");
}

function dafSortValue(daf, amud = "a") {
  return Number(daf) * 2 + (amud === "b" ? 1 : 0);
}

function parseTalmudLocation(ref) {
  const match = ref && ref.match(/(\d+)([ab])/);
  if (!match) return null;
  return { daf: Number(match[1]), amud: match[2] };
}

function refRange(ref) {
  const parts = ref.split("-");
  const start = parseTalmudLocation(parts[0]);
  const end = parseTalmudLocation(parts[1] || "") || start;
  if (!start || !end) return null;
  return {
    start: dafSortValue(start.daf, start.amud),
    end: dafSortValue(end.daf, end.amud)
  };
}

async function getTractateIndex(tractate) {
  if (!indexCache.has(tractate)) {
    indexCache.set(
      tractate,
      fetch(`https://www.sefaria.org/api/index/${encodeURIComponent(tractate)}`).then(response => {
        if (!response.ok) throw new Error(`Sefaria index request failed: ${response.status}`);
        return response.json();
      })
    );
  }
  return indexCache.get(tractate);
}

async function getChapterInfo(tractate, daf, amud) {
  const index = await getTractateIndex(tractate);
  const chapterStructs = ((index || {}).alt_structs || (index || {}).alts || {});
  const chapters = (chapterStructs.Chapters || {}).nodes || [];
  const target = dafSortValue(daf, amud);
  const matchingChapterIndexes = chapters
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) =>
    (chapter.refs || []).some(ref => {
      const range = refRange(ref);
      return range && target >= range.start && target <= range.end;
    })
  );
  const match = matchingChapterIndexes[matchingChapterIndexes.length - 1];
  const chapterIndex = match ? match.index : -1;
  const chapter = chapters[chapterIndex];
  if (!chapter) return null;
  return {
    number: chapterIndex + 1,
    name: chapter.heTitle || chapter.title || "",
    tractate: index.heTitle || findTractate(tractate).he
  };
}

function updateDafHeading(tractate, daf, amud) {
  const amudMark = amud === "b" ? ":" : ".";
  refs.dafHeading.dataset.amud = amud;
  refs.dafRefLabel.textContent = `${hebrewDafNumber(daf)}${amudMark}`;
  if (activeChapter) {
    refs.chapterLabel.textContent = `${activeChapter.name}\tפרק ${hebrewNumber(activeChapter.number)}\t${activeChapter.tractate}`;
  } else {
    refs.chapterLabel.textContent = findTractate(tractate).he;
  }
}

function parseSefariaRef(ref) {
  const match = ref && ref.match(/^(.+)\s+(\d+)([ab])$/);
  if (!match) return null;
  return {
    tractate: match[1],
    daf: match[2],
    amud: match[3]
  };
}

function applyParsedRef(parsed) {
  if (!parsed) return false;
  const tractate = findTractate(parsed.tractate);
  refs.tractate.value = tractate.name;
  populateDafim(parsed.daf);
  refs.amud.value = parsed.amud;
  return true;
}

function hasFormattedWord(html) {
  return /class="[^"]*\bword\b/.test(html || "");
}

function hasAnyFormattedWords(formatted) {
  return formatted && ["main", "inner", "outer"].some(key => hasFormattedWord(formatted[key]));
}

async function fetchFormattedContinuation(result, attemptsLeft = 2) {
  const parsed = parseSefariaRef(result && result.refs && result.refs.next);
  if (!parsed || attemptsLeft <= 0) return null;
  const nextResult = await dafRenderer.fetchSefariaDaf(parsed.tractate, parsed.daf, parsed.amud);
  const formatted = dafRenderer.formatSefariaDaf(nextResult);
  if (hasAnyFormattedWords(formatted) || attemptsLeft === 1) return formatted;
  return fetchFormattedContinuation(nextResult, attemptsLeft - 1);
}

async function renderSelected() {
  const tractate = findTractate(refs.tractate.value);
  const daf = Number(refs.daf.value);
  const amud = refs.amud.value;

  setBusy(true);
  setStatus(`טוען ${tractate.he} ${daf}${amud === "a" ? "א" : "ב"}...`);

  try {
    await document.fonts.ready;
    activeResult = await dafRenderer.fetchSefariaDaf(tractate.name, daf, amud);
    activeFormatted = dafRenderer.formatSefariaDaf(activeResult);
    activeContinuationFormatted = await fetchFormattedContinuation(activeResult);
    activeChapter = await getChapterInfo(tractate.name, daf, amud);
    renderFormattedDaf();
    updateDafHeading(tractate.name, daf, amud);
    refs.subtitle.textContent = activeResult.titles.main || `${tractate.he} ${daf}`;
    setStatus("הדף נטען");
    writeSelectionToUrl();
  } catch (error) {
    setStatus(error.message || "לא הצלחתי לטעון את הדף", true);
  } finally {
    setBusy(false);
  }
}

function move(direction) {
  const parsed = parseSefariaRef(activeResult && activeResult.refs && activeResult.refs[direction]);
  if (applyParsedRef(parsed)) renderSelected();
}

function toggleVowels() {
  showVowels = !showVowels;
  refs.toggleVowelsLabel.textContent = showVowels ? "הסתר ניקוד" : "הצג ניקוד";
  refs.toggleVowels.setAttribute("aria-pressed", String(showVowels));
  renderFormattedDaf();
}

async function init() {
  try {
    populateTractates();
    readSelectionFromUrl();
    const dafRoot = document.querySelector("#daf-render");
    if (!dafRoot) {
      throw new Error("Missing #daf-render container");
    }

    renderer = dafRenderer(dafRoot, {
      contentWidth: "540px",
      padding: {
        vertical: "10px",
        horizontal: "16px"
      }
    });

    refs.tractate.addEventListener("change", () => {
      populateDafim(findTractate(refs.tractate.value).start);
    });
    refs.load.addEventListener("click", renderSelected);
    refs.prev.addEventListener("click", () => move("prev"));
    refs.next.addEventListener("click", () => move("next"));
    refs.toggleVowels.addEventListener("click", toggleVowels);

    await renderSelected();
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error) || "לא הצלחתי להפעיל את האתר", true);
  }
}

init();
