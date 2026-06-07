const DEFAULT_SEFARIA_OPTIONS = {
  baseUrl: "https://www.sefaria.org",
  language: "hebrew",
  mainVersion: undefined,
  commentaryVersion: undefined,
  returnFormat: "default",
  maxCommentarySegments: 100,
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

function formatMain(text) {
  let wordIndex = 0;
  return flattenText(text)
    .filter(Boolean)
    .map((segment, index) => {
      const sentenceId = `sentence-main-${index}`;
      const words = wrapWords(
        String(segment)
          .replace(/:,/g, ": ")
          .replace(/<strong>/g, "")
          .replace(/<\/strong>/g, ""),
        "word-main",
        wordIndex,
        sentenceId
      );
      wordIndex += (words.match(/class="word"/g) || []).length;
      return `<span class="sentence" id="${sentenceId}">${words}</span>`;
    })
    .join(" ");
}

function formatCommentary(text, prefix, headerClass) {
  const html = flattenText(text)
    .filter(Boolean)
    .map(segment => String(segment).replace(/([^\u2013:]+)\s+[\u2013-]\s+([^:]+:)/, `<b class="${headerClass}">$1. </b>$2 `))
    .join(" ")
    .replace(/,,/g, "")
    .replace(/,:/g, ": ")
    .replace(/:,/g, ": ");

  return wrapWords(html, prefix);
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

export async function fetchSefariaDaf(tractate, daf, amud = "a", options = {}) {
  const mergedOptions = Object.assign({}, DEFAULT_SEFARIA_OPTIONS, options);
  const innerCommentary = getInnerCommentary(tractate, daf, mergedOptions.innerCommentary);
  const mainRef = dafRef(tractate, daf, amud);
  const innerRef = commentaryRef(innerCommentary, tractate, daf, amud, mergedOptions.maxCommentarySegments);
  const outerRef = commentaryRef(mergedOptions.outerCommentary, tractate, daf, amud, mergedOptions.maxCommentarySegments);

  const [main, inner, outer] = await Promise.all([
    getText(mainRef, Object.assign({}, mergedOptions, { version: mergedOptions.mainVersion || mergedOptions.language })),
    getText(innerRef, Object.assign({}, mergedOptions, { version: mergedOptions.commentaryVersion || mergedOptions.language })),
    getText(outerRef, Object.assign({}, mergedOptions, { version: mergedOptions.commentaryVersion || mergedOptions.language }))
  ]);

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
      outer: getVersionText(outer)
    }
  };
}

export function formatSefariaDaf(daf) {
  return {
    amud: daf.amud,
    refs: daf.refs,
    titles: daf.titles,
    main: formatMain(daf.texts.main),
    inner: formatCommentary(daf.texts.inner, "word-rashi", "rashi-header"),
    outer: formatCommentary(daf.texts.outer, "word-tosafot", "tosafot-header")
  };
}

export async function getSefariaDaf(tractate, daf, amud = "a", options = {}) {
  return formatSefariaDaf(await fetchSefariaDaf(tractate, daf, amud, options));
}
