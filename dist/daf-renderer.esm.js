const defaultOptions = {
  contentWidth: "600px",
  mainWidth: "50%",
  padding: {
    vertical: "10px",
    horizontal: "16px",
  },
  innerPadding: "4px",
  outerPadding: "4px",
  halfway: "50%",
  fontFamily: {
    inner: "Rashi",
    outer: "Rashi",
    main: "Vilna"
  },
  direction: "rtl",
  fontSize: {
    main: "15px",
    side: "10.5px"
  },
  lineHeight: {
    main: "17px",
    side: "14px",
  }
};

function mergeAndClone (modified, definitional = defaultOptions) {
  const newOptions = {};
  for (const key in definitional) {
    if (key in modified) {
      const defType = typeof definitional[key];
      if (typeof modified[key] !== defType) {
        console.error(`Option ${key} must be of type ${defType}; ${typeof modified[key]} was passed.`);
      }
      if (defType == "object") {
        newOptions[key] = mergeAndClone(modified[key], definitional[key]);
      } else {
        newOptions[key] = modified[key];
      }
    } else {
      newOptions[key] = definitional[key];
    }
  }
  return newOptions;
}

function getAreaOfText(text, font, fs, width, lh, dummy) {
  let testDiv = document.createElement("div");
  testDiv.style.font = String(fs) + "px " + String(font);
  testDiv.style.width = String(width) + "px"; //You can remove this, but it may introduce unforseen problems
  testDiv.style.lineHeight = String(lh) + "px";
  testDiv.innerHTML = text;
  dummy.append(testDiv);
  let test_area = Number(testDiv.clientHeight * testDiv.clientWidth);
  testDiv.remove();
  return test_area;
}

function calculateSpacers(mainText, innerText, outerText, options, dummy) {

  const parsedOptions = {
    width: parseFloat(options.contentWidth),
    padding: {
      vertical: parseFloat(options.padding.vertical),
      horizontal: parseFloat(options.padding.horizontal)
    },
    halfway: 0.01 * parseFloat(options.halfway),
    fontFamily: options.fontFamily,
    fontSize: {
      main: parseFloat(options.fontSize.main),
      side: parseFloat(options.fontSize.side),
    },
    lineHeight: {
      main: parseFloat(options.lineHeight.main),
      side: parseFloat(options.lineHeight.side),
    },
    mainWidth: 0.01 * parseFloat(options.mainWidth)
  };

  const midWidth = Number(parsedOptions.width * parsedOptions.mainWidth) - 2*parsedOptions.padding.horizontal; //main middle strip
  const topWidth = Number(parsedOptions.width * parsedOptions.halfway) - parsedOptions.padding.horizontal; //each commentary top
  const sideWidth = Number(parsedOptions.width * (1 - parsedOptions.mainWidth)/2); //each commentary widths, dont include padding, sokeep it constant

   const spacerHeights = {
    start: 4.3 * parsedOptions.lineHeight.side,
    inner: null,
    outer: null,
    end: 0,
    exception: 0
  };

  // We are accounting for the special case, where you have line breaks:
  // if (options.lineBreaks) {
  //   console.log("Special Case for Line Breaks")
  //   const main = {
  //       name: "main",
  //       text: mainText,
  //       lineHeight: parsedOptions.lineHeight.main,
  //       top: 0,
  //     }
  //     const outer = {
  //       name: "outer",
  //       text: outerText,
  //       lineHeight: parsedOptions.lineHeight.side,
  //       top: 4,
  //     }
  //     const inner = {
  //       name: "inner",
  //       text: innerText,
  //       lineHeight: parsedOptions.lineHeight.side,
  //       top: 4,
  //   }
  //
  //     const texts = [main, outer, inner];
  //     texts.forEach(body => body.brCount = (body.text.match(/<br>/g) || []).length - body.top);
  //     texts.forEach(body => body.height = (body.brCount * body.lineHeight));
  //     texts.forEach(body => body.unadjustedHeight = ((body.brCount + body.top + 1) * body.lineHeight));
  //     texts.forEach(body => body.unadjustedHeightAlt = ((body.brCount + body.top) * body.lineHeight)*sideWidth/topWidth);
  //     const perHeight = Array.from(texts).sort((a, b) => a.height - b.height);
  //
  //     const exConst = 2.2
  //
  //     //Checking Exceptions:
  //     if (inner.unadjustedHeight <= 0 && outer.unadjustedHeight <= 0){
  //       console.error("No Commentary");
  //       return Error("No Commentary");
  //   };
  //     if (inner.unadjustedHeightAlt/exConst < spacerHeights.start || outer.unadjustedHeightAlt/exConst < spacerHeights.start) {
  //     console.log("Exceptions")
  //       if (inner.unadjustedHeightAlt/exConst <= spacerHeights.start) {
  //           spacerHeights.inner = inner.unadjustedHeight;
  //           spacerHeights.outer = outer.height
  //           return spacerHeights;
  //         }
  //       if (outer.unadjustedHeightAlt/exConst <= spacerHeights.start) {
  //           spacerHeights.outer = outer.unadjustedHeight;
  //           spacerHeights.inner = inner.height;
  //           return spacerHeights;
  //         }
  //       else {
  //         return Error("Inner Spacer Error");
  //       }
  //     };
  //     //If Double=Wrap
  //     if (perHeight[0].name === "main"){
  //       console.log("Double-Wrap");
  //       spacerHeights.inner = main.height;
  //       spacerHeights.outer = main.height;
  //
  //       const brDifference = perHeight[1].brCount - perHeight[0].brCount;
  //       spacerHeights.end = brDifference*perHeight[1].lineHeight;
  //       return spacerHeights;
  //     }
  //
  //     //If Stairs
  //     if (perHeight[1].name === "main") {
  //       console.log("Stairs");
  //       spacerHeights[perHeight[0].name] = perHeight[0].height;
  //       spacerHeights[perHeight[2].name] = main.height;
  //       return spacerHeights;
  //     }
  //
  //     //If Double Extend
  //     console.log("Double-Extend")
  //     spacerHeights.inner = inner.height + (inner.height/inner.height**2)*inner.lineHeight;
  //     spacerHeights.outer = outer.height +  (inner.height/inner.height**2)*outer.lineHeight;
  //     return spacerHeights
  // }


  // We could probably put this somewhere else, it was meant to be a place for all the padding corrections,
  // but there turned out to only be one
  const paddingAreas = {
    name: "paddingAreas",
    horizontalSide: sideWidth * parsedOptions.padding.vertical,
  };


  const topArea = (lineHeight) => ((4 * lineHeight * topWidth)); //remove area of the top 4 lines
  

  const main = {
    name: "main",
    width: midWidth,
    text: mainText,
    lineHeight: parsedOptions.lineHeight.main,
    area: getAreaOfText(mainText, parsedOptions.fontFamily.main, parsedOptions.fontSize.main, midWidth, parsedOptions.lineHeight.main, dummy),
    length: null,
    height: null,
  };
  const outer = {
    name: "outer",
    width: sideWidth,
    text: outerText,
    lineHeight: parsedOptions.lineHeight.side,
    area: getAreaOfText(outerText, parsedOptions.fontFamily.outer, parsedOptions.fontSize.side, sideWidth, parsedOptions.lineHeight.side, dummy) 
          - topArea(parsedOptions.lineHeight.side),
    length: null,
    height: null,
  };
  const inner = {
    name: "inner",
    width: sideWidth,
    text: innerText,
    lineHeight: parsedOptions.lineHeight.side,
    area:
      getAreaOfText(innerText, parsedOptions.fontFamily.inner, parsedOptions.fontSize.side, sideWidth, parsedOptions.lineHeight.side, dummy) 
      - topArea(parsedOptions.lineHeight.side),
    length: null,
    height: null,
  };

  const texts = [main, outer, inner];
  texts.forEach(text => text.height = text.area / text.width);
  texts.forEach(text => text.unadjustedArea = text.area + topArea(parsedOptions.lineHeight.side));
  texts.forEach(text => text.unadjustedHeight = text.unadjustedArea / text.width);

  const perHeight = Array.from(texts).sort((a, b) => a.height - b.height);
 
  //There are Three Main Types of Case:
  //Double-Wrap: The main text being the smallest and commentaries wrapping around it
  //Stairs: The main text wrapping around one, but the other wrapping around it
  //Double-Extend: The main text wrapping around both commentaries

  //Main Text is Smallest: Double-Wrap
  //Main Text being Middle: Stairs
  //Main Text Being Largest: Double-Extend

  //First we need to check we have enough commentary to fill the first four lines
  if (inner.height <= 0 && outer.height <= 0){
    console.error("No Commentary");
    return Error("No Commentary");
  }
 
  // This is a case that we have to decice what to do with, when there is not enough commentary on both sides to fill the lines. 
  if (inner.height <= spacerHeights.start && outer.height <= spacerHeights.start) {
    console.error("Not Enough Commentary to Fill Four Lines");
    return Error("Not Enough Commentary");
  }
  // We are going to deal with our first edge case when there is either only one commentary
  // Or where there is enough of one commentary, but not four lines of the other.
  if (inner.unadjustedHeight  <= spacerHeights.start || outer.unadjustedHeight  <= spacerHeights.start) {
    if (inner.unadjustedHeight  <= spacerHeights.start) {
      spacerHeights.inner = inner.unadjustedHeight;
      spacerHeights.outer = (outer.unadjustedArea - parsedOptions.width * 4 * parsedOptions.lineHeight.side) / sideWidth;
      spacerHeights.exception = 1;
      return spacerHeights;
    }
    if (outer.unadjustedHeight <= spacerHeights.start) {
      spacerHeights.outer = outer.unadjustedHeight;

      spacerHeights.inner = (inner.unadjustedArea - parsedOptions.width * 4 * parsedOptions.lineHeight.side) / sideWidth;
      spacerHeights.exception = 2;
      return spacerHeights;
    }
    else {
      return Error("Inner Spacer Error");
    }
  }
  //If Double=Wrap
  if (perHeight[0].name === "main"){
    console.log("Double-Wrap"); 
    spacerHeights.inner = main.area/midWidth;
    spacerHeights.outer = spacerHeights.inner;
    
    const sideArea = spacerHeights.inner * sideWidth + paddingAreas.horizontalSide;
    const bottomChunk = perHeight[1].area - sideArea;
    const bottomHeight = bottomChunk / topWidth; 
    spacerHeights.end = bottomHeight;
    return spacerHeights;
  }
  // If Stairs, there's one text at the bottom. We will call it THE stair. 
  // The remaining two texts form a "block" that we must compare with that bottom text.
  const blockArea = (main.area + perHeight[0].area);
  const blockWidth = midWidth + sideWidth;
  const blockHeight = blockArea / blockWidth;

  const stair = (perHeight[1].name == "main") ? perHeight[2] : perHeight[1];
  const stairHeight = stair.area / stair.width;

  if (blockHeight < stairHeight) {
    console.log(`Stairs, ${stair.name} is the stair`);
    // This function accounts for extra space that is introduced by padding
    const lilArea = (height1, height2, horizPadding) => (horizPadding) * (height1 - height2);
    const smallest = perHeight[0];
    spacerHeights[smallest.name] = smallest.height;
    spacerHeights[stair.name] = (blockArea - lilArea(blockHeight, spacerHeights[smallest.name], parsedOptions.padding.horizontal)) / blockWidth;
    return spacerHeights
  }
  //If Double Extend
  console.log("Double-Extend");
  spacerHeights.inner = inner.height;
  spacerHeights.outer = outer.height;

  return spacerHeights
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = "/*Keep this as the first rule in the file*/\r\n.styles_dafRoot__1QUlM {\r\n  --contentWidth: 0px;\r\n  --padding-horizontal: 0px;\r\n  --padding-vertical: 0px;\r\n  --halfway: 50%;\r\n\r\n  --fontFamily-inner: \"Rashi\";\r\n  --fontFamily-outer: \"Tosafot\";\r\n  --fontFamily-main: \"Vilna\";\r\n  --direction: \"rtl\";\r\n\r\n  --fontSize-main: 0px;\r\n  --fontSize-side: 0px;\r\n\r\n  --lineHeight-main: 0px;\r\n  --lineHeight-side: 0px;\r\n\r\n  --mainWidth: 0%;\r\n  --mainMargin-start: var(--mainWidth);\r\n  --sidePercent: calc(calc(100% - var(--mainMargin-start)) / 2);\r\n  --remainderPercent: calc(100% - var(--sidePercent));\r\n\r\n  --innerFloat: left;\r\n  --outerFloat: right;\r\n\r\n  --spacerHeights-start: 0px;\r\n  --spacerHeights-outer: 0px;\r\n  --spacerHeights-inner: 0px;\r\n  --spacerHeights-end: 0px;\r\n\r\n  /*Edge Cases*/\r\n  --hasInnerStartGap: 0;\r\n  --hasOuterStartGap: 0;\n  --innerStartWidth: 50%;\n  --innerPadding: 0px;\n  --outerStartWidth: 50%;\n  --outerPadding: 0px;\n\n  --newBookFrameImage: url(\"NEW_BOOK.png\");\n}\n\r\n/*Containers*/\r\n.styles_dafRoot__1QUlM,\n.styles_outer__abXQX,\n.styles_inner__x-amJ,\n.styles_main__BHTRd {\n  width: var(--contentWidth);\n  pointer-events: none;\n  box-sizing: content-box;\n}\n\n.styles_dafRoot__1QUlM {\n  position: relative;\n}\n\r\n.styles_outer__abXQX, .styles_inner__x-amJ, .styles_main__BHTRd {\r\n  position: absolute;\r\n}\r\n\r\n/*Float changes with amud*/\r\n.styles_inner__x-amJ .styles_spacer__2T7TS,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  float: var(--innerFloat);\r\n}\r\n\r\n.styles_outer__abXQX .styles_spacer__2T7TS,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi {\r\n  float: var(--outerFloat);\r\n}\r\n\r\n/*Spacer widths determined by options*/\r\n.styles_inner__x-amJ .styles_spacer__2T7TS,\r\n.styles_outer__abXQX .styles_spacer__2T7TS {\r\n  width: var(--halfway);\r\n}\r\n.styles_spacer__2T7TS.styles_mid__dcgUr {\r\n  width: var(--remainderPercent);\r\n}\r\n\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--contentWidth);\r\n}\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  width: var(--sidePercent);\r\n}\r\n\r\n/*Spacer heights determined by algorithm*/\r\n.styles_spacer__2T7TS.styles_start__AwkfY {\r\n  height: var(--spacerHeights-start);\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_end__2wr6A {\r\n  height: var(--spacerHeights-end);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi {\r\n  height: var(--spacerHeights-inner);\r\n}\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  height: var(--spacerHeights-outer);\r\n}\r\n\r\n/*Settings to handle edge Cases*/\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--innerStartWidth);\r\n  margin-left: var(--innerPadding);\r\n  margin-right: var(--innerPadding);\r\n}\r\n\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--outerStartWidth);\r\n  margin-left: var(--outerPadding);\r\n  margin-right: var(--outerPadding);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_start__AwkfY{\r\n  margin-bottom: calc(var(--padding-vertical) * var(--hasInnerStartGap));\r\n}\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  margin-bottom: calc(var(--padding-vertical) * var(--hasOuterStartGap));\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr {\r\n  clear: both;\r\n}\r\n\r\n/*Margins!*/\r\n.styles_spacer__2T7TS.styles_start__AwkfY,\r\n.styles_spacer__2T7TS.styles_end__2wr6A,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  margin-left: calc(0.5 * var(--padding-horizontal));\r\n  margin-right: calc(0.5 * var(--padding-horizontal));\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_text__1_7-z {\r\n  margin-top: var(--padding-vertical);\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  margin-bottom: var(--padding-vertical);\r\n}\r\n\r\n/*Text*/\r\n.styles_text__1_7-z {\n  direction: var(--direction);\n  text-align: justify;\n  text-align-last: justify;\n  text-justify: inter-word;\n  word-break: normal;\n  overflow-wrap: normal;\n  hyphens: none;\n  font-kerning: normal;\n}\n\r\n.styles_text__1_7-z span {\n  pointer-events: auto;\n}\n\n.styles_text__1_7-z > span {\n  display: block;\n  text-align: inherit;\n  text-align-last: inherit;\n}\n\n.styles_balanceBreak__1CAJZ {\n  content: \"\";\n}\n\n.styles_continuationCatchword__xHvSp {\n  display: block;\n  width: max-content;\n  max-width: 100%;\n  margin-top: calc(-0.25 * var(--lineHeight-side));\n  text-align: start;\n  text-align-last: auto;\n  white-space: nowrap;\n  unicode-bidi: isolate;\n}\n\r\n.styles_main__BHTRd .styles_continuationCatchword__xHvSp {\r\n  margin-top: calc(-0.2 * var(--lineHeight-main));\r\n}\r\n\r\n.styles_main__BHTRd .styles_text__1_7-z {\n  font-family: var(--fontFamily-main);\n  font-size: var(--fontSize-main);\n  line-height: var(--lineHeight-main);\n}\n\n.styles_newBookWord__3auqa {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: calc(var(--mainWidth) - var(--padding-horizontal) - var(--padding-horizontal));\n  min-height: 3.1em;\n  max-width: 100%;\n  margin: 0 auto 0.08em;\n  padding: 0.52em 1.12em 0.45em;\n  box-sizing: border-box;\n  background-image: var(--newBookFrameImage);\n  background-position: center;\n  background-repeat: no-repeat;\n  background-size: contain;\n  font-size: 2.9em;\n  line-height: 1;\n  text-align: center;\n  text-align-last: center;\n  vertical-align: middle;\n  white-space: nowrap;\n}\n\n.styles_newBookBreak__1mIe7 {\n  display: block;\n}\n\n.styles_inner__x-amJ .styles_text__1_7-z,\n.styles_outer__abXQX .styles_text__1_7-z {\n  font-size: var(--fontSize-side);\n  line-height: var(--lineHeight-side);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-inner);\r\n}\r\n\r\n.styles_outer__abXQX .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-outer);\r\n}\r\n";
var classes = {"dafRoot":"styles_dafRoot__1QUlM","outer":"styles_outer__abXQX","inner":"styles_inner__x-amJ","main":"styles_main__BHTRd","spacer":"styles_spacer__2T7TS","outerMid":"styles_outerMid__2WtcY","innerMid":"styles_innerMid__27MCi","mid":"styles_mid__dcgUr","start":"styles_start__AwkfY","end":"styles_end__2wr6A","text":"styles_text__1_7-z","balanceBreak":"styles_balanceBreak__1CAJZ","continuationCatchword":"styles_continuationCatchword__xHvSp","newBookWord":"styles_newBookWord__3auqa","newBookBreak":"styles_newBookBreak__1mIe7"};
styleInject(css_248z);

const sideSpacersClasses = {
  start: [classes.spacer, classes.start],
  mid: [classes.spacer, classes.mid],
  end: [classes.spacer, classes.end]
};

const containerClasses = {
  el: classes.dafRoot,
  outer: {
    el: classes.outer,
    spacers: sideSpacersClasses,
    text: classes.text,
  },
  inner: {
    el: classes.inner,
    spacers: sideSpacersClasses,
    text: classes.text,
  },
  main: {
    el: classes.main,
    spacers: {
      start: sideSpacersClasses.start,
      inner: [classes.spacer, classes.innerMid],
      outer: [classes.spacer, classes.outerMid]
    },
    text: classes.text
  }
};

function addClasses(element, classNames) {
  if (Array.isArray(classNames))
    element.classList.add(...classNames);
  else
    element.classList.add(classNames);
}

function setVars(object, prefix = "") {
  const varsRule = Array.prototype.find.call
  (document.styleSheets, sheet => sheet.rules[0].selectorText == `.${classes.dafRoot}`)
    .rules[0];

  Object.entries(object).forEach(([key, value]) => {
    if (typeof value == "string") {
      varsRule.style.setProperty(`--${prefix}${key}`, value);
    } else if (typeof value == "object") {
      setVars(value, `${key}-`);
    }
  });
}


let appliedOptions;
var styleManager = {
  applyClasses(containers, classesMap = containerClasses) {
    for (const key in containers) {
      if (key in classesMap) {
        const value = classesMap[key];
        if (typeof value === "object" && !Array.isArray(value)) {
          this.applyClasses(containers[key], value);
        } else {
          addClasses(containers[key], value);
        }
      }
    }
  },
  updateOptionsVars(options) {
    appliedOptions = options;
    setVars(options);
  },
  updateSpacersVars(spacerHeights) {
    setVars(
      Object.fromEntries(
        Object.entries(spacerHeights).map(
          ([key, value]) => ([key, String(value) + 'px']))
      ),
      "spacerHeights-"
    );
  },
  updateIsAmudB(amudB) {
    setVars({
      innerFloat: amudB ? "right" : "left",
      outerFloat: amudB ? "left" : "right"
    });
  },
  manageExceptions(spacerHeights) {
    if (!spacerHeights.exception) {
      setVars({
        hasOuterStartGap: "0",
        hasInnerStartGap: "0",
        outerStartWidth: "50%",
        innerStartWidth: "50%",
        innerPadding: appliedOptions.innerPadding,
        outerPadding: appliedOptions.outerPadding,
      });
      return;
    }
    if (spacerHeights.exception === 1) {
      console.log("In Style Exception, Case 1");
      setVars({
        hasInnerStartGap: "1",
        innerStartWidth: "100%",
        outerStartWidth: "0%",
        innerPadding: "0px",
        outerPadding: "0px",
      });
    } else if (spacerHeights.exception === 2) {
      console.log("In Style Exception, Case 2");
      setVars({
        hasOuterStartGap: "1",
        outerStartWidth: "100%",
        innerStartWidth: "0%",
        innerPadding: "0px",
        outerPadding: "0px"
      });
    }
  }
};

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

async function fetchSefariaDaf(tractate, daf, amud = "a", options = {}) {
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

function formatSefariaDaf(daf) {
  return {
    amud: daf.amud,
    refs: daf.refs,
    titles: daf.titles,
    main: formatMain(daf.texts.main),
    inner: formatCommentary(daf.texts.inner, "word-rashi", "rashi-header"),
    outer: formatCommentary(daf.texts.outer, "word-tosafot", "tosafot-header")
  };
}

async function getSefariaDaf(tractate, daf, amud = "a", options = {}) {
  return formatSefariaDaf(await fetchSefariaDaf(tractate, daf, amud, options));
}

function getLineInfo(text, font, fontSize, lineHeight, dummy) {
  dummy.innerHTML = "";
  let testDiv = document.createElement("span");
  testDiv.style.font = fontSize + " " + String(font);
  testDiv.style.lineHeight = String(lineHeight) + "px";
  testDiv.innerHTML = text;
  testDiv.style.position = "absolute";
  dummy.append(testDiv);
  const rect = testDiv.getBoundingClientRect();
  const height = rect.height;
  const width = rect.width;
  const widthProportional = width / dummy.getBoundingClientRect().width;
  testDiv.remove();
  return {height, width, widthProportional};
}

function heightAccumulator(font, fontSize, lineHeight, dummy) {
  return (lines) => {
    return getLineInfo(lines.join("<br>"), font, fontSize, lineHeight, dummy).height;
  }
}

function getBreaks(sizeArray) {
  const widths = sizeArray.map(size => size.widthProportional);
  const diffs = widths.map((width, index, widths) => index == 0 ? 0 : Math.abs(width - widths[index - 1]));
  const threshold = 0.12;
  let criticalPoints = diffs.reduce((indices, curr, currIndex) => {
    //Breaks before line 4 are flukes
    if (currIndex < 4) return indices;
    if (curr > threshold) {
      //There should never be two breakpoints in a row
      const prevIndex = indices[indices.length - 1];
      if (prevIndex && (currIndex - prevIndex) == 1) {
        return indices;
      }
      indices.push(currIndex);
    }
    return indices;
  }, []);
  const averageAround = points => points.map((point, i) => {
    let nextPoint;
    if (!nextPoint) {
      nextPoint = Math.min(point + 3, widths.length - 1);
    }
    let prevPoint;
    if (!prevPoint) {
      prevPoint = Math.max(point - 3, 0);
    }
    /*
      Note that these are divided by the width of the critical point line such that
      we get the average width of the preceeding and proceeding chunks *relative*
      to the critical line.
     */
    const before = (widths.slice(prevPoint, point).reduce((acc, curr) => acc + curr) /
      (point - prevPoint)) / widths[point];
    let after;
    if ( point + 1 >= nextPoint) {
      after = widths[nextPoint] / widths[point];
    } else {
        after =(widths.slice(point + 1, nextPoint).reduce((acc, curr) => acc + curr) /
          (nextPoint - point - 1)) / widths[point];
    }
    return {
      point,
      before,
      after,
      diff: Math.abs(after - before)
    }
   });
  const aroundDiffs = averageAround(criticalPoints)
    .sort( (a,b) => b.diff - a.diff);
  criticalPoints = aroundDiffs
    .filter( ({diff}) => diff > 0.22)
    .map( ({point}) => point);
  return criticalPoints.sort( (a, b) => a - b);
}

function onlyOneCommentary(lines, options, dummy) {
  const fontFamily = options.fontFamily.inner;
  const fontSize = options.fontSize.side;
  const lineHeight = parseFloat(options.lineHeight.side);
  const sizes = lines.map(text => getLineInfo(text, fontFamily, fontSize, lineHeight, dummy));
  const breaks = getBreaks(sizes);
  if (breaks.length == 3) {
    const first = lines.slice(0, breaks[1]);
    const second = lines.slice(breaks[1]);
    return [first, second];
  }
}

function calculateSpacersBreaks(mainArray, rashiArray, tosafotArray, options, dummy) {
  const lines = {
    main: mainArray,
    rashi: rashiArray,
    tosafot: tosafotArray
  };

  const parsedOptions = {
    padding: {
      vertical: parseFloat(options.padding.vertical),
      horizontal: parseFloat(options.padding.horizontal)
    },
    halfway: 0.01 * parseFloat(options.halfway),
    fontFamily: options.fontFamily, // Object of strings
    fontSize: {
      main: options.fontSize.main,
      side: options.fontSize.side,
    },
    lineHeight: {
      main: parseFloat(options.lineHeight.main),
      side: parseFloat(options.lineHeight.side),
    },
  };


  const mainOptions = [parsedOptions.fontFamily.main, parsedOptions.fontSize.main, parsedOptions.lineHeight.main];
  const commentaryOptions = [parsedOptions.fontFamily.inner, parsedOptions.fontSize.side, parsedOptions.lineHeight.side];
  
  const sizes = {};
  sizes.main = lines.main.map(text => getLineInfo(text, ...mainOptions, dummy));
  ["rashi", "tosafot"].forEach(text => {
    sizes[text] = lines[text].map(line => getLineInfo(line, ...commentaryOptions, dummy));
  });

  const accumulateMain = heightAccumulator(...mainOptions, dummy);
  const accumulateCommentary = heightAccumulator(...commentaryOptions, dummy);

  const breaks = {};

  ["rashi", "tosafot", "main"].forEach(text => {
    breaks[text] = getBreaks(sizes[text])
      /*
      Hadran lines aren't real candidates for line breaks.
        TODO: Extract this behavior , give it an option/parameter
       */
        .filter(lineNum => !(lines[text][lineNum].includes("hadran"))
    );
  });
  

  const spacerHeights = {
    start: 4.4 * parsedOptions.lineHeight.side,
    inner: null,
    outer: null,
    end: 0,
    exception: 0
  };

  const mainHeight = accumulateMain(lines.main);
  const mainHeightOld = (sizes.main.length) * parsedOptions.lineHeight.main;
  let afterBreak = {
    inner: accumulateCommentary(lines.rashi.slice(4)),
    outer: accumulateCommentary(lines.tosafot.slice(4))
  };

  let afterBreakOld = {
    inner: parsedOptions.lineHeight.side * (sizes.rashi.length - 4),
    outer: parsedOptions.lineHeight.side * (sizes.tosafot.length - 4)
  };

  if (breaks.rashi.length < 1 || breaks.tosafot.length < 1) {
    console.log("Dealing with Exceptions");
    if (breaks.rashi.length < 1) {
      afterBreak.inner = parsedOptions.lineHeight.side * (sizes.rashi.length + 1);
      spacerHeights.exception = 2;
    }
    if (breaks.tosafot.length < 1) {
      afterBreak.outer = parsedOptions.lineHeight.side * (sizes.tosafot.length + 1);
      spacerHeights.exception = 2;
    }
}
  switch (breaks.main.length) {
    case 0:
      spacerHeights.inner = mainHeight;
      spacerHeights.outer = mainHeight;
      if (breaks.rashi.length == 2) {
        spacerHeights.end = accumulateCommentary(lines.rashi.slice(breaks.rashi[1]));
      } else {
        spacerHeights.end = accumulateCommentary(lines.tosafot.slice(breaks.tosafot[1]));
      }
      console.log("Double wrap");
      break;
    case 1:
      if (breaks.rashi.length != breaks.tosafot.length) {
        if (breaks.tosafot.length == 0) {
          spacerHeights.outer = 0;
          spacerHeights.inner = afterBreak.inner;
          break;
        }
        if (breaks.rashi.length == 0) {
          spacerHeights.inner = 0;
          spacerHeights.outer = afterBreak.outer;
          break;
        }
        let stair;
        let nonstair;
        if (breaks.rashi.length == 1) {
          stair = "outer";
          nonstair = "inner";
        } else {
          stair = "inner";
          nonstair = "outer";
        }
        spacerHeights[nonstair] = afterBreak[nonstair];
        spacerHeights[stair] = mainHeight;
        console.log("Stairs");
        break;
      }
    case 2:
      spacerHeights.inner = afterBreak.inner;
      spacerHeights.outer = afterBreak.outer;
      console.log("Double Extend");
      break;
    default:
      spacerHeights.inner = afterBreak.inner;
      spacerHeights.outer = afterBreak.outer;
      console.log("No Case Exception");
      break;
  }
  return spacerHeights;
}

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
  };

  const textSpans = {
    main: span(containers.main.text),
    inner: span(containers.inner.text),
    outer: span(containers.outer.text)
  };

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
        };
        window.addEventListener("resize", resizeEvent);
      }
      else {
        let [mainSplit, innerSplit, outerSplit] = [renderedMain, inner, outer].map( text => {
          containers.dummy.innerHTML = text;
          const divRanges = Array.from(containers.dummy.querySelectorAll("div")).map(div => {
            const range = document.createRange();
            range.selectNode(div);
            return range;
          });

          const brs = containers.dummy.querySelectorAll(linebreak);
          const splitFragments = [];
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
          });

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
          console.log("resizing");
        };
        window.addEventListener('resize', resizeEvent);
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
