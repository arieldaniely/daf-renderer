(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.dafRenderer = factory());
}(this, (function () { 'use strict';

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
    },
    sideAdditionsWidth: "90px",
    sideAdditionsGap: "8px",
    sideAdditionsFontSize: "9.2px",
    sideAdditionsLineHeight: "12.8px"
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

  var css_248z = "/*Keep this as the first rule in the file*/\r\n.styles_dafRoot__1QUlM {\r\n  --contentWidth: 0px;\r\n  --padding-horizontal: 0px;\r\n  --padding-vertical: 0px;\r\n  --halfway: 50%;\r\n\r\n  --fontFamily-inner: \"Rashi\";\r\n  --fontFamily-outer: \"Tosafot\";\r\n  --fontFamily-main: \"Vilna\";\r\n  --direction: \"rtl\";\r\n\r\n  --fontSize-main: 0px;\r\n  --fontSize-side: 0px;\r\n\r\n  --lineHeight-main: 0px;\r\n  --lineHeight-side: 0px;\r\n\r\n  --mainWidth: 0%;\r\n  --mainMargin-start: var(--mainWidth);\r\n  --sidePercent: calc(calc(100% - var(--mainMargin-start)) / 2);\r\n  --remainderPercent: calc(100% - var(--sidePercent));\r\n\r\n  --innerFloat: left;\r\n  --outerFloat: right;\r\n  --sideAdditionsGap: 8px;\r\n  --sideAdditionsWidth: 90px;\r\n  --sideAdditionsFontSize: 9.2px;\r\n  --sideAdditionsLineHeight: 12.8px;\r\n  --sideAdditionsSlot: calc(var(--sideAdditionsWidth) + var(--sideAdditionsGap));\r\n  --innerAdditionsLeft: 0;\r\n  --innerAdditionsRight: auto;\r\n  --outerAdditionsLeft: auto;\r\n  --outerAdditionsRight: auto;\r\n\r\n  --spacerHeights-start: 0px;\r\n  --spacerHeights-outer: 0px;\r\n  --spacerHeights-inner: 0px;\r\n  --spacerHeights-end: 0px;\r\n\r\n  /*Edge Cases*/\r\n  --hasInnerStartGap: 0;\r\n  --hasOuterStartGap: 0;\r\n  --innerStartWidth: 50%;\r\n  --innerPadding: 0px;\r\n  --outerStartWidth: 50%;\r\n  --outerPadding: 0px;\r\n\r\n  --newBookFrameImage: url(\"assets/new-book-frame.png\");\r\n}\r\n\r\n/*Containers*/\r\n.styles_dafRoot__1QUlM,\r\n.styles_outer__abXQX,\r\n.styles_inner__x-amJ,\r\n.styles_main__BHTRd {\r\n  pointer-events: none;\r\n  box-sizing: content-box;\r\n}\r\n\r\n.styles_dafRoot__1QUlM {\r\n  position: relative;\r\n  width: calc(var(--contentWidth) + var(--sideAdditionsSlot) + var(--sideAdditionsSlot));\r\n}\r\n\r\n.styles_outer__abXQX,\r\n.styles_inner__x-amJ,\r\n.styles_main__BHTRd {\r\n  left: var(--sideAdditionsSlot);\r\n  width: var(--contentWidth);\r\n}\r\n\r\n.styles_outer__abXQX, .styles_inner__x-amJ, .styles_main__BHTRd {\r\n  position: absolute;\r\n}\r\n\r\n.styles_sideAdditions__3mxbs {\r\n  position: absolute;\r\n  top: 0;\r\n  width: var(--sideAdditionsWidth);\r\n  box-sizing: border-box;\r\n  pointer-events: none;\r\n  color: #000;\r\n}\r\n\r\n.styles_innerAdditions__oYnaG {\r\n  left: var(--innerAdditionsLeft);\r\n  right: var(--innerAdditionsRight);\r\n}\r\n\r\n.styles_outerAdditions__2Ol5M {\r\n  left: var(--outerAdditionsLeft);\r\n  right: var(--outerAdditionsRight);\r\n}\r\n\r\n/*Float changes with amud*/\r\n.styles_inner__x-amJ .styles_spacer__2T7TS,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  float: var(--innerFloat);\r\n}\r\n\r\n.styles_outer__abXQX .styles_spacer__2T7TS,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi {\r\n  float: var(--outerFloat);\r\n}\r\n\r\n/*Spacer widths determined by options*/\r\n.styles_inner__x-amJ .styles_spacer__2T7TS,\r\n.styles_outer__abXQX .styles_spacer__2T7TS {\r\n  width: var(--halfway);\r\n}\r\n.styles_spacer__2T7TS.styles_mid__dcgUr {\r\n  width: var(--remainderPercent);\r\n}\r\n\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--contentWidth);\r\n}\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  width: var(--sidePercent);\r\n}\r\n\r\n/*Spacer heights determined by algorithm*/\r\n.styles_spacer__2T7TS.styles_start__AwkfY {\r\n  height: var(--spacerHeights-start);\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_end__2wr6A {\r\n  height: var(--spacerHeights-end);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi {\r\n  height: var(--spacerHeights-inner);\r\n}\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  height: var(--spacerHeights-outer);\r\n}\r\n\r\n/*Settings to handle edge Cases*/\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--innerStartWidth);\r\n  margin-left: var(--innerPadding);\r\n  margin-right: var(--innerPadding);\r\n}\r\n\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  width: var(--outerStartWidth);\r\n  margin-left: var(--outerPadding);\r\n  margin-right: var(--outerPadding);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_spacer__2T7TS.styles_start__AwkfY{\r\n  margin-bottom: calc(var(--padding-vertical) * var(--hasInnerStartGap));\r\n}\r\n.styles_outer__abXQX .styles_spacer__2T7TS.styles_start__AwkfY {\r\n  margin-bottom: calc(var(--padding-vertical) * var(--hasOuterStartGap));\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr {\r\n  clear: both;\r\n}\r\n\r\n/*Margins!*/\r\n.styles_spacer__2T7TS.styles_start__AwkfY,\r\n.styles_spacer__2T7TS.styles_end__2wr6A,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  margin-left: calc(0.5 * var(--padding-horizontal));\r\n  margin-right: calc(0.5 * var(--padding-horizontal));\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_text__1_7-z {\r\n  margin-top: var(--padding-vertical);\r\n}\r\n\r\n.styles_spacer__2T7TS.styles_mid__dcgUr,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_innerMid__27MCi,\r\n.styles_main__BHTRd .styles_spacer__2T7TS.styles_outerMid__2WtcY {\r\n  margin-bottom: var(--padding-vertical);\r\n}\r\n\r\n/*Text*/\r\n.styles_text__1_7-z {\r\n  direction: var(--direction);\r\n  text-align: justify;\r\n  text-align-last: justify;\r\n  text-justify: inter-word;\r\n  word-break: normal;\r\n  overflow-wrap: normal;\r\n  hyphens: none;\r\n  font-kerning: normal;\r\n}\r\n\r\n.styles_text__1_7-z span {\r\n  pointer-events: auto;\r\n}\r\n\r\n.styles_text__1_7-z > span {\r\n  display: block;\r\n  text-align: inherit;\r\n  text-align-last: inherit;\r\n}\r\n\r\n.styles_balanceBreak__1CAJZ {\r\n  content: \"\";\r\n}\r\n\r\n.styles_continuationCatchword__xHvSp {\r\n  display: block;\r\n  width: max-content;\r\n  max-width: 100%;\r\n  margin-top: calc(-0.25 * var(--lineHeight-side));\r\n  text-align: start;\r\n  text-align-last: auto;\r\n  white-space: nowrap;\r\n  unicode-bidi: isolate;\r\n}\r\n\r\n.styles_main__BHTRd .styles_continuationCatchword__xHvSp {\r\n  margin-top: calc(-0.2 * var(--lineHeight-main));\r\n}\r\n\r\n.styles_main__BHTRd .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-main);\r\n  font-size: var(--fontSize-main);\r\n  line-height: var(--lineHeight-main);\r\n}\r\n\r\n.daf-hadran {\r\n  display: block;\r\n  margin: 0.85em 0;\r\n  font-size: 1.22em;\r\n  line-height: 1.25;\r\n  text-align: center;\r\n  text-align-last: center;\r\n}\r\n\r\n.daf-before-hadran {\r\n  text-align: center;\r\n  text-align-last: center;\r\n}\r\n\r\n.styles_text__1_7-z > .daf-before-hadran {\r\n  text-align: center;\r\n  text-align-last: center;\r\n}\r\n\r\n.styles_main__BHTRd .daf-chapter-start-word {\r\n  float: right;\r\n  margin: -0.08em 0 0 0.18em;\r\n  font-size: 1.58em;\r\n  line-height: 0.78;\r\n  text-align: center;\r\n  text-align-last: center;\r\n}\r\n\r\n.styles_main__BHTRd .daf-inline-tosafot {\r\n  display: block;\r\n  float: left;\r\n  width: 12.8em;\r\n  max-width: calc(100% - 8px);\r\n  margin: 0 0 0.25em 0.65em;\r\n  font-family: var(--fontFamily-outer);\r\n  font-size: var(--fontSize-side);\r\n  line-height: var(--lineHeight-side);\r\n  text-align: justify;\r\n  text-align-last: justify;\r\n}\r\n\r\n.styles_main__BHTRd .daf-inline-tosafot .word {\r\n  pointer-events: auto;\r\n}\r\n\r\n.daf-ein-marker,\r\n.daf-torah-marker {\r\n  font-family: var(--fontFamily-main);\r\n  font-size: 0.62em;\r\n  line-height: 0;\r\n  vertical-align: super;\r\n  text-align: start;\r\n  text-align-last: auto;\r\n  white-space: nowrap;\r\n}\r\n\r\n.daf-ein-marker {\r\n  margin-inline-start: 0.06em;\r\n}\r\n\r\n.daf-torah-marker {\r\n  margin-inline-start: 0.04em;\r\n}\r\n\r\n.daf-side-section {\r\n  display: block;\r\n  margin-top: 0;\r\n  margin-bottom: 0.55em;\r\n  font-family: var(--fontFamily-inner);\r\n  text-align: justify;\r\n  text-align-last: justify;\r\n}\r\n\r\n.daf-side-title {\r\n  display: block;\r\n  margin-bottom: 0.24em;\r\n  font-family: var(--fontFamily-main);\r\n  font-size: 1.50em;\r\n  line-height: 1.12;\r\n  color: #000;\r\n  text-align: center;\r\n  text-align-last: center;\r\n}\r\n\r\n.daf-ein-section .daf-side-title {\r\n  color: #000;\r\n}\r\n\r\n.daf-side-entry {\r\n  display: block;\r\n  margin-bottom: 0.22em;\r\n}\r\n\r\n.daf-side-entry-marker {\r\n  font-family: var(--fontFamily-main);\r\n  font-weight: 700;\r\n}\r\n\r\n.daf-side-entry small {\r\n  font-size: 0.86em;\r\n}\r\n\r\n.daf-gilyon-section {\r\n  margin-top: 1.45em;\r\n  padding-top: 2.05em;\r\n  background-image: url(\"assets/gilyon-divider.png\");\r\n  background-position: top center;\r\n  background-repeat: no-repeat;\r\n  background-size: 68% auto;\r\n}\r\n\r\n.styles_newBookWord__3auqa {\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  width: calc(var(--mainWidth) - var(--padding-horizontal) - var(--padding-horizontal));\r\n  min-height: 3.1em;\r\n  max-width: 100%;\r\n  margin: 0 auto 0.08em;\r\n  padding: 0.52em 1.12em 0.45em;\r\n  box-sizing: border-box;\r\n  background-image: var(--newBookFrameImage);\r\n  background-position: center;\r\n  background-repeat: no-repeat;\r\n  background-size: contain;\r\n  font-size: 2.9em;\r\n  line-height: 1;\r\n  text-align: center;\r\n  text-align-last: center;\r\n  vertical-align: middle;\r\n  white-space: nowrap;\r\n}\r\n\r\n.styles_newBookBreak__1mIe7 {\r\n  display: none;\r\n}\r\n\r\n.styles_inner__x-amJ .styles_text__1_7-z,\r\n.styles_outer__abXQX .styles_text__1_7-z {\r\n  font-size: var(--fontSize-side);\r\n  line-height: var(--lineHeight-side);\r\n}\r\n\r\n.styles_inner__x-amJ .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-inner);\r\n}\r\n\r\n.styles_outer__abXQX .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-outer);\r\n}\r\n\r\n.styles_sideAdditions__3mxbs .styles_text__1_7-z {\r\n  font-family: var(--fontFamily-inner);\r\n  font-size: var(--sideAdditionsFontSize);\r\n  line-height: var(--sideAdditionsLineHeight);\r\n}\r\n";
  var classes = {"dafRoot":"styles_dafRoot__1QUlM","outer":"styles_outer__abXQX","inner":"styles_inner__x-amJ","main":"styles_main__BHTRd","sideAdditions":"styles_sideAdditions__3mxbs","innerAdditions":"styles_innerAdditions__oYnaG","outerAdditions":"styles_outerAdditions__2Ol5M","spacer":"styles_spacer__2T7TS","outerMid":"styles_outerMid__2WtcY","innerMid":"styles_innerMid__27MCi","mid":"styles_mid__dcgUr","start":"styles_start__AwkfY","end":"styles_end__2wr6A","text":"styles_text__1_7-z","balanceBreak":"styles_balanceBreak__1CAJZ","continuationCatchword":"styles_continuationCatchword__xHvSp","newBookWord":"styles_newBookWord__3auqa","newBookBreak":"styles_newBookBreak__1mIe7"};
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
    },
    innerAdditions: {
      el: [classes.sideAdditions, classes.innerAdditions],
      text: classes.text
    },
    outerAdditions: {
      el: [classes.sideAdditions, classes.outerAdditions],
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
        outerFloat: amudB ? "left" : "right",
        innerAdditionsLeft: amudB ? "auto" : "0",
        innerAdditionsRight: amudB ? "0" : "auto",
        outerAdditionsLeft: amudB ? "0" : "auto",
        outerAdditionsRight: amudB ? "auto" : "0"
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

  function commentarySegments(text) {
    if (text && typeof text === "object" && "value" in text) {
      return [text];
    }

    if (Array.isArray(text) && text.every(segment => segment && typeof segment === "object" && "value" in segment)) {
      return text;
    }

    const values = Array.isArray(text) ? text : [text];
    return values
      .map((value, index) => ({
        value: flattenText(value).filter(Boolean).join(" "),
        sentenceId: `sentence-main-${index}`
      }))
      .filter(segment => stripHtml(segment.value));
  }

  function formatCommentary(text, prefix, headerClass) {
    return commentarySegments(text)
      .map(segment => {
        const sentenceId = segment.sentenceId;
        const value = String(segment.value);
        const html = isHadranSegment(value)
          ? `<span class="daf-hadran">${cleanHadranSegment(value)}</span>`
          : value.replace(/([^\u2013:]+)\s+[\u2013-]\s+([^:]+:)/, `<b class="${headerClass}">$1. </b>$2 `);

        return `<span class="commentary-segment" data-sentence="${escapeAttribute(sentenceId)}">${wrapWords(html, prefix, 0, sentenceId)}</span>`;
      })
      .join(" ")
      .replace(/,,/g, "")
      .replace(/,:/g, ": ")
      .replace(/:,/g, ": ");
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
    const source = segment && typeof segment === "object" && "value" in segment ? segment.value : segment;
    const parts = String(source || "").split(/(\s+)/);
    const wordParts = parts
      .map((part, index) => ({ part, index }))
      .filter(({ part }) => part && !/^\s+$/.test(part));
    const cutWord = Math.ceil(wordParts.length / 2);
    const cutIndex = wordParts[cutWord] ? wordParts[cutWord].index : parts.length;
    const values = [
      parts.slice(0, cutIndex).join("").trim(),
      parts.slice(cutIndex).join("").trim()
    ].filter(Boolean);

    if (!(segment && typeof segment === "object" && "value" in segment)) return values;
    return values.map(value => Object.assign({}, segment, { value }));
  }

  function splitTextBySegments(text) {
    const segments = commentarySegments(text);
    if (segments.length <= 1) return splitSegmentByWords(segments[0]);

    const total = segments.reduce((sum, segment) => sum + wordCount(segment.value), 0);
    const target = Math.ceil(total / 2);
    let seen = 0;
    let splitAt = segments.length;

    for (let index = 0; index < segments.length; index++) {
      seen += wordCount(segments[index].value);
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

  async function fetchSefariaDaf(tractate, daf, amud = "a", options = {}) {
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

  function formatSefariaDaf(daf) {
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

  function continuationsForFormattedDaf(formatted, continuations = {}) {
    if (!(formatted && formatted.layout && formatted.layout.sideMode === "splitInner")) {
      return continuations || {};
    }
    const targetKey = formatted.layout.leftKey || "inner";
    const sourceKey = formatted.layout.continuationSourceKey || "inner";
    return { [targetKey]: continuations ? continuations[sourceKey] : "" };
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

  const INLINE_TOSAFOT_CLASS = "daf-inline-tosafot";
  const INLINE_TOSAFOT_WIDTH_PHRASE = "שהרי בכל יום היה אותו רשע מצוי";

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

  function isInlineTosafotWord(word) {
    return !!word.closest(`.${INLINE_TOSAFOT_CLASS}`);
  }

  function layoutWords(text) {
    return Array.from(text.querySelectorAll(".word"))
      .filter(word => !word.classList.contains(classes.continuationCatchword))
      .filter(word => !isInlineTosafotWord(word));
  }

  function balanceFinalLine(text) {
    removeBalanceBreaks(text);

    const words = layoutWords(text);
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

      const words = layoutWords(text).filter(word => word !== catchword);
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
    const containerHeight = Math.max(...["main", "inner", "outer", "innerAdditions", "outerAdditions"].map(key => {
      if (!(containers[key] && containers[key].el)) return 0;
      const rect = containers[key].el.getBoundingClientRect();
      return rect.bottom - rootRect.top;
    }));
    containers.el.style.height = `${Math.ceil(containerHeight)}px`;
  }

  function plainHebrew$1(text) {
    return String(text || "").replace(/[\u0591-\u05c7]/g, "").replace(/[^\u05d0-\u05ea]/g, "");
  }

  function phraseWords(phrase) {
    return String(phrase || "").split(/\s+/).map(plainHebrew$1).filter(Boolean);
  }

  function measurePhraseInMain(containers) {
    const target = phraseWords(INLINE_TOSAFOT_WIDTH_PHRASE);
    if (!target.length) return null;

    const words = layoutWords(containers.main.text);
    for (let index = 0; index <= words.length - target.length; index++) {
      const candidate = words.slice(index, index + target.length);
      if (!candidate.every((word, offset) => plainHebrew$1(word.textContent) === target[offset])) continue;

      const rects = candidate.map(word => word.getBoundingClientRect());
      return Math.max(...rects.map(rect => rect.right)) - Math.min(...rects.map(rect => rect.left));
    }

    return null;
  }

  function measurePhraseWithCanvas(containers) {
    if (!document.createElement("canvas").getContext) return null;
    const canvas = measurePhraseWithCanvas.canvas || (measurePhraseWithCanvas.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    if (!context) return null;

    const style = getComputedStyle(containers.main.text);
    context.font = style.font;
    return context.measureText(INLINE_TOSAFOT_WIDTH_PHRASE).width;
  }

  function updateInlineTosafotWidth(containers) {
    const blocks = containers.main.text.querySelectorAll(`.${INLINE_TOSAFOT_CLASS}`);
    if (!blocks.length) return;

    const mainRect = containers.main.text.getBoundingClientRect();
    const width = measurePhraseInMain(containers) || measurePhraseWithCanvas(containers) || mainRect.width * 0.62;
    const boundedWidth = Math.max(40, Math.min(width, mainRect.width - 8));
    blocks.forEach(block => {
      block.style.width = `${boundedWidth}px`;
    });
  }

  function finalizeLayout(containers) {
    updateInlineTosafotWidth(containers);
    balanceFinalLines(containers);
    positionContinuationCatchwords(containers);
    updateRootHeight(containers);
  }

  function wordRects(container) {
    return layoutWords(container.text).map(word => word.getBoundingClientRect());
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
    const outerAdditionsContainer = div(root);
    const innerAdditionsContainer = div(root);
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
      },
      outerAdditions: {
        el: outerAdditionsContainer,
        text: div(outerAdditionsContainer)
      },
      innerAdditions: {
        el: innerAdditionsContainer,
        text: div(innerAdditionsContainer)
      }
    };

    const textSpans = {
      main: span(containers.main.text),
      inner: span(containers.inner.text),
      outer: span(containers.outer.text),
      innerAdditions: span(containers.innerAdditions.text),
      outerAdditions: span(containers.outerAdditions.text)
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
        const continuationFor = (key) => {
          const keys = decorations.continuationKeys;
          if (Array.isArray(keys) && !keys.includes(key)) return "";
          return continuations[key];
        };
        const setText = () => {
          textSpans.main.innerHTML = withContinuationLead(renderedMain, continuationFor("main"));
          textSpans.inner.innerHTML = withContinuationLead(inner, continuationFor("inner"));
          textSpans.outer.innerHTML = withContinuationLead(outer, continuationFor("outer"));
          textSpans.innerAdditions.innerHTML = decorations.sideAdditions && decorations.sideAdditions.inner
            ? decorations.sideAdditions.inner
            : "";
          textSpans.outerAdditions.innerHTML = decorations.sideAdditions && decorations.sideAdditions.outer
            ? decorations.sideAdditions.outer
            : "";
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
        const continuations = continuationsForFormattedDaf(sefariaDaf, renderOptions.continuations || {});
        this.render(
          sefariaDaf.main,
          sefariaDaf.inner,
          sefariaDaf.outer,
          sefariaDaf.amud,
          renderOptions.linebreak,
          renderOptions.renderCallback,
          renderOptions.resizeCallback,
          continuations,
          Object.assign({}, renderOptions.decorations, {
            newBookStart,
            continuationKeys: sefariaDaf.layout && sefariaDaf.layout.continuationKeys,
            sideAdditions: sefariaDaf.layout && sefariaDaf.layout.sideAdditions
          })
        );
        return sefariaDaf;
      },
    }
  }

  dafRenderer.fetchSefariaDaf = fetchSefariaDaf;
  dafRenderer.formatSefariaDaf = formatSefariaDaf;
  dafRenderer.getSefariaDaf = getSefariaDaf;
  dafRenderer.continuationsForFormattedDaf = continuationsForFormattedDaf;

  return dafRenderer;

})));
