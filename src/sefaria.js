const DEFAULT_SEFARIA_OPTIONS = {
  baseUrl: "https://www.sefaria.org",
  language: "hebrew",
  mainVersion: undefined,
  commentaryVersion: undefined,
  returnFormat: "default",
  maxCommentarySegments: 100,
  minOuterWordsForSideLayout: 32,
  innerCommentary: undefined,
  outerCommentary: "Tosafot",
  wikisourceBaseUrl: "https://he.wikisource.org",
  includeWikisourceAdditions: true,
  includeGilyonHashas: true,
  wikisourceUserAgent: "daf-renderer"
};

function normalizeFetch(fetcher) {
  if (fetcher) return fetcher;
  if (typeof fetch === "function") return fetch.bind(typeof window !== "undefined" ? window : globalThis);
  throw new Error("No fetch implementation found. Pass { fetcher } when calling fetchSefariaDaf.");
}

function buildTextUrl(ref, options) {
  const url = new URL(`/api/v3/texts/${encodeURIComponent(ref)}`, options.baseUrl);
  const version = options.version || options.language;
  if (version) url.searchParams.append("version", version);
  if (options.returnFormat) url.searchParams.set("return_format", options.returnFormat);
  return url.toString();
}

async function getText(ref, options) {
  const response = await normalizeFetch(options.fetcher)(buildTextUrl(ref, options));
  if (!response.ok) {
    throw new Error(`Sefaria request failed for ${ref}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function getJsonUrl(url, options) {
  const headers = {};
  const canSetUserAgent = typeof window === "undefined";
  if (canSetUserAgent && options.userAgent) headers["User-Agent"] = options.userAgent;
  if (canSetUserAgent && options.wikimediaUserAgent) headers["User-Agent"] = options.wikimediaUserAgent;
  if (canSetUserAgent && options.wikisourceUserAgent) headers["User-Agent"] = options.wikisourceUserAgent;
  const response = await normalizeFetch(options.fetcher)(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  return response.json();
}

async function getOptionalText(ref, options) {
  const response = await normalizeFetch(options.fetcher)(buildTextUrl(ref, options));
  if (response.status === 404) {
    return { missing: true, ref, versions: [{ text: [] }] };
  }
  if (!response.ok) {
    throw new Error(`Sefaria request failed for ${ref}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildLinksUrl(ref, options) {
  const url = new URL(`/api/links/${encodeURIComponent(ref)}`, options.baseUrl);
  url.searchParams.set("with_text", "0");
  return url.toString();
}

async function getLinks(ref, options) {
  const response = await normalizeFetch(options.fetcher)(buildLinksUrl(ref, options));
  if (!response.ok) return [];
  return response.json();
}

function getVersionText(response) {
  return response && response.versions && response.versions[0] ? response.versions[0].text : [];
}

const HEBREW_BOOKS = {
  "בראשית": "Genesis",
  "שמות": "Exodus",
  "ויקרא": "Leviticus",
  "במדבר": "Numbers",
  "דברים": "Deuteronomy",
  "יהושע": "Joshua",
  "שופטים": "Judges",
  "שמואל א": "I Samuel",
  "שמואל ב": "II Samuel",
  "מלכים א": "I Kings",
  "מלכים ב": "II Kings",
  "ישעיה": "Isaiah",
  "ישעיהו": "Isaiah",
  "ירמיה": "Jeremiah",
  "ירמיהו": "Jeremiah",
  "יחזקאל": "Ezekiel",
  "הושע": "Hosea",
  "יואל": "Joel",
  "עמוס": "Amos",
  "עובדיה": "Obadiah",
  "יונה": "Jonah",
  "מיכה": "Micah",
  "נחום": "Nahum",
  "חבקוק": "Habakkuk",
  "צפניה": "Zephaniah",
  "חגי": "Haggai",
  "זכריה": "Zechariah",
  "מלאכי": "Malachi",
  "תהלים": "Psalms",
  "משלי": "Proverbs",
  "איוב": "Job",
  "שיר השירים": "Song of Songs",
  "רות": "Ruth",
  "איכה": "Lamentations",
  "קהלת": "Ecclesiastes",
  "אסתר": "Esther",
  "דניאל": "Daniel",
  "עזרא": "Ezra",
  "נחמיה": "Nehemiah",
  "דברי הימים א": "I Chronicles",
  "דברי הימים ב": "II Chronicles"
};

const HEBREW_NUMERAL_VALUES = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400
};

function numberFromHebrew(value) {
  const cleaned = String(value || "")
    .replace(/[׳״'"]/g, "")
    .replace(/[ךםןףץ]/g, letter => ({ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ"}[letter]))
    .trim();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return Array.from(cleaned).reduce((sum, letter) => sum + (HEBREW_NUMERAL_VALUES[letter] || 0), 0);
}

function hebrewNumeral(number, withMarks = true) {
  const value = Number(number);
  if (!value) return "";
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת"];
  let remaining = value;
  let result = "";
  while (remaining >= 400) {
    result += "ת";
    remaining -= 400;
  }
  if (remaining >= 100) {
    result += hundreds[Math.floor(remaining / 100)];
    remaining %= 100;
  }
  if (remaining === 15) return withMarks ? "ט״ו" : "טו";
  if (remaining === 16) return withMarks ? "ט״ז" : "טז";
  if (remaining >= 10) {
    result += tens[Math.floor(remaining / 10)];
    remaining %= 10;
  }
  result += ones[remaining];
  if (!withMarks || result.length < 2) return withMarks && result ? `${result}׳` : result;
  return `${result.slice(0, -1)}״${result.slice(-1)}`;
}

function normalizeHebrewWord(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/[׳״'"]/g, "")
    .replace(/[^\u05d0-\u05ea0-9]/g, "");
}

function visibleText(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function contextWordsBefore(html, index, count = 5) {
  const words = visibleText(String(html || "").slice(0, index))
    .split(/\s+/)
    .map(normalizeHebrewWord)
    .filter(Boolean);
  return words.slice(-count);
}

function normalizeWikiHrefs(html, baseUrl) {
  return String(html || "")
    .replace(/\s+class="mw-[^"]*"/g, "")
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/\s+id="[^"]*"/g, "")
    .replace(/\s+title="[^"]*"/g, "")
    .replace(/href="\/wiki\//g, `href="${baseUrl}/wiki/`)
    .replace(/href="\/\/he\.wikisource\.org/g, `href="https://he.wikisource.org`);
}

function unwrapLinks(html) {
  return String(html || "").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

function sectionByHeading(html, id) {
  if (typeof DOMParser === "function") {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const heading = doc.getElementById(id);
    if (heading) {
      const start = heading.closest(".mw-heading") || heading;
      const parts = [];
      let node = start.nextElementSibling;
      while (node && !(node.matches && node.matches(".mw-heading"))) {
        parts.push(node.outerHTML || node.textContent || "");
        node = node.nextElementSibling;
      }
      return parts.join("\n");
    }
  }

  const marker = `id="${id}"`;
  const headingIndex = String(html || "").indexOf(marker);
  if (headingIndex === -1) return "";
  const headingEnd = String(html || "").indexOf("</div>", headingIndex);
  const safeStart = headingEnd === -1 ? headingIndex : headingEnd + "</div>".length;
  const next = String(html || "").indexOf("<div class=\"mw-heading mw-heading2\"", headingIndex + marker.length);
  return String(html || "").slice(safeStart, next === -1 ? undefined : next);
}

function wikisourceTitleFromHeRef(heRef, daf, amud) {
  const parts = String(heRef || "")
    .replace(/<[^>]+>/g, "")
    .replace(/[׳״'"]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const amudHebrew = amud === "b" ? "ב" : "א";
  const dafHebrew = hebrewNumeral(daf, false);
  if (parts.length >= 3) {
    const tractate = parts.slice(0, -2).join(" ");
    return [tractate, normalizeHebrewWord(parts[parts.length - 2]) || dafHebrew, normalizeHebrewWord(parts[parts.length - 1]) || amudHebrew].join("_");
  }
  return ["", dafHebrew, amudHebrew].filter(Boolean).join("_");
}

function parseTanakhRef(anchorHtml) {
  const raw = visibleText(anchorHtml).replace(/^קטגוריה:/, "").replace(/,/g, " ");
  const normalized = raw.replace(/\s+/g, " ").trim();
  const book = Object.keys(HEBREW_BOOKS)
    .sort((a, b) => b.length - a.length)
    .find(name => normalized === name || normalized.startsWith(`${name} `));
  if (!book) return null;
  const rest = normalized.slice(book.length).trim().split(/\s+/).filter(Boolean);
  const chapter = numberFromHebrew(rest[0]);
  const verse = numberFromHebrew(rest[1]);
  if (!chapter || !verse) return null;
  return {
    book,
    ref: `${HEBREW_BOOKS[book]}.${chapter}.${verse}`,
    heRef: `${book} ${hebrewNumeral(chapter)} ${hebrewNumeral(verse)}`
  };
}

function extractEinEntries(sectionHtml, baseUrl) {
  const entries = [];
  const paragraphPattern = /<p\b[\s\S]*?<\/p>/gi;
  let match;
  while ((match = paragraphPattern.exec(String(sectionHtml || "")))) {
    const paragraph = match[0];
    const markerMatch = paragraph.match(/fn_([^"_]+)(?:_back)?/) || paragraph.match(/<big>\s*<b>([^<]+)<\/b>\s*<\/big>/);
    if (!markerMatch) continue;
    const marker = visibleText(markerMatch[1]);
    const html = unwrapLinks(normalizeWikiHrefs(paragraph, baseUrl))
      .replace(/<cite\b[\s\S]*?<\/cite>/gi, "")
      .replace(/<big>\s*<b>[^<]+<\/b>\s*<\/big>/i, `<b class="daf-side-entry-marker">${marker}</b>`);
    entries.push({ marker, html });
  }
  return entries;
}

function extractInlineAdditions(sectionHtml, kind) {
  const additions = [];
  const pattern = kind === "ein"
    ? /<sup\b[\s\S]*?href="#fn_([^"]+)"[\s\S]*?<\/sup>/gi
    : /<span\b[^>]*font-size:83%[^>]*>\s*\([^)]*?<a\b[\s\S]*?<\/a>[^)]*?\)\s*<\/span>/gi;
  let match;
  while ((match = pattern.exec(String(sectionHtml || "")))) {
    const addition = {
      kind,
      marker: kind === "ein" ? visibleText(match[1]) : "",
      sourceHtml: match[0],
      context: contextWordsBefore(sectionHtml, match.index)
    };
    if (kind === "torah") {
      const anchor = match[0].match(/<a\b[\s\S]*?<\/a>/i);
      addition.tanakh = anchor ? parseTanakhRef(anchor[0]) : null;
      if (!addition.tanakh) continue;
    }
    additions.push(addition);
  }
  return additions;
}

async function fetchWikisourceAdditions(tractate, daf, amud, heRef, options) {
  if (!options.includeWikisourceAdditions) return { inline: { main: [], inner: [], outer: [] }, einEntries: [] };
  const title = wikisourceTitleFromHeRef(heRef, daf, amud);
  if (!title) return { inline: { main: [], inner: [], outer: [] }, einEntries: [] };
  const url = new URL("/w/api.php", options.wikisourceBaseUrl);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "text");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const data = await getJsonUrl(url.toString(), options).catch(() => null);
  const html = data && data.parse && data.parse.text ? data.parse.text["*"] : "";
  if (!html) return { inline: { main: [], inner: [], outer: [] }, einEntries: [] };

  const sections = {
    main: sectionByHeading(html, "גמרא"),
    inner: sectionByHeading(html, "רש\"י") || sectionByHeading(html, "רש&quot;י"),
    outer: sectionByHeading(html, "תוספות")
  };
  const einEntries = extractEinEntries(sectionByHeading(html, "עין_משפט_ונר_מצוה"), options.wikisourceBaseUrl);
  const einMarkers = new Set(einEntries.map(entry => entry.marker));
  const inline = {
    main: extractInlineAdditions(sections.main, "ein").concat(extractInlineAdditions(sections.main, "torah")),
    inner: extractInlineAdditions(sections.inner, "ein").concat(extractInlineAdditions(sections.inner, "torah")),
    outer: extractInlineAdditions(sections.outer, "ein").concat(extractInlineAdditions(sections.outer, "torah"))
  };
  Object.keys(inline).forEach(key => {
    inline[key] = inline[key].filter(item => item.kind !== "ein" || einMarkers.has(item.marker));
  });

  return { inline, einEntries };
}

async function fetchVerseText(tanakh, options) {
  if (!(tanakh && tanakh.ref)) return "";
  const response = await getOptionalText(tanakh.ref, Object.assign({}, options, { version: options.language }));
  return flattenText(getVersionText(response)).join(" ");
}

async function buildTorahOrEntries(additions, options) {
  const torahAdditions = [];
  ["main", "inner", "outer"].forEach(key => {
    (additions.inline[key] || []).forEach(item => {
      if (item.kind === "torah") torahAdditions.push(item);
    });
  });

  const entries = [];
  for (let index = 0; index < torahAdditions.length; index++) {
    const item = torahAdditions[index];
    const marker = hebrewNumeral(index + 1, false);
    item.marker = marker;
    const verse = await fetchVerseText(item.tanakh, options).catch(() => "");
    if (!verse) continue;
    entries.push({ marker, verse, heRef: item.tanakh.heRef });
  }
  return entries;
}

async function fetchGilyonHashas(tractate, daf, amud, options) {
  if (!options.includeGilyonHashas) return [];
  const ref = `Gilyon_HaShas_on_${tractate}.${daf}${amud}.1-${options.maxCommentarySegments}`;
  const response = await getOptionalText(ref, Object.assign({}, options, { version: options.commentaryVersion || options.language })).catch(() => null);
  return flattenText(getVersionText(response)).filter(segment => stripHtml(segment));
}

function flattenText(text) {
  if (!Array.isArray(text)) return text ? [text] : [];
  return text.reduce((flattened, value) => flattened.concat(flattenText(value)), []);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapWords(html, prefix, startAt = 0, sentenceId) {
  let index = startAt;
  return String(html)
    .split(/(<[^>]+>)/g)
    .map(part => {
      if (!part || /^<[^>]+>$/.test(part)) return part;
      return part
        .split(/(\s+)/)
        .map(word => {
          if (!word || /^\s+$/.test(word)) return word;
          const sentence = sentenceId ? ` data-sentence="${escapeAttribute(sentenceId)}"` : "";
          return `<span class="word" id="${prefix}-${index++}"${sentence}>${word}</span>`;
        })
        .join("");
    })
    .join("");
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(text) {
  return stripHtml(flattenText(text).join(" ")).split(/\s+/).filter(Boolean).length;
}

function isHadranSegment(segment) {
  return /^הדרן\s+עלך(?:\s|$)/.test(stripHtml(segment));
}

function cleanHadranSegment(segment) {
  return String(segment || "").replace(/^(?:\s*<br\s*\/?>\s*)+/i, "").replace(/(?:\s*<br\s*\/?>\s*)+$/i, "");
}

function plainHebrew(text) {
  return String(text || "").replace(/[\u0591-\u05c7]/g, "").replace(/[^\u05d0-\u05ea]/g, "");
}

function addClassToWordSpan(html, wordIndex, className) {
  const source = String(html || "");
  const classIndex = source.indexOf('class="word', wordIndex);
  if (classIndex === -1) return source;
  return `${source.slice(0, classIndex)}class="word ${className}${source.slice(classIndex + 'class="word'.length)}`;
}

function removeOpeningMishnaMarker(html) {
  const markerPattern = /^(.*?)(<span\b[^>]*\bclass="[^"]*\bword\b[^"]*"[^>]*>.*?<\/span>)(\s*)(.*)$/;
  const match = String(html || "").match(markerPattern);
  if (!match) return html;

  return plainHebrew(stripHtml(match[2])) === "מתני"
    ? `${match[1]}${match[3]}${match[4]}`
    : html;
}

function addClassToChapterStartWord(html, className) {
  const markerWords = new Set(["מתני", "גמ"]);
  const wordPattern = /<span\b[^>]*\bclass="[^"]*\bword\b[^"]*"[^>]*>.*?<\/span>/g;
  let match;

  while ((match = wordPattern.exec(String(html || "")))) {
    const text = plainHebrew(stripHtml(match[0]));
    if (!text || markerWords.has(text)) continue;
    return addClassToWordSpan(html, match.index, className);
  }

  return html;
}

function formatHadran(segment, prefix, startAt = 0, sentenceId) {
  const words = wrapWords(cleanHadranSegment(segment), prefix, startAt, sentenceId);
  return `<span class="daf-hadran">${words}</span>`;
}

function formatMain(text) {
  let wordIndex = 0;
  const segments = flattenText(text).filter(Boolean);
  const inlineBySentence = formatMain.inlineBySentence || {};

  return segments
    .map((segment, index) => {
      const sentenceId = `sentence-main-${index}`;
      const cleanedSegment = String(segment)
        .replace(/:,/g, ": ")
        .replace(/<strong>/g, "")
        .replace(/<\/strong>/g, "");
      const hadran = isHadranSegment(cleanedSegment);
      const previousToHadran = isHadranSegment(segments[index + 1]);
      const afterHadran = index > 0 && isHadranSegment(segments[index - 1]);
      let words = hadran
        ? formatHadran(cleanedSegment, "word-main", wordIndex, sentenceId)
        : wrapWords(cleanedSegment, "word-main", wordIndex, sentenceId);
      if (afterHadran) {
        words = removeOpeningMishnaMarker(words);
        words = addClassToChapterStartWord(words, "daf-chapter-start-word");
      }
      wordIndex += (words.match(/class="word"/g) || []).length;
      const classes = ["sentence"];
      if (previousToHadran) classes.push("daf-before-hadran");
      const inline = inlineBySentence[index] || "";
      return `${inline}<span class="${classes.join(" ")}" id="${sentenceId}">${words}</span>`;
    })
    .join(" ");
}

function formatCommentary(text, prefix, headerClass) {
  const html = flattenText(text)
    .filter(Boolean)
    .map(segment => {
      const value = String(segment);
      if (isHadranSegment(value)) return `<span class="daf-hadran">${cleanHadranSegment(value)}</span>`;
      return value.replace(/([^\u2013:]+)\s+[\u2013-]\s+([^:]+:)/, `<b class="${headerClass}">$1. </b>$2 `);
    })
    .join(" ")
    .replace(/,,/g, "")
    .replace(/,:/g, ": ")
    .replace(/:,/g, ": ");

  return wrapWords(html, prefix);
}

function formatInlineCommentary(text) {
  const html = formatCommentary(text, "word-inline-tosafot", "tosafot-header");
  return html ? `<span class="daf-inline-tosafot">${html}</span>` : "";
}

function wordSpans(html) {
  const spans = [];
  const pattern = /<span\b[^>]*\bclass="[^"]*\bword\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi;
  let match;
  while ((match = pattern.exec(String(html || "")))) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: normalizeHebrewWord(visibleText(match[0]))
    });
  }
  return spans;
}

function insertAfterContext(html, context, markerHtml) {
  const words = wordSpans(html);
  const target = (context || []).map(normalizeHebrewWord).filter(Boolean);
  if (!words.length || !target.length) return html;

  let best = -1;
  const minLength = target.length > 1 ? 2 : 1;
  for (let length = target.length; length >= minLength && best === -1; length--) {
    const suffix = target.slice(target.length - length);
    for (let index = 0; index <= words.length - suffix.length; index++) {
      const matches = suffix.every((word, offset) => words[index + offset].text === word);
      if (matches) best = index + suffix.length - 1;
    }
  }

  if (best === -1) return html;
  const insertAt = words[best + 1] ? words[best + 1].start : words[best].end;
  return `${html.slice(0, insertAt)}${markerHtml}${html.slice(insertAt)}`;
}

function inlineMarkerHtml(item) {
  if (item.kind === "ein") {
    return `<sup class="daf-ein-marker">${escapeAttribute(item.marker)}</sup>`;
  }
  return `<sup class="daf-torah-marker">${escapeAttribute(item.marker)}]</sup>`;
}

function applyInlineAdditions(html, additions) {
  return (additions || []).reduce((result, item) => {
    if (!item.marker) return result;
    return insertAfterContext(result, item.context, inlineMarkerHtml(item));
  }, html);
}

function sideSection(title, body, className = "") {
  const content = String(body || "").trim();
  if (!content) return "";
  const sectionClass = ["daf-side-section", className].filter(Boolean).join(" ");
  return `<span class="${sectionClass}"><span class="daf-side-title">${title}</span>${content}</span>`;
}

function formatSideEntries(entries) {
  if (!Array.isArray(entries) || !entries.length) return "";
  return entries.map(entry => `<span class="daf-side-entry">${entry.html}</span>`).join(" ");
}

function formatTorahOr(entries) {
  if (!Array.isArray(entries) || !entries.length) return "";
  return entries
    .map(entry => `<span class="daf-side-entry"><b class="daf-side-entry-marker">${entry.marker}]</b> ${entry.verse} <small>(${entry.heRef})</small></span>`)
    .join(" ");
}

function formatGilyonHashas(entries) {
  if (!Array.isArray(entries) || !entries.length) return "";
  return entries.map(entry => `<span class="daf-side-entry">${entry}</span>`).join(" ");
}

function appendSideSection(html, section) {
  return section ? `${html || ""} ${section}`.trim() : html;
}

function splitSegmentByWords(segment) {
  const parts = String(segment || "").split(/(\s+)/);
  const wordParts = parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part && !/^\s+$/.test(part));
  const cutWord = Math.ceil(wordParts.length / 2);
  const cutIndex = wordParts[cutWord] ? wordParts[cutWord].index : parts.length;
  return [
    parts.slice(0, cutIndex).join("").trim(),
    parts.slice(cutIndex).join("").trim()
  ].filter(Boolean);
}

function splitTextBySegments(text) {
  const segments = flattenText(text).filter(Boolean);
  if (segments.length <= 1) return splitSegmentByWords(segments[0]);

  const total = segments.reduce((sum, segment) => sum + wordCount(segment), 0);
  const target = Math.ceil(total / 2);
  let seen = 0;
  let splitAt = segments.length;

  for (let index = 0; index < segments.length; index++) {
    seen += wordCount(segments[index]);
    if (seen >= target) {
      splitAt = index + 1;
      break;
    }
  }

  if (splitAt >= segments.length && segments.length > 1) {
    splitAt = Math.ceil(segments.length / 2);
  }

  return [segments.slice(0, splitAt), segments.slice(splitAt)];
}

function getInnerCommentary(tractate, daf, configuredCommentary) {
  if (configuredCommentary) return configuredCommentary;
  return tractate === "Bava Batra" && Number(daf) >= 30 ? "Rashbam" : "Rashi";
}

function dafRef(tractate, daf, amud) {
  return `${tractate}.${daf}${amud}`;
}

function commentaryRef(commentary, tractate, daf, amud, maxSegments) {
  return `${commentary}_on_${tractate}.${daf}${amud}.1-${maxSegments}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstTopLevelTextIndex(text) {
  const values = Array.isArray(text) ? text : [text];
  for (let index = 0; index < values.length; index++) {
    if (flattenText(values[index]).some(value => stripHtml(value))) return index + 1;
  }
  return null;
}

function talmudRefPattern(tractate, daf, amud) {
  return new RegExp(`^${escapeRegExp(tractate)} ${daf}${amud}:(\\d+)`);
}

function parseMainRef(ref) {
  const match = String(ref || "").match(/^(.+)\s+(\d+)([ab])$/);
  return match ? { tractate: match[1], daf: match[2], amud: match[3] } : null;
}

async function getFirstOuterAnchorRef(commentary, tractate, daf, amud, outerText, options) {
  const firstIndex = firstTopLevelTextIndex(outerText);
  if (!firstIndex) return null;

  const linksRef = `${commentary}_on_${tractate}.${daf}${amud}.${firstIndex}`;
  const links = await getLinks(linksRef, options);
  const basePattern = talmudRefPattern(tractate, daf, amud);
  const baseLink = Array.isArray(links)
    ? links.find(link => basePattern.test(link.ref || link.sourceRef || ""))
    : null;

  return baseLink ? (baseLink.ref || baseLink.sourceRef) : null;
}

function sentenceIndexFromBaseRef(ref, mainRef) {
  const parsed = parseMainRef(mainRef);
  if (!parsed) return 0;
  const match = String(ref || "").match(talmudRefPattern(parsed.tractate, parsed.daf, parsed.amud));
  return match ? Number(match[1]) - 1 : 0;
}

export async function fetchSefariaDaf(tractate, daf, amud = "a", options = {}) {
  const mergedOptions = Object.assign({}, DEFAULT_SEFARIA_OPTIONS, options);
  const innerCommentary = getInnerCommentary(tractate, daf, mergedOptions.innerCommentary);
  const mainRef = dafRef(tractate, daf, amud);
  const innerRef = commentaryRef(innerCommentary, tractate, daf, amud, mergedOptions.maxCommentarySegments);
  const outerRef = commentaryRef(mergedOptions.outerCommentary, tractate, daf, amud, mergedOptions.maxCommentarySegments);

  const [main, inner, outer] = await Promise.all([
    getText(mainRef, Object.assign({}, mergedOptions, { version: mergedOptions.mainVersion || mergedOptions.language })),
    getText(innerRef, Object.assign({}, mergedOptions, { version: mergedOptions.commentaryVersion || mergedOptions.language })),
    getOptionalText(outerRef, Object.assign({}, mergedOptions, { version: mergedOptions.commentaryVersion || mergedOptions.language }))
  ]);
  const outerText = getVersionText(outer);
  const additions = await fetchWikisourceAdditions(
    tractate,
    daf,
    amud,
    main.heRef || main.ref,
    mergedOptions
  );
  const [torahOrEntries, gilyonHashas] = await Promise.all([
    buildTorahOrEntries(additions, mergedOptions),
    fetchGilyonHashas(tractate, daf, amud, mergedOptions)
  ]);
  const firstOuterAnchorRef = outer.missing ? null : await getFirstOuterAnchorRef(
    mergedOptions.outerCommentary,
    tractate,
    daf,
    amud,
    outerText,
    mergedOptions
  );

  return {
    amud,
    refs: {
      main: main.ref || mainRef,
      inner: inner.ref || innerRef,
      outer: outer.ref || outerRef,
      next: main.next,
      prev: main.prev
    },
    titles: {
      main: main.heRef || main.ref,
      inner: inner.heRef || inner.ref,
      outer: outer.heRef || outer.ref
    },
    raw: { main, inner, outer },
    texts: {
      main: getVersionText(main),
      inner: getVersionText(inner),
      outer: outerText
    },
    additions: {
      inline: additions.inline,
      einEntries: additions.einEntries,
      torahOrEntries,
      gilyonHashas
    },
    commentary: {
      inner: innerCommentary,
      outer: mergedOptions.outerCommentary
    },
    layout: {
      outerMissing: !!outer.missing,
      firstOuterAnchorRef,
      minOuterWordsForSideLayout: mergedOptions.minOuterWordsForSideLayout,
      outerWordCount: wordCount(outerText)
    }
  };
}

export function formatSefariaDaf(daf) {
  const outerMissing = !!(daf.layout && daf.layout.outerMissing);
  const outerWordCount = daf.layout ? daf.layout.outerWordCount : wordCount(daf.texts.outer);
  const minOuterWords = daf.layout && daf.layout.minOuterWordsForSideLayout
    ? daf.layout.minOuterWordsForSideLayout
    : DEFAULT_SEFARIA_OPTIONS.minOuterWordsForSideLayout;
  const useSplitInner = outerMissing || outerWordCount < minOuterWords;
  const hasOuterText = !outerMissing && outerWordCount > 0;
  const outerAnchorSentence = sentenceIndexFromBaseRef(
    daf.layout && daf.layout.firstOuterAnchorRef,
    daf.refs && daf.refs.main
  );
  const inlineBySentence = hasOuterText && useSplitInner
    ? { [outerAnchorSentence]: formatInlineCommentary(daf.texts.outer) }
    : {};

  formatMain.inlineBySentence = inlineBySentence;
  const inlineAdditions = daf.additions && daf.additions.inline
    ? daf.additions.inline
    : { main: [], inner: [], outer: [] };
  const main = applyInlineAdditions(formatMain(daf.texts.main), inlineAdditions.main);
  formatMain.inlineBySentence = {};
  const torahOrSection = sideSection("תורה אור השלם", formatTorahOr(daf.additions && daf.additions.torahOrEntries), "daf-torah-or-section");
  const einSection = sideSection("עין משפט נר מצווה", formatSideEntries(daf.additions && daf.additions.einEntries), "daf-ein-section");
  const gilyonSection = sideSection("גליון הש\"ס", formatGilyonHashas(daf.additions && daf.additions.gilyonHashas), "daf-gilyon-section");
  const outerAdditions = appendSideSection(einSection, gilyonSection);
  const sideAdditions = {
    inner: torahOrSection,
    outer: outerAdditions
  };

  if (useSplitInner) {
    const [right, left] = splitTextBySegments(daf.texts.inner);
    const rightKey = daf.amud === "b" ? "inner" : "outer";
    const leftKey = daf.amud === "b" ? "outer" : "inner";
    const formattedRight = applyInlineAdditions(formatCommentary(right, "word-rashi-right", "rashi-header"), inlineAdditions.inner);
    const formattedLeft = formatCommentary(left, "word-rashi-left", "rashi-header");

    return {
      amud: daf.amud,
      refs: daf.refs,
      titles: daf.titles,
      main,
      inner: rightKey === "inner" ? formattedRight : formattedLeft,
      outer: rightKey === "outer" ? formattedRight : formattedLeft,
      layout: {
        sideMode: "splitInner",
        rightKey,
        leftKey,
        continuationKeys: [leftKey],
        continuationSourceKey: "inner",
        inlineOuter: hasOuterText,
        sideAdditions
      }
    };
  }

  return {
    amud: daf.amud,
    refs: daf.refs,
    titles: daf.titles,
    main,
    inner: applyInlineAdditions(formatCommentary(daf.texts.inner, "word-rashi", "rashi-header"), inlineAdditions.inner),
    outer: applyInlineAdditions(formatCommentary(daf.texts.outer, "word-tosafot", "tosafot-header"), inlineAdditions.outer),
    layout: {
      sideMode: "normal",
      continuationKeys: ["main", "inner", "outer"],
      sideAdditions
    }
  };
}

export function continuationsForFormattedDaf(formatted, continuations = {}) {
  if (!(formatted && formatted.layout && formatted.layout.sideMode === "splitInner")) {
    return continuations || {};
  }
  const targetKey = formatted.layout.leftKey || "inner";
  const sourceKey = formatted.layout.continuationSourceKey || "inner";
  return { [targetKey]: continuations ? continuations[sourceKey] : "" };
}

export async function getSefariaDaf(tractate, daf, amud = "a", options = {}) {
  return formatSefariaDaf(await fetchSefariaDaf(tractate, daf, amud, options));
}
