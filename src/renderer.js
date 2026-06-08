import {defaultOptions, mergeAndClone} from "./options";
import calculateSpacers from "./calculate-spacers";
import styleManager from "./style-manager";
import {
  fetchSefariaDaf,
  formatSefariaDaf,
  getSefariaDaf
} from "./sefaria";
import {
  calculateSpacersBreaks,
  onlyOneCommentary
} from "./calculate-spacers-breaks";
import classes from './styles.css';

function el(tag, parent) {
  const newEl = document.createElement(tag);
  if (parent) parent.append(newEl);
  return newEl;
}

function div(parent) {
  return el("div", parent);
}

function span(parent) {
  return el("span", parent);
}

function continuationLeadHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const word = template.content.querySelector(".word");
  if (!word) return "";
  const catchword = word.cloneNode(true);
  catchword.removeAttribute("id");
  catchword.classList.add(classes.continuationCatchword);
  catchword.setAttribute("aria-hidden", "true");

  return `<br>${catchword.outerHTML}`;
}

function withContinuationLead(html, continuationHtml) {
  const lead = continuationLeadHtml(continuationHtml);
  return lead && String(html || "").trim() ? `${html}${lead}` : html;
}

function resetContinuationCatchword(catchword) {
  catchword.style.marginLeft = "";
  catchword.style.marginRight = "";
}

function isSameLine(a, b) {
  return Math.abs(a.top - b.top) < 2 && Math.abs(a.bottom - b.bottom) < 2;
}

function lineGroups(words) {
  return words.reduce((lines, word) => {
    const rect = word.getBoundingClientRect();
    const line = lines.find(item => isSameLine(item.rect, rect));
    if (line) {
      line.words.push(word);
      line.rect = {
        top: Math.min(line.rect.top, rect.top),
        bottom: Math.max(line.rect.bottom, rect.bottom),
        left: Math.min(line.rect.left, rect.left),
        right: Math.max(line.rect.right, rect.right)
      };
    } else {
      lines.push({rect, words: [word]});
    }
    return lines;
  }, []).sort((a, b) => a.rect.top - b.rect.top);
}

function naturalLineWidth(line) {
  return line.rect.right - line.rect.left;
}

function wordsWidth(words, spaceWidth) {
  return words.reduce((sum, word) => sum + word.getBoundingClientRect().width, 0)
    + Math.max(0, words.length - 1) * spaceWidth;
}

function removeBalanceBreaks(text) {
  text.querySelectorAll(`.${classes.balanceBreak}`).forEach(br => br.remove());
}

function balanceFinalLine(text) {
  removeBalanceBreaks(text);

  const words = Array.from(text.querySelectorAll(".word"))
    .filter(word => !word.classList.contains(classes.continuationCatchword));
  const lines = lineGroups(words);
  if (lines.length < 2) return;

  const last = lines[lines.length - 1];
  const previous = lines[lines.length - 2];
  const recentReferenceLines = lines.slice(Math.max(0, lines.length - 5), lines.length - 1);
  const availableWidth = Math.max(...recentReferenceLines.map(naturalLineWidth));
  if (last.words.length > 2 && naturalLineWidth(last) / availableWidth > 0.72) return;
  if (previous.words.length < 3) return;

  const previousWordWidths = previous.words.reduce((sum, word) => sum + word.getBoundingClientRect().width, 0);
  const previousSpaceWidth = Math.max(0, (naturalLineWidth(previous) - previousWordWidths) / Math.max(1, previous.words.length - 1));
  const target = 0.72;
  let best = null;

  for (let index = 1; index < previous.words.length - 1; index++) {
    const remaining = previous.words.slice(0, index);
    const moved = previous.words.slice(index).concat(last.words);
    if (remaining.length < 2 || moved.length < 3) continue;

    const remainingFill = wordsWidth(remaining, previousSpaceWidth) / availableWidth;
    const movedFill = wordsWidth(moved, previousSpaceWidth) / availableWidth;
    if (remainingFill < 0.45 || movedFill < 0.45 || movedFill > 1.02) continue;

    const score = Math.abs(target - remainingFill) + Math.abs(target - movedFill);
    if (!best || score < best.score) {
      best = {score, word: previous.words[index]};
    }
  }

  if (!best) return;
  const br = document.createElement("br");
  br.classList.add(classes.balanceBreak);
  best.word.parentNode.insertBefore(br, best.word);
}

function balanceFinalLines(containers) {
  ["main", "inner", "outer"].forEach(key => balanceFinalLine(containers[key].text));
}

function continuationGap(text) {
  const style = getComputedStyle(text);
  const fontSize = parseFloat(style.fontSize) || 12;
  if (!document.createElement("canvas").getContext) return fontSize;
  const canvas = continuationGap.canvas || (continuationGap.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) return fontSize;
  context.font = style.font;
  return context.measureText("\u00a0\u00a0\u00a0").width || fontSize;
}

function positionContinuationCatchwords(containers) {
  ["main", "inner", "outer"].forEach(key => {
    const text = containers[key].text;
    const catchword = text.querySelector(`.${classes.continuationCatchword}`);
    if (!catchword) return;

    resetContinuationCatchword(catchword);

    const words = Array.from(text.querySelectorAll(".word"))
      .filter(word => word !== catchword && !word.classList.contains(classes.continuationCatchword));
    if (!words.length) return;

    const lastWord = words[words.length - 1];
    const lastRect = lastWord.getBoundingClientRect();
    const lineWords = words.filter(word => isSameLine(word.getBoundingClientRect(), lastRect));
    const lineRects = lineWords.map(word => word.getBoundingClientRect());
    const textRect = text.getBoundingClientRect();
    const catchwordRect = catchword.getBoundingClientRect();
    const direction = getComputedStyle(text).direction;
    const gap = continuationGap(text);

    if (direction === "ltr") {
      const lineEnd = Math.max(...lineRects.map(rect => rect.right));
      catchword.style.marginLeft = `${Math.max(0, lineEnd - textRect.left - catchwordRect.width - gap)}px`;
      catchword.style.marginRight = "auto";
    } else {
      const lineEnd = Math.min(...lineRects.map(rect => rect.left));
      const maxLeft = Math.max(0, textRect.width - catchwordRect.width);
      catchword.style.marginLeft = `${Math.min(maxLeft, Math.max(0, lineEnd - textRect.left + gap))}px`;
      catchword.style.marginRight = "auto";
    }
  });
}

function updateRootHeight(containers) {
  const rootRect = containers.el.getBoundingClientRect();
  const containerHeight = Math.max(...["main", "inner", "outer"].map(key => {
    const rect = containers[key].el.getBoundingClientRect();
    return rect.bottom - rootRect.top;
  }));
  containers.el.style.height = `${Math.ceil(containerHeight)}px`;
}

function finalizeLayout(containers) {
  balanceFinalLines(containers);
  positionContinuationCatchwords(containers);
  updateRootHeight(containers);
}

function wordRects(container) {
  return Array.from(container.text.querySelectorAll(".word"))
    .filter(word => !word.classList.contains(classes.continuationCatchword))
    .map(word => word.getBoundingClientRect());
}

function rectOverlapHeight(a, b) {
  if (a.left >= b.right || a.right <= b.left) return 0;
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function maxMainCommentaryOverlap(containers) {
  const mainRects = wordRects(containers.main);
  const sideRects = wordRects(containers.inner).concat(wordRects(containers.outer));

  return mainRects.reduce((max, mainRect) => {
    const rectMax = sideRects.reduce(
      (sideMax, sideRect) => Math.max(sideMax, rectOverlapHeight(mainRect, sideRect)),
      0
    );
    return Math.max(max, rectMax);
  }, 0);
}

function addSpacerAllowance(spacerHeights, amount) {
  return Object.assign({}, spacerHeights, {
    inner: typeof spacerHeights.inner === "number" ? spacerHeights.inner + amount : spacerHeights.inner,
    outer: typeof spacerHeights.outer === "number" ? spacerHeights.outer + amount : spacerHeights.outer
  });
}

function scheduleLayoutRefresh(refresh, callback) {
  const run = () => {
    refresh();
    if (callback) callback();
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    setTimeout(run, 0);
  }
}

function withNewBookStart(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const word = template.content.querySelector(".word");
  if (!word) return html;

  word.classList.add(classes.newBookWord);
  const br = document.createElement("br");
  br.classList.add(classes.newBookBreak);
  word.parentNode.insertBefore(br, word.nextSibling);

  return template.innerHTML;
}

function refBook(ref) {
  const match = String(ref || "").match(/^(.+?)\s+\d+[ab](?:\b|$)/);
  return match ? match[1] : "";
}

function isFirstSefariaDaf(sefariaDaf, tractate, daf, amud) {
  if (amud !== "a") return false;

  const previousBook = refBook(sefariaDaf && sefariaDaf.refs && sefariaDaf.refs.prev);
  if (previousBook) return previousBook !== tractate;

  return Number(daf) === 2;
}


function dafRenderer(el, options = defaultOptions) {
  const root = (typeof el === "string") ? document.querySelector(el) : el;
  if (!(root && root.nodeType === 1 && root.tagName.toUpperCase() === "DIV")) {
    throw "Argument must be a div element or its selector"
  }
  const outerContainer = div(root);
  const innerContainer = div(root);
  const mainContainer = div(root);
  const dummy = div(root);
  dummy.id = "dummy";
  const containers = {
    el: root,
    dummy: dummy,
    outer: {
      el: outerContainer,
      spacers: {
        start: div(outerContainer),
        mid: div(outerContainer),
        end: div(outerContainer)
      },
      text: div(outerContainer)
    },
    inner: {
      el: innerContainer,
      spacers: {
        start: div(innerContainer),
        mid: div(innerContainer),
        end: div(innerContainer)
      },
      text: div(innerContainer)
    },
    main: {
      el: mainContainer,
      spacers: {
        start: div(mainContainer),
        inner: div(mainContainer),
        outer: div(mainContainer),
      },
      text: div(mainContainer)
    }
  }

  const textSpans = {
    main: span(containers.main.text),
    inner: span(containers.inner.text),
    outer: span(containers.outer.text)
  }

  const clonedOptions = mergeAndClone(options, defaultOptions);

  styleManager.applyClasses(containers);
  styleManager.updateOptionsVars(clonedOptions);

  let resizeEvent;
  return {
    classes,
    containers,
    spacerHeights: {
      start: 0,
      inner: 0,
      outer: 0,
      end: 0
    },
    amud: "a",
    render(main, inner, outer, amud = "a", linebreak, renderCallback, resizeCallback, continuations = {}, decorations = {}) {
      if (resizeEvent) {
        window.removeEventListener("resize", resizeEvent);
      }
      if (this.amud != amud) {
        this.amud = amud;
        styleManager.updateIsAmudB(amud == "b");
      }
      const renderedMain = decorations.newBookStart ? withNewBookStart(main) : main;
      let calculateCurrentSpacers;
      const setText = () => {
        textSpans.main.innerHTML = withContinuationLead(renderedMain, continuations.main);
        textSpans.inner.innerHTML = withContinuationLead(inner, continuations.inner);
        textSpans.outer.innerHTML = withContinuationLead(outer, continuations.outer);
      };
      const applyLayout = () => {
        styleManager.updateSpacersVars(this.spacerHeights);
        styleManager.manageExceptions(this.spacerHeights);
        finalizeLayout(containers);

        if (!decorations.newBookStart) return;

        for (let index = 0; index < 4; index++) {
          const overlap = maxMainCommentaryOverlap(containers);
          if (overlap <= 1) return;

          this.spacerHeights = addSpacerAllowance(this.spacerHeights, Math.ceil(overlap) + 4);
          styleManager.updateSpacersVars(this.spacerHeights);
          styleManager.manageExceptions(this.spacerHeights);
          finalizeLayout(containers);
        }
      };
      const refreshLayout = () => {
        if (!calculateCurrentSpacers) return;
        setText();
        this.spacerHeights = calculateCurrentSpacers();
        if (decorations.newBookStart) {
          this.spacerHeights = addSpacerAllowance(this.spacerHeights, parseFloat(clonedOptions.lineHeight.main) || 0);
        }
        applyLayout();
      };
      if (!linebreak) {
        calculateCurrentSpacers = () => calculateSpacers(renderedMain, inner, outer, clonedOptions, containers.dummy);
        this.spacerHeights = calculateCurrentSpacers();
        resizeEvent = () => {
          scheduleLayoutRefresh(refreshLayout, resizeCallback);
          console.log("resizing");
        }
        window.addEventListener("resize", resizeEvent);
      }
      else {
        let [mainSplit, innerSplit, outerSplit] = [renderedMain, inner, outer].map( text => {
          containers.dummy.innerHTML = text;
          const divRanges = Array.from(containers.dummy.querySelectorAll("div")).map(div => {
            const range = document.createRange();
            range.selectNode(div);
            return range;
          })

          const brs = containers.dummy.querySelectorAll(linebreak);
          const splitFragments = []
          brs.forEach((node, index) => {
            const range = document.createRange();
            range.setEndBefore(node);
            if (index == 0) {
              range.setStart(containers.dummy, 0);
            } else {
              const prev = brs[index - 1];
              range.setStartAfter(prev);
            }
            divRanges.forEach( (divRange, i) => {
              const inBetween = range.compareBoundaryPoints(Range.START_TO_START, divRange) < 0 && range.compareBoundaryPoints(Range.END_TO_END, divRange) > 0;
              if (inBetween) {
                splitFragments.push(divRange.extractContents());
                divRanges.splice(i, 1);
              }
            });

            splitFragments.push(range.extractContents());
          })

          return splitFragments.map(fragment => {
            const el = document.createElement("div");
            el.append(fragment);
            return el.innerHTML;
          })
        });

        containers.dummy.innerHTML = "";

        const hasInner = innerSplit.length != 0;
        const hasOuter = outerSplit.length != 0;

        if (hasInner != hasOuter) {
          const withText = hasInner ? innerSplit : outerSplit;
          const fixed = onlyOneCommentary(withText, clonedOptions, dummy);
          if (fixed) {
            if (amud == "a") {
              innerSplit = fixed[0];
              outerSplit = fixed[1];
            } else {
              innerSplit = fixed[1];
              outerSplit = fixed[0];
            }
            inner = innerSplit.join('<br>');
            outer = outerSplit.join('<br>');
          }
        }

        calculateCurrentSpacers = () => calculateSpacersBreaks(mainSplit, innerSplit, outerSplit, clonedOptions, containers.dummy);
        this.spacerHeights = calculateCurrentSpacers();
        resizeEvent = () => {
          scheduleLayoutRefresh(refreshLayout, resizeCallback);
          console.log("resizing")
        }
        window.addEventListener('resize', resizeEvent)
      }
      if (decorations.newBookStart) {
        this.spacerHeights = addSpacerAllowance(this.spacerHeights, parseFloat(clonedOptions.lineHeight.main) || 0);
      }
      setText();
      applyLayout();

      if (renderCallback)
        renderCallback();
      scheduleLayoutRefresh(refreshLayout);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => scheduleLayoutRefresh(refreshLayout));
      }
    },
    async renderSefaria(tractate, daf, amud = "a", sefariaOptions = {}, renderOptions = {}) {
      const sefariaDaf = await getSefariaDaf(tractate, daf, amud, sefariaOptions);
      const newBookStart = renderOptions.newBookStart !== undefined
        ? renderOptions.newBookStart
        : isFirstSefariaDaf(sefariaDaf, tractate, daf, sefariaDaf.amud);
      this.render(
        sefariaDaf.main,
        sefariaDaf.inner,
        sefariaDaf.outer,
        sefariaDaf.amud,
        renderOptions.linebreak,
        renderOptions.renderCallback,
        renderOptions.resizeCallback,
        renderOptions.continuations,
        Object.assign({}, renderOptions.decorations, { newBookStart })
      );
      return sefariaDaf;
    },
  }
}

dafRenderer.fetchSefariaDaf = fetchSefariaDaf;
dafRenderer.formatSefariaDaf = formatSefariaDaf;
dafRenderer.getSefariaDaf = getSefariaDaf;

export default dafRenderer;

