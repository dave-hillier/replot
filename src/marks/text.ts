import {createElement as h, type ReactNode} from "react";
import type {ChannelValue, ChannelValueIntervalSpec, ChannelValueSpec} from "../channel.js";
import {nonempty} from "../defined.js";
import {formatDefault} from "../format.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {withDatumIndex} from "../react/perDatum.js";
import type {Interval} from "../interval.js";
import type {Data, FrameAnchor, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {
  indexOf,
  identity,
  string,
  maybeNumberChannel,
  maybeTuple,
  // @ts-expect-error — runtime export not present in hand-written .d.ts
  numberChannel,
  // @ts-expect-error — runtime export not present in hand-written .d.ts
  isNumeric,
  isTemporal,
  keyword,
  maybeFrameAnchor,
  // @ts-expect-error — runtime export not present in hand-written .d.ts
  isTextual,
  isIterable
} from "../options.js";
import {
  // @ts-expect-error — runtime export not present in hand-written .d.ts
  applyAttr,
  impliedString,
  applyFrameAnchor
} from "../style.js";
import {maybeIntervalMidX, maybeIntervalMidY} from "../transforms/interval.js";

/** Options for styling text (independent of anchor position). */
export interface TextStyles {
  /**
   * The [text anchor][1] controls how text is aligned (typically horizontally)
   * relative to its anchor point; it is one of *start*, *end*, or *middle*. If
   * the frame anchor is *left*, *top-left*, or *bottom-left*, the default text
   * anchor is *start*; if the frame anchor is *right*, *top-right*, or
   * *bottom-right*, the default is *end*; otherwise it is *middle*.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor
   */
  textAnchor?: "start" | "middle" | "end";

  /**
   * The line height in ems; defaults to 1. The line height affects the
   * (typically vertical) separation between adjacent baselines of text, as well
   * as the separation between the text and its anchor point.
   */
  lineHeight?: number;

  /**
   * The line width in ems (e.g., 10 for about 20 characters); defaults to
   * infinity, disabling wrapping and clipping.
   *
   * If **textOverflow** is null, lines will be wrapped at the specified length.
   * If a line is split at a soft hyphen (\xad), a hyphen (-) will be displayed
   * at the end of the line. If **textOverflow** is not null, lines will be
   * clipped according to the given strategy.
   */
  lineWidth?: number;

  /**
   * How truncate (or wrap) lines of text longer than the given **lineWidth**;
   * one of:
   *
   * - null (default) - preserve overflowing characters (and wrap if needed)
   * - *clip* or *clip-end* - remove characters from the end
   * - *clip-start* - remove characters from the start
   * - *ellipsis* or *ellipsis-end* - replace characters from the end with an ellipsis (…)
   * - *ellipsis-start* - replace characters from the start with an ellipsis (…)
   * - *ellipsis-middle* - replace characters from the middle with an ellipsis (…)
   *
   * If no **title** was specified, if text requires truncation, a title
   * containing the non-truncated text will be implicitly added.
   */
  textOverflow?:
    | null
    | "clip"
    | "ellipsis"
    | "clip-start"
    | "clip-end"
    | "ellipsis-start"
    | "ellipsis-middle"
    | "ellipsis-end";

  /**
   * If true, changes the default **fontFamily** to *monospace*, and uses
   * simplified monospaced text metrics calculations.
   */
  monospace?: boolean;

  /**
   * The [font-family][1]; a constant; defaults to the plot’s font family, which
   * is typically [*system-ui*][2].
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/font-family
   * [2]: https://drafts.csswg.org/css-fonts-4/#valdef-font-family-system-ui
   */
  fontFamily?: string;

  /**
   * The [font size][1] in pixels; either a constant or a channel; defaults to
   * the plot’s font size, which is typically 10. When a number, it is
   * interpreted as a constant; otherwise it is interpreted as a channel.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/font-size
   */
  fontSize?: ChannelValue;

  /**
   * The [font style][1]; a constant; defaults to the plot’s font style, which
   * is typically *normal*.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/font-style
   */
  fontStyle?: string;

  /**
   * The [font variant][1]; a constant; if the **text** channel contains numbers
   * or dates, defaults to *tabular-nums* to facilitate comparing numbers;
   * otherwise defaults to the plot’s font style, which is typically *normal*.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant
   */
  fontVariant?: string;

  /**
   * The [font weight][1]; a constant; defaults to the plot’s font weight, which
   * is typically *normal*.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
   */
  fontWeight?: string | number;
}

/** Options for the text mark. */
export interface TextOptions extends MarkOptions, TextStyles {
  /**
   * The horizontal position channel specifying the text’s anchor point,
   * typically bound to the *x* scale.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position channel specifying the text’s anchor point, typically
   * bound to the *y* scale.
   */
  y?: ChannelValueSpec;

  /**
   * The text contents channel, possibly with line breaks (\n, \r\n, or \r). If
   * not specified, defaults to the zero-based index [0, 1, 2, …].
   */
  text?: ChannelValue;

  /**
   * The frame anchor specifies defaults for **x** and **y**, along with
   * **textAnchor** and **lineAnchor**, based on the plot’s frame; it may be one
   * of the four sides (*top*, *right*, *bottom*, *left*), one of the four
   * corners (*top-left*, *top-right*, *bottom-right*, *bottom-left*), or the
   * *middle* of the frame.
   */
  frameAnchor?: FrameAnchor;

  /**
   * The line anchor controls how text is aligned (typically vertically)
   * relative to its anchor point; it is one of *top*, *bottom*, or *middle*. If
   * the frame anchor is *top*, *top-left*, or *top-right*, the default line
   * anchor is *top*; if the frame anchor is *bottom*, *bottom-right*, or
   * *bottom-left*, the default is *bottom*; otherwise it is *middle*.
   */
  lineAnchor?: "top" | "middle" | "bottom";

  /**
   * The rotation angle in degrees clockwise; a constant or a channel; defaults
   * to 0°. When a number, it is interpreted as a constant; otherwise it is
   * interpreted as a channel.
   */
  rotate?: ChannelValue;
}

/** Options for the textX mark. */
export interface TextXOptions extends Omit<TextOptions, "y"> {
  /**
   * The vertical position of the text’s anchor point, typically bound to the
   * *y* scale.
   */
  y?: ChannelValueIntervalSpec;

  /**
   * An interval (such as *day* or a number), to transform **y** values to the
   * middle of the interval.
   */
  interval?: Interval;
}

/** Options for the textY mark. */
export interface TextYOptions extends Omit<TextOptions, "x"> {
  /**
   * The horizontal position of the text’s anchor point, typically bound to the
   * *x* scale.
   */
  x?: ChannelValueIntervalSpec;

  /**
   * An interval (such as *day* or a number), to transform **x** values to the
   * middle of the interval.
   */
  interval?: Interval;
}

const defaults = {
  ariaLabel: "text",
  strokeLinejoin: "round",
  strokeWidth: 3,
  paintOrder: "stroke"
};

const softHyphen = "­";

/** The text mark. */
export class Text extends Mark {
  rotate: any;
  textAnchor: any;
  lineAnchor: any;
  lineHeight: any;
  lineWidth: any;
  textOverflow: any;
  monospace: any;
  fontFamily: any;
  fontSize: any;
  fontStyle: any;
  fontVariant: any;
  fontWeight: any;
  frameAnchor: any;
  splitLines: any;
  clipLine: any;
  constructor(data?: Data, options: TextOptions = {}) {
    const {
      x,
      y,
      text = isIterable(data) && isTextual(data) ? identity : indexOf,
      frameAnchor,
      textAnchor = /right$/i.test(frameAnchor as any) ? "end" : /left$/i.test(frameAnchor as any) ? "start" : "middle",
      lineAnchor = /^top/i.test(frameAnchor as any) ? "top" : /^bottom/i.test(frameAnchor as any) ? "bottom" : "middle",
      lineHeight = 1,
      lineWidth = Infinity,
      textOverflow,
      monospace,
      fontFamily = monospace ? "ui-monospace, monospace" : undefined,
      fontSize,
      fontStyle,
      fontVariant,
      fontWeight,
      rotate
    } = options;
    const [vrotate, crotate] = maybeNumberChannel(rotate, 0);
    const [vfontSize, cfontSize] = maybeFontSizeChannel(fontSize);
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        fontSize: {value: vfontSize, optional: true},
        rotate: {value: numberChannel(vrotate), optional: true},
        text: {value: text, filter: nonempty, optional: true}
      },
      options,
      defaults
    );
    this.rotate = crotate;
    this.textAnchor = impliedString(textAnchor, "middle");
    this.lineAnchor = keyword(lineAnchor, "lineAnchor", ["top", "middle", "bottom"]);
    this.lineHeight = +lineHeight;
    this.lineWidth = +lineWidth;
    this.textOverflow = maybeTextOverflow(textOverflow);
    this.monospace = !!monospace;
    this.fontFamily = string(fontFamily);
    this.fontSize = cfontSize;
    this.fontStyle = string(fontStyle);
    this.fontVariant = string(fontVariant);
    this.fontWeight = string(fontWeight);
    this.frameAnchor = maybeFrameAnchor(frameAnchor);
    if (!(this.lineWidth >= 0)) throw new Error(`invalid lineWidth: ${lineWidth}`);
    this.splitLines = splitter(this);
    this.clipLine = clipper(this);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, rotate: R, text: T, title: TL, fontSize: FS} = channels;
    const {rotate, lineAnchor, lineHeight, textOverflow, splitLines, clipLine} = this;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const indirect = indirectStyleProps(this);
    const indirectText = {
      textAnchor: this.textAnchor,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontStyle: this.fontStyle,
      fontVariant: this.fontVariant === undefined ? inferFontVariant(T) : this.fontVariant,
      fontWeight: this.fontWeight
    };
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const direct = directStyleProps(this);
    const texts = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const tx = X ? X[i] : cx;
      const ty = Y ? Y[i] : cy;
      const r = R ? R[i] : rotate;
      // The rotate clause keys off the presence of the rotate channel rather
      // than on its value (text.js:110-114 upstream): a zero angle is written,
      // not skipped.
      const transformAttr = `translate(${tx},${ty})${R || r ? ` rotate(${r})` : ""}`;
      const fontSizeAttr = FS ? FS[i] : undefined;
      const raw = T ? formatDefault(T[i]) ?? "" : "";
      const lines: string[] = T ? splitLines(raw).map(clipLine) : [];
      const n = lines.length;
      const yOffset = lineAnchor === "top" ? 0.71 : lineAnchor === "bottom" ? 1 - n : (164 - n * 100) / 200;
      const children: ReactNode[] = [];
      const textProps: Record<string, any> = {
        key: k,
        ...direct,
        ...channel,
        transform: transformAttr
      };
      if (fontSizeAttr != null) textProps.fontSize = fontSizeAttr;
      if (T) {
        if (n > 1) {
          let m = 0;
          for (let li = 0; li < n; ++li) {
            ++m;
            if (!lines[li]) continue;
            const tspanProps: Record<string, any> = {key: li, x: 0};
            if (li === m - 1) tspanProps.y = `${(yOffset + li) * lineHeight}em`;
            else tspanProps.dy = `${m * lineHeight}em`;
            children.push(h("tspan", tspanProps, lines[li]));
            m = 0;
          }
        } else {
          if (yOffset) textProps.y = `${yOffset * lineHeight}em`;
          if (lines[0] != null) children.push(lines[0]);
        }
        if (textOverflow && !TL && lines[0] !== T[i]) {
          children.push(h("title", {key: "overflow-title"}, T[i]));
        }
      }
      const titled = withTitleChild(this, channels, i, null);
      if (titled) children.push(titled);
      const textEl = h("text", textProps, ...children);
      return withDatumIndex(withHrefWrap(channels, this.target, i, textEl), i);
    });
    return h("g", {...indirect, ...indirectText, ...transform}, texts);
  }
}

export function maybeTextOverflow(textOverflow: any) {
  return textOverflow == null
    ? null
    : keyword(textOverflow, "textOverflow", [
        "clip", // shorthand for clip-end
        "ellipsis", // … ellipsis-end
        "clip-start",
        "clip-end",
        "ellipsis-start",
        "ellipsis-middle",
        "ellipsis-end"
      ]).replace(/^(clip|ellipsis)$/, "$1-end");
}

/**
 * Returns a new text mark for the given *data* and *options*. The **text**
 * channel specifies the textual contents of the mark, which may be preformatted
 * with line breaks (\n, \r\n, or \r), or wrapped or clipped using the
 * **lineWidth** and **textOverflow** options.
 *
 * If **text** contains numbers or dates, a default formatter will be applied,
 * and the **fontVariant** will default to *tabular-nums* instead of *normal*.
 * For more control, consider [*number*.toLocaleString][1],
 * [*date*.toLocaleString][2], [d3-format][3], or [d3-time-format][4]. If
 * **text** is not specified, it defaults to the identity function for primitive
 * data (such as numbers, dates, and strings), and to the zero-based index [0,
 * 1, 2, …] for objects (so that something identifying is visible by default).
 *
 * If either **x** or **y** is not specified, the default is determined by the
 * **frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
 * specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
 * *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
 * [*y₀*, *y₁*, *y₂*, …].
 *
 * [1]: https://observablehq.com/@mbostock/number-formatting
 * [2]: https://observablehq.com/@mbostock/date-formatting
 * [3]: https://d3js.org/d3-format
 * [4]: https://d3js.org/d3-time-format
 */
export function text(data?: Data, {x, y, ...options}: TextOptions = {}): Text {
  if (options.frameAnchor === undefined) [x, y] = maybeTuple(x, y) as any;
  return new Text(data, {...options, x, y});
}

/**
 * Like text, but **x** defaults to the identity function, assuming that *data*
 * = [*x₀*, *x₁*, *x₂*, …]. For example to display tick label-like marks at the
 * top of the frame:
 *
 * ```js
 * Plot.textX([10, 15, 20, 25, 30], {frameAnchor: "top"})
 * ```
 *
 * If an **interval** is specified, such as *day*, **y** is transformed to the
 * middle of the interval.
 */
export function textX(data?: Data, {x = identity, ...options}: TextXOptions = {}): Text {
  return new Text(data, maybeIntervalMidY({...options, x}));
}

/**
 * Like text, but **y** defaults to the identity function, assuming that *data*
 * = [*y₀*, *y₁*, *y₂*, …]. For example to display tick label-like marks on the
 * right of the frame:
 *
 * ```js
 * Plot.textY([10, 15, 20, 25, 30], {frameAnchor: "right"})
 * ```
 *
 * If an **interval** is specified, such as *day*, **x** is transformed to the
 * middle of the interval.
 */
export function textY(data?: Data, {y = identity, ...options}: TextYOptions = {}): Text {
  return new Text(data, maybeIntervalMidX({...options, y}));
}

export function applyIndirectTextStyles(selection: any, mark: any, T: any) {
  applyAttr(selection, "text-anchor", mark.textAnchor);
  applyAttr(selection, "font-family", mark.fontFamily);
  applyAttr(selection, "font-size", mark.fontSize);
  applyAttr(selection, "font-style", mark.fontStyle);
  applyAttr(selection, "font-variant", mark.fontVariant === undefined ? inferFontVariant(T) : mark.fontVariant);
  applyAttr(selection, "font-weight", mark.fontWeight);
}

function inferFontVariant(T: any) {
  return T && (isNumeric(T) || isTemporal(T)) ? "tabular-nums" : undefined;
}

// https://developer.mozilla.org/en-US/docs/Web/CSS/font-size
const fontSizes = new Set([
  // global keywords
  "inherit",
  "initial",
  "revert",
  "unset",
  // absolute keywords
  "xx-small",
  "x-small",
  "small",
  "medium",
  "large",
  "x-large",
  "xx-large",
  "xxx-large",
  // relative keywords
  "larger",
  "smaller"
]);

// The font size may be expressed as a constant in the following forms:
// - number in pixels
// - string keyword: see above
// - string <length>: e.g., "12px"
// - string <percentage>: e.g., "80%"
// Anything else is assumed to be a channel definition.
function maybeFontSizeChannel(fontSize: any) {
  if (fontSize == null || typeof fontSize === "number") return [undefined, fontSize];
  if (typeof fontSize !== "string") return [fontSize, undefined];
  fontSize = fontSize.trim().toLowerCase();
  return fontSizes.has(fontSize) || /^[+-]?\d*\.?\d+(e[+-]?\d+)?(\w*|%)$/.test(fontSize)
    ? [undefined, fontSize]
    : [fontSize, undefined];
}

// This is a greedy algorithm for line wrapping. It would be better to use the
// Knuth–Plass line breaking algorithm (but that would be much more complex).
// https://en.wikipedia.org/wiki/Line_wrap_and_word_wrap
function lineWrap(input: any, maxWidth: any, widthof: any) {
  const lines = [];
  let lineStart: any,
    lineEnd = 0;
  for (const [wordStart, wordEnd, required] of lineBreaks(input)) {
    // Record the start of a line. This isn’t the same as the previous line’s
    // end because we often skip spaces between lines.
    if (lineStart === undefined) lineStart = wordStart;

    // If the current line is not empty, and if adding the current word would
    // make the line longer than the allowed width, then break the line at the
    // previous word end.
    if (lineEnd > lineStart && widthof(input, lineStart, wordEnd) > maxWidth) {
      lines.push(input.slice(lineStart, lineEnd) + (input[lineEnd - 1] === softHyphen ? "-" : ""));
      lineStart = wordStart;
    }

    // If this is a required break (a newline), emit the line and reset.
    if (required) {
      lines.push(input.slice(lineStart, wordEnd));
      lineStart = undefined;
      continue;
    }

    // Extend the current line to include the new word.
    lineEnd = wordEnd;
  }
  return lines;
}

// This is a rudimentary (and U.S.-centric) algorithm for finding opportunities
// to break lines between words. A better and far more comprehensive approach
// would be to use the official Unicode Line Breaking Algorithm.
// https://unicode.org/reports/tr14/
function* lineBreaks(input: any): Generator<[number, number, boolean]> {
  let i = 0,
    j = 0;
  const n = input.length;
  while (j < n) {
    let k = 1;
    switch (input[j]) {
      case softHyphen:
      case "-": // hyphen
        ++j;
        yield [i, j, false];
        i = j;
        break;
      case " ":
        yield [i, j, false];
        while (input[++j] === " "); // skip multiple spaces
        i = j;
        break;
      case "\r":
        if (input[j + 1] === "\n") ++k; // falls through
      case "\n":
        yield [i, j, true];
        j += k;
        i = j;
        break;
      default:
        ++j;
        break;
    }
  }
  yield [i, j, true];
}

// Computed as round(measureText(text).width * 10) at 10px system-ui. For
// characters that are not represented in this map, we’d ideally want to use a
// weighted average of what we expect to see. But since we don’t really know
// what that is, using “e” seems reasonable.
const defaultWidthMap: Record<string, number> = {
  a: 56,
  b: 63,
  c: 57,
  d: 63,
  e: 58,
  f: 37,
  g: 62,
  h: 60,
  i: 26,
  j: 26,
  k: 55,
  l: 26,
  m: 88,
  n: 60,
  o: 60,
  p: 62,
  q: 62,
  r: 39,
  s: 54,
  t: 38,
  u: 60,
  v: 55,
  w: 79,
  x: 54,
  y: 55,
  z: 55,
  A: 69,
  B: 67,
  C: 73,
  D: 74,
  E: 61,
  F: 58,
  G: 76,
  H: 75,
  I: 28,
  J: 55,
  K: 67,
  L: 58,
  M: 89,
  N: 75,
  O: 78,
  P: 65,
  Q: 78,
  R: 67,
  S: 65,
  T: 65,
  U: 75,
  V: 69,
  W: 98,
  X: 69,
  Y: 67,
  Z: 67,
  0: 64,
  1: 48,
  2: 62,
  3: 64,
  4: 66,
  5: 63,
  6: 65,
  7: 58,
  8: 65,
  9: 65,
  " ": 29,
  "!": 32,
  '"': 49,
  "'": 31,
  "(": 39,
  ")": 39,
  ",": 31,
  "-": 48,
  ".": 31,
  "/": 32,
  ":": 31,
  ";": 31,
  "?": 52,
  "‘": 31,
  "’": 31,
  "“": 47,
  "”": 47,
  "…": 82
};

// This is a rudimentary (and U.S.-centric) algorithm for measuring the width of
// a string based on a technique of Gregor Aisch; it assumes that individual
// characters are laid out independently and does not implement the Unicode
// grapheme cluster breaking algorithm. It does understand code points, though,
// and so treats things like emoji as having the width of a lowercase e (and
// should be equivalent to using for-of to iterate over code points, while also
// being fast). TODO Optimize this by noting that we often re-measure characters
// that were previously measured?
// http://www.unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries
// https://exploringjs.com/impatient-js/ch_strings.html#atoms-of-text
export function defaultWidth(text: string, start = 0, end = text.length) {
  let sum = 0;
  for (let i = start; i < end; i = readCharacter(text, i)) {
    sum += defaultWidthMap[text[i]] ?? (isPictographic(text, i) ? 120 : defaultWidthMap.e);
  }
  return sum;
}

// Even for monospaced text, we can’t assume that the number of UTF-16 code
// points (i.e., the length of a string) corresponds to the number of visible
// characters; we still have to count graphemes. And note that pictographic
// characters such as emojis are typically not monospaced!
export function monospaceWidth(text: string, start = 0, end = text.length) {
  let sum = 0;
  for (let i = start; i < end; i = readCharacter(text, i)) {
    sum += isPictographic(text, i) ? 126 : 63;
  }
  return sum;
}

export function splitter({monospace, lineWidth, textOverflow}: any) {
  if (textOverflow != null || lineWidth == Infinity) return (text: string) => text.split(/\r\n?|\n/g);
  const widthof = monospace ? monospaceWidth : defaultWidth;
  const maxWidth = lineWidth * 100;
  return (text: string) => lineWrap(text, maxWidth, widthof);
}

export function clipper({monospace, lineWidth, textOverflow}: any) {
  if (textOverflow == null || lineWidth == Infinity) return (text: string) => text;
  const widthof = monospace ? monospaceWidth : defaultWidth;
  const maxWidth = lineWidth * 100;
  switch (textOverflow) {
    case "clip-start":
      return (text: string) => clipStart(text, maxWidth, widthof, "");
    case "clip-end":
      return (text: string) => clipEnd(text, maxWidth, widthof, "");
    case "ellipsis-start":
      return (text: string) => clipStart(text, maxWidth, widthof, ellipsis);
    case "ellipsis-middle":
      return (text: string) => clipMiddle(text, maxWidth, widthof, ellipsis);
    case "ellipsis-end":
      return (text: string) => clipEnd(text, maxWidth, widthof, ellipsis);
  }
}

export const ellipsis = "…";

// Cuts the given text to the given width, using the specified widthof function;
// the returned [index, error] guarantees text.slice(0, index) fits within the
// specified width with the given error. If the text fits naturally within the
// given width, returns [-1, 0]. If the text needs cutting, the given inset
// specifies how much space (in the same units as width and widthof) to reserve
// for a possible ellipsis character.
export function cut(text: string, width: number, widthof: any, inset: number) {
  const I = []; // indexes of read character boundaries
  let w = 0; // current line width
  for (let i = 0, j = 0, n = text.length; i < n; i = j) {
    j = readCharacter(text, i); // read the next character
    const l = widthof(text, i, j); // current character width
    if (w + l > width) {
      w += inset;
      while (w > width && i > 0) (j = i), (i = I.pop() as any), (w -= widthof(text, i, j)); // remove excess
      return [i, width - w];
    }
    w += l;
    I.push(i);
  }
  return [-1, 0];
}

export function clipEnd(text: string, width: number, widthof: any, ellipsis: string) {
  text = text.trim(); // ignore leading and trailing whitespace
  const e = widthof(ellipsis);
  const [i] = cut(text, width, widthof, e);
  return i < 0 ? text : text.slice(0, i).trimEnd() + ellipsis;
}

export function clipMiddle(text: string, width: number, widthof: any, ellipsis: string) {
  text = text.trim(); // ignore leading and trailing whitespace
  const w = widthof(text);
  if (w <= width) return text;
  const e = widthof(ellipsis) / 2;
  const [i, ei] = cut(text, width / 2, widthof, e);
  const [j] = cut(text, w - width / 2 - ei + e, widthof, -e); // TODO read spaces?
  return j < 0 ? ellipsis : text.slice(0, i).trimEnd() + ellipsis + text.slice(readCharacter(text, j)).trimStart();
}

export function clipStart(text: string, width: number, widthof: any, ellipsis: string) {
  text = text.trim(); // ignore leading and trailing whitespace
  const w = widthof(text);
  if (w <= width) return text;
  const e = widthof(ellipsis);
  const [j] = cut(text, w - width + e, widthof, -e); // TODO read spaces?
  return j < 0 ? ellipsis : ellipsis + text.slice(readCharacter(text, j)).trimStart();
}

const reCombiner = /[\p{Combining_Mark}\p{Emoji_Modifier}]+/uy;
const rePictographic = /\p{Extended_Pictographic}/uy;

// Reads a single “character” element from the given text starting at the given
// index, returning the index after the read character. Ideally, this implements
// the Unicode text segmentation algorithm and understands grapheme cluster
// boundaries, etc., but in practice this is only smart enough to detect UTF-16
// surrogate pairs, combining marks, and zero-width joiner (zwj) sequences such
// as emoji skin color modifiers. https://unicode.org/reports/tr29/
export function readCharacter(text: string, i: number): number {
  i += isSurrogatePair(text, i) ? 2 : 1;
  if (isCombiner(text, i)) i = reCombiner.lastIndex;
  if (isZeroWidthJoiner(text, i)) return readCharacter(text, i + 1);
  return i;
}

// We avoid more expensive regex tests involving Unicode property classes by
// first checking for the common case of 7-bit ASCII characters.
function isAscii(text: string, i: number) {
  return text.charCodeAt(i) < 0x80;
}

function isSurrogatePair(text: string, i: number) {
  const hi = text.charCodeAt(i);
  if (hi >= 0xd800 && hi < 0xdc00) {
    const lo = text.charCodeAt(i + 1);
    return lo >= 0xdc00 && lo < 0xe000;
  }
  return false;
}

function isZeroWidthJoiner(text: string, i: number) {
  return text.charCodeAt(i) === 0x200d;
}

function isCombiner(text: string, i: number) {
  return isAscii(text, i) ? false : ((reCombiner.lastIndex = i), reCombiner.test(text));
}

function isPictographic(text: string, i: number) {
  return isAscii(text, i) ? false : ((rePictographic.lastIndex = i), rePictographic.test(text));
}
