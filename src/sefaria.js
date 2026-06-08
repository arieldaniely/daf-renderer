const DEFAULT_SEFARIA_OPTIONS = {
  baseUrl: "https://www.sefaria.org",
  language: "hebrew",
  mainVersion: undefined,
  commentaryVersion: undefined,
  returnFormat: "default",
  maxCommentarySegments: 100,
  minOuterWordsForSideLayout: 32,
  innerCommentary: undefined,
  outerCommentary: "Tosafot"
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
  const main = formatMain(daf.texts.main);
  formatMain.inlineBySentence = {};

  if (useSplitInner) {
    const [right, left] = splitTextBySegments(daf.texts.inner);
    const rightKey = daf.amud === "b" ? "inner" : "outer";
    const leftKey = daf.amud === "b" ? "outer" : "inner";
    const formattedRight = formatCommentary(right, "word-rashi-right", "rashi-header");
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
        inlineOuter: hasOuterText
      }
    };
  }

  return {
    amud: daf.amud,
    refs: daf.refs,
    titles: daf.titles,
    main,
    inner: formatCommentary(daf.texts.inner, "word-rashi", "rashi-header"),
    outer: formatCommentary(daf.texts.outer, "word-tosafot", "tosafot-header"),
    layout: {
      sideMode: "normal",
      continuationKeys: ["main", "inner", "outer"]
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
