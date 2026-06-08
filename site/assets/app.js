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
  subtitle: document.querySelector("#subtitle")
};

let renderer;
let activeResult;

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

async function renderSelected() {
  const tractate = findTractate(refs.tractate.value);
  const daf = Number(refs.daf.value);
  const amud = refs.amud.value;

  setBusy(true);
  setStatus(`טוען ${tractate.he} ${daf}${amud === "a" ? "א" : "ב"}...`);

  try {
    await document.fonts.ready;
    activeResult = await renderer.renderSefaria(tractate.name, daf, amud);
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

async function init() {
  try {
    populateTractates();
    readSelectionFromUrl();
    const dafRoot = document.querySelector("#daf-render");
    if (!dafRoot) {
      throw new Error("Missing #daf-render container");
    }

    renderer = dafRenderer(dafRoot, {
      contentWidth: "640px",
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

    await renderSelected();
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error) || "לא הצלחתי להפעיל את האתר", true);
  }
}

init();
