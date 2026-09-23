import {format as numberFormat, utcFormat} from "d3";
import {createElement as h, type ReactElement, type ReactNode} from "react";
import type {ChannelName, ChannelValueSpec} from "../channel.js";
// @ts-expect-error -- getSource is declared only in channel.js, not channel.d.ts
import {getSource} from "../channel.js";
import {defined} from "../defined.js";
import {formatDefault} from "../format.js";
// @ts-expect-error -- anchorX/anchorY are declared only in pointer.js, not pointer.d.ts
import {anchorX, anchorY} from "../interactions/pointer.js";
import type {Data, FrameAnchor, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
// @ts-expect-error -- these helpers are declared only in options.js, not options.d.ts
import {maybeAnchor, maybeFrameAnchor, maybeTuple, number, string} from "../options.js";
import {applyFrameAnchor, impliedString} from "../style.js";
// @ts-expect-error -- these helpers are declared only in options.js, not options.d.ts
import {identity, isIterable, isTemporal, isTextual} from "../options.js";
import {inferTickFormat} from "./axis.js";
import {defaultWidth, ellipsis, monospaceWidth} from "./text.js";
import type {TextStyles} from "./text.js";
import {cut, clipper, splitter, maybeTextOverflow} from "./text.js";
import {directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {TipItem} from "../react/interactions/TipItem.js";
import type {TipItemSize} from "../react/interactions/TipItem.js";

/**
 * How to format channel values; one of:
 *
 * - a [d3-format][1] string for numeric scales
 * - a [d3-time-format][2] string for temporal scales
 * - a function passed a channel *value* and *index*, returning a string
 *
 * [1]: https://d3js.org/d3-time
 * [2]: https://d3js.org/d3-time-format
 */
export type TipFormat = string | ((d: any, i: number) => string);

/** Options for the tip mark. */
export interface TipOptions extends MarkOptions, TextStyles {
  /**
   * The horizontal position channel specifying the tip’s anchor, typically
   * bound to the *x* scale.
   */
  x?: ChannelValueSpec;

  /**
   * The starting horizontal position channel specifying the tip’s anchor,
   * typically bound to the *x* scale.
   */
  x1?: ChannelValueSpec;

  /**
   * The ending horizontal position channel specifying the tip’s anchor,
   * typically bound to the *x* scale.
   */
  x2?: ChannelValueSpec;

  /**
   * The vertical position channel specifying the tip’s anchor, typically
   * bound to the *y* scale.
   */
  y?: ChannelValueSpec;

  /**
   * The starting vertical position channel specifying the tip’s anchor,
   * typically bound to the *y* scale.
   */
  y1?: ChannelValueSpec;

  /**
   * The ending vertical position channel specifying the tip’s anchor, typically
   * bound to the *y* scale.
   */
  y2?: ChannelValueSpec;

  /**
   * The frame anchor specifies defaults for **x** and **y** based on the plot’s
   * frame; it may be one of the four sides (*top*, *right*, *bottom*, *left*),
   * one of the four corners (*top-left*, *top-right*, *bottom-right*,
   * *bottom-left*), or the *middle* of the frame. For example, for tips
   * distributed horizontally at the top of the frame:
   *
   * ```js
   * Plot.tip(data, {x: "date", frameAnchor: "top"})
   * ```
   */
  frameAnchor?: FrameAnchor;

  /**
   * The tip anchor specifies how to orient the tip box relative to its anchor
   * position; it refers to the part of the tip box that is attached to the
   * anchor point. For example, the *top-left* anchor places the top-left corner
   * of tip box near the anchor position, hence placing the tip box below and to
   * the right of the anchor position.
   */
  anchor?: FrameAnchor;

  /**
   * If an explicit tip anchor is not specified, an anchor is chosen
   * automatically such that the tip fits within the plot’s frame; if the
   * preferred anchor fits, it is chosen.
   */
  preferredAnchor?: FrameAnchor | null;

  /**
   * How channel values are formatted for display. If a format is a string, it
   * is interpreted as a (UTC) time format for temporal channels, and otherwise
   * a number format.
   */
  format?: {[name in ChannelName]?: null | boolean | TipFormat} | TipFormat;

  /** The image filter for the tip’s box; defaults to a drop shadow. */
  pathFilter?: string;

  /** The size of the tip’s pointer in pixels; defaults to 12. */
  pointerSize?: number;

  /** The padding around the text in pixels; defaults to 8. */
  textPadding?: number;
}

const defaults = {
  ariaLabel: "tip",
  fill: "var(--plot-background)",
  stroke: "currentColor",
  // upstream tip.js:15-20. Pooling is a tip default, not an opt-in: when a tip
  // is the FIRST pointer mark rendered in a plot it drags every other pointer
  // mark of that plot into one pool, so a boxX (four marks, four tips) or two
  // tipped dot marks show exactly one tip — the nearest — rather than one each.
  pool: true
};

// These channels are not displayed in the default tip; see formatChannels.
// `contours` is the contour mark's own channel set (upstream bcff1480).
const ignoreChannels = new Set(["geometry", "href", "src", "ariaLabel", "scales", "contours"]);

/** The tip mark. */
export class Tip extends (Mark as {new (...args: any[]): Mark}) {
  // Set by plot.ts's inferTips on a tip it derives from a mark's `tip` option,
  // naming that mark. Only the React path reads it, to key the tip's slot.
  tipFor: any;
  anchor: any;
  preferredAnchor: any;
  frameAnchor: any;
  textAnchor: any;
  textPadding: number;
  pointerSize: number;
  pathFilter: any;
  lineHeight: number;
  lineWidth: number;
  textOverflow: any;
  monospace: boolean;
  fontFamily: any;
  fontSize: any;
  fontStyle: any;
  fontVariant: any;
  fontWeight: any;
  splitLines: any;
  clipLine: any;
  format: any;

  constructor(data?: Data, options: TipOptions = {}) {
    if (options.tip) options = {...options, tip: false};
    if (options.title === undefined && isIterable(data) && isTextual(data)) options = {...options, title: identity};
    const {
      x,
      y,
      x1,
      x2,
      y1,
      y2,
      anchor,
      preferredAnchor = "bottom",
      monospace,
      fontFamily = monospace ? "ui-monospace, monospace" : undefined,
      fontSize,
      fontStyle,
      fontVariant,
      fontWeight,
      lineHeight = 1,
      lineWidth = 20,
      frameAnchor,
      format,
      textAnchor = "start",
      textOverflow,
      textPadding = 8,
      title,
      pointerSize = 12,
      pathFilter = "drop-shadow(0 3px 4px rgba(0,0,0,0.2))"
    } = options;
    super(
      data,
      {
        x: {value: x1 != null && x2 != null ? null : x, scale: "x", optional: true}, // ignore midpoint
        y: {value: y1 != null && y2 != null ? null : y, scale: "y", optional: true}, // ignore midpoint
        x1: {value: x1, scale: "x", optional: x2 == null},
        y1: {value: y1, scale: "y", optional: y2 == null},
        x2: {value: x2, scale: "x", optional: x1 == null},
        y2: {value: y2, scale: "y", optional: y1 == null},
        title: {value: title, optional: true} // filter: defined
      },
      options,
      defaults
    );
    this.anchor = maybeAnchor(anchor, "anchor");
    this.preferredAnchor = maybeAnchor(preferredAnchor, "preferredAnchor");
    this.frameAnchor = maybeFrameAnchor(frameAnchor);
    this.textAnchor = impliedString(textAnchor, "middle");
    this.textPadding = +textPadding;
    this.pointerSize = +pointerSize;
    this.pathFilter = string(pathFilter);
    this.lineHeight = +lineHeight;
    this.lineWidth = +lineWidth;
    this.textOverflow = maybeTextOverflow(textOverflow);
    this.monospace = !!monospace;
    this.fontFamily = string(fontFamily);
    this.fontSize = number(fontSize);
    this.fontStyle = string(fontStyle);
    this.fontVariant = string(fontVariant);
    this.fontWeight = string(fontWeight);
    for (const key in defaults) if (key in (this as any).channels) (this as any)[key] = (defaults as any)[key]; // apply default even if channel
    this.splitLines = splitter(this);
    this.clipLine = clipper(this);
    this.format = typeof format === "string" || typeof format === "function" ? {title: format} : {...format}; // defensive copy before mutate; also promote nullish to empty
  }
  renderJSX(this: any, index: any, scales: any, values: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const mark = this;
    const {x, y, fx, fy} = scales;
    const {anchor, monospace, lineHeight, lineWidth} = this;
    const {textPadding: r, pointerSize: m, pathFilter} = this;
    const {marginTop, marginLeft} = dimensions;

    const {x1: X1, y1: Y1, x2: X2, y2: Y2, x: X = X1 ?? X2, y: Y = Y1 ?? Y2} = values;

    // The facet's offset within the frame. A faceted tip renders inside its
    // cell's coordinates, but postrender's fit compares against the frame
    // (upstream tip.js:105-106).
    const ox = fx ? fx(index.fx) - marginLeft : 0;
    const oy = fy ? fy(index.fy) - marginTop : 0;

    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const px = anchorX(values, cx);
    const py = anchorY(values, cy);

    const widthof = monospace ? monospaceWidth : defaultWidth;
    const ee = widthof(ellipsis);

    let sources: any, format: any;
    if ("title" in values) {
      sources = getSourceChannels.call(this, {title: values.channels.title}, scales);
      format = formatTitle;
    } else {
      sources = getSourceChannels.call(this, values.channels, scales);
      format = formatChannels;
    }

    const indirect = indirectStyleProps(this);
    const indirectText: Record<string, any> = {
      textAnchor: this.textAnchor,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontStyle: this.fontStyle,
      fontVariant: this.fontVariant,
      fontWeight: this.fontWeight
    };
    for (const k of Object.keys(indirectText)) if (indirectText[k] == null) delete indirectText[k];
    const direct = directStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});

    // Mirrors renderLine in render(): truncates to lineWidth and produces
    // <tspan> children for one line. Returns an estimated width since we
    // cannot getBBox in the JSX path.
    function buildLine(spec: any): {tspans: ReactNode[]; width: number} {
      let {label, value} = spec;
      const {color, opacity} = spec;
      label = label ?? "";
      value = value ?? "";
      const swatch = color != null || opacity != null;
      let title: string | undefined;
      const w = lineWidth * 100;
      const [j] = cut(label, w, widthof, ee);
      if (j >= 0) {
        label = label.slice(0, j).trimEnd() + ellipsis;
        title = value.trim();
        value = "";
      } else {
        if (label || (!value && !swatch)) value = " " + value;
        const [k] = cut(value, w - widthof(label), widthof, ee);
        if (k >= 0) {
          title = value.trim();
          value = value.slice(0, k).trimEnd() + ellipsis;
        }
      }
      const children: ReactNode[] = ["​"]; // zwsp for double-click
      let width = widthof("​");
      if (label) {
        children.push(h("tspan", {key: "label", fontWeight: "bold"}, label));
        width += widthof(label);
      }
      if (value) {
        children.push(value);
        width += widthof(value);
      }
      if (swatch) {
        children.push(
          h("tspan", {key: "swatch", fill: color, fillOpacity: opacity, style: {userSelect: "none"}}, " ■")
        );
        width += widthof(" ■");
      }
      if (title) children.push(h("title", {key: "title"}, title));
      return {tspans: children, width};
    }

    // Format every datum's text first and drop the nulls afterwards (upstream
    // tip.js:132-134): a format that returns null for one datum skips that
    // datum's tip rather than crashing the whole render. T is keyed by datum
    // index, not by position, because a faceted index is not dense.
    const T: any[] = new Array(index.length);
    for (const i of index as number[]) T[i] = format.call(mark, i, index, sources, scales, values);
    const shown: number[] = (index as number[]).filter((i) => T[i] != null);

    // The frame the box is fitted into: a faceted tip is fitted to its cell
    // (upstream tip.js:213).
    const fitDimensions = dimensions.facet ?? dimensions;

    const items = shown.map((i) => {
      // Render this datum's lines, dropping repeated labels.
      let lines: {tspans: ReactNode[]; width: number}[];
      if (typeof T[i] === "string") {
        lines = mark.splitLines(T[i]).map((line: string) => buildLine({value: mark.clipLine(line)}));
      } else {
        lines = [];
        const labels = new Set();
        for (const line of T[i]) {
          const {label = ""} = line;
          if (label && labels.has(label)) continue;
          else labels.add(label);
          lines.push(buildLine(line));
        }
      }
      const n = lines.length;

      // The size to use until a layout engine can measure the text: the widest
      // line at the font size, and n lines at lineHeight em. widthof counts
      // ~100 units per em, so the estimate is in getBBox's units.
      const fontSize = +this.fontSize || 10;
      const estimated: TipItemSize = {
        x: 0,
        width: Math.round(Math.max(0, ...lines.map((l) => (l.width / 100) * fontSize))),
        height: Math.round(n * lineHeight * fontSize)
      };

      // The anchor position within the frame, for the fit below: a faceted tip
      // draws inside its cell's coordinates (upstream postrender, tip.js:224).
      const fx0 = px(i) + ox;
      const fy0 = py(i) + oy;

      // The item is rendered twice: once from the estimate (which is all the
      // server, jsdom and a static snapshot ever see) and again from the
      // measured size, which TipItem supplies in a layout effect and which
      // re-runs upstream's fit.
      const render = (measured: TipItemSize | null): ReactElement => {
        const {width, height} = measured ?? estimated;
        // An explicit anchor always wins. Otherwise the measured box is
        // oriented to fit the frame (upstream tip.js:222-243); the estimate is
        // not, because a guess about the size cannot justify moving the box,
        // and a box that moves as the guess changes would jitter.
        const a =
          anchor ??
          (measured
            ? fitAnchor(fx0, fy0, width, height, m, r, fitDimensions, mark.preferredAnchor)
            : mark.preferredAnchor ?? "bottom");
        const d = getPath(a, m, r, width, height);
        const [tx, ty] = getTextTranslate(a, m, r, width, height);
        const yOffset = +getLineOffset(a, n, lineHeight).toFixed(6);
        // After measuring, each line is shifted so the box's text starts at
        // its own origin whatever the text anchor is (upstream postrender
        // writes -x onto every line, tip.js:238).
        const lineX = measured?.x ? -measured.x : 0;
        const tspans: ReactNode[] = [];
        for (let li = 0; li < n; li++) {
          tspans.push(h("tspan", {key: li, x: lineX, dy: `${lineHeight}em`}, ...lines[li].tspans));
        }
        const pathEl = h("path", {filter: pathFilter, d});
        const textEl = h(
          "text",
          {
            fill: "currentColor",
            fillOpacity: 1,
            stroke: "none",
            y: `${yOffset}em`,
            transform: `translate(${tx},${ty})`
          },
          ...tspans
        );
        // Note: no channel styles here. The tip's channels choose the content
        // of the box, not its appearance (upstream tip.js:136-137), so a
        // per-datum fill must not leak onto the box.
        return h("g", {transform: `translate(${Math.round(px(i))},${Math.round(py(i))})`, ...direct}, pathEl, textEl);
      };

      return h(TipItem, {key: i, render});
    });

    // Upstream hides a non-empty tip until postrender measures the text and
    // reveals it; the reveal is scheduled via requestAnimationFrame (or a
    // microtask when already connected). Without an animation frame (SSR,
    // JSDOM) the tip therefore stays hidden. Our layout is computed
    // synchronously, so when a frame is available we render the revealed
    // state directly; otherwise we match upstream's hidden output. The count
    // is the showing items, as upstream's is (it filters the index before
    // deciding), so a tip whose data all format to null is empty, not hidden.
    const visibility = shown.length > 0 && typeof requestAnimationFrame === "undefined" ? "hidden" : undefined;
    return h("g", {...indirect, ...indirectText, ...transform, visibility}, items);
  }
}

/**
 * Returns a new tip mark for the given *data* and *options*.
 *
 * If either **x** or **y** is not specified, the default is determined by the
 * **frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
 * specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
 * *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
 * [*y₀*, *y₁*, *y₂*, …].
 */
export function tip(data?: Data, {x, y, ...options}: TipOptions = {}): Tip {
  if (options.frameAnchor === undefined) [x, y] = maybeTuple(x, y);
  return new Tip(data, {...options, x, y});
}

// Upstream's automatic anchor (tip.js:222-243): prefer the orientation that
// keeps the whole box inside the frame, and fall back to the preferred anchor
// when none does. `x` and `y` are the anchor position in the frame's
// coordinates, which is why a faceted tip adds its cell's offset first.
function fitAnchor(
  x: number,
  y: number,
  w: number,
  h: number,
  m: number,
  r: number,
  {width, height}: {width: number; height: number},
  preferredAnchor: any
): any {
  const fitLeft = x + w + m + r * 2 < width;
  const fitRight = x - w - m - r * 2 > 0;
  const fitTop = y + h + m + r * 2 < height;
  const fitBottom = y - h - m - r * 2 > 0;
  return fitLeft && fitRight
    ? fitTop && fitBottom
      ? preferredAnchor
      : fitBottom
      ? "bottom"
      : "top"
    : fitTop && fitBottom
    ? fitLeft
      ? "left"
      : "right"
    : (fitLeft || fitRight) && (fitTop || fitBottom)
    ? `${fitBottom ? "bottom" : "top"}-${fitLeft ? "left" : "right"}`
    : preferredAnchor;
}

function getLineOffset(anchor: any, length: number, lineHeight: number): number {
  return /^top(?:-|$)/.test(anchor)
    ? 0.94 - lineHeight
    : // @ts-expect-error -- preserve original behavior (regex is always truthy here)
    /^bottom(?:-|$)/
    ? -0.29 - length * lineHeight
    : (length / 2) * lineHeight;
}

function getTextTranslate(anchor: any, m: number, r: number, width: number, height: number): any {
  switch (anchor) {
    case "middle":
      return [-width / 2, height / 2];
    case "top-left":
      return [r, m / 2 + r];
    case "top":
      return [-width / 2, m / 2 + r];
    case "top-right":
      return [-width - r, m / 2 + r];
    case "right":
      return [-m / 2 - width - r, height / 2];
    case "bottom-left":
      return [r, -m / 2 - r];
    case "bottom":
      return [-width / 2, -m / 2 - r];
    case "bottom-right":
      return [-width - r, -m / 2 - r];
    case "left":
      return [r + m / 2, height / 2];
  }
}

function getPath(anchor: any, m: number, r: number, width: number, height: number): any {
  const w = width + r * 2;
  const h = height + r * 2;
  switch (anchor) {
    case "middle":
      return `M${-w / 2},${-h / 2}h${w}v${h}h${-w}z`;
    case "top-left":
      return `M0,0l${m / 2},${m / 2}h${w - m / 2}v${h}h${-w}z`;
    case "top":
      return `M0,0l${m / 2},${m / 2}h${(w - m) / 2}v${h}h${-w}v${-h}h${(w - m) / 2}z`;
    case "top-right":
      return `M0,0l${-m / 2},${m / 2}h${m / 2 - w}v${h}h${w}z`;
    case "right":
      return `M0,0l${-m / 2},${-m / 2}v${m / 2 - h / 2}h${-w}v${h}h${w}v${m / 2 - h / 2}z`;
    case "bottom-left":
      return `M0,0l${m / 2},${-m / 2}h${w - m / 2}v${-h}h${-w}z`;
    case "bottom":
      return `M0,0l${m / 2},${-m / 2}h${(w - m) / 2}v${-h}h${-w}v${h}h${(w - m) / 2}z`;
    case "bottom-right":
      return `M0,0l${-m / 2},${-m / 2}h${m / 2 - w}v${-h}h${w}z`;
    case "left":
      return `M0,0l${m / 2},${-m / 2}v${m / 2 - h / 2}h${w}v${h}h${-w}v${m / 2 - h / 2}z`;
  }
}

// Note: mutates this.format!
function getSourceChannels(this: any, channels: any, scales: any) {
  const sources: any = {};

  // Promote x and y shorthand for paired channels (in order).
  let format = this.format;
  format = maybeExpandPairedFormat(format, channels, "x");
  format = maybeExpandPairedFormat(format, channels, "y");
  this.format = format;

  // Prioritize channels with explicit formats, in the given order.
  for (const key in format) {
    const value = format[key];
    if (value === null || value === false) {
      continue;
    } else if (key === "fx" || key === "fy") {
      sources[key] = true;
    } else {
      const source = getSource(channels, key);
      if (source) sources[key] = source;
    }
  }

  // Then fallback to all other (non-ignored) channels.
  for (const key in channels) {
    if (key in sources || key in format || ignoreChannels.has(key)) continue;
    if ((key === "x" || key === "y") && channels.geometry) continue; // ignore x & y on geo
    const source = getSource(channels, key);
    if (source) {
      // Ignore (e.g., color) channels if the values are all literal.
      if (source.scale == null && source.defaultScale) continue;
      sources[key] = source;
    }
  }

  // And lastly facet channels, but only if this mark is faceted.
  if (this.facet) {
    if (scales.fx && !("fx" in format)) sources.fx = true;
    if (scales.fy && !("fy" in format)) sources.fy = true;
  }

  // Promote shorthand string formats, and materialize default formats.
  for (const key in sources) {
    const format = this.format[key];
    if (typeof format === "string") {
      const value = sources[key]?.value ?? scales[key]?.domain() ?? [];
      this.format[key] = (isTemporal(value) ? utcFormat : numberFormat)(format);
    } else if (format === undefined || format === true) {
      // For ordinal scales, the inferred tick format can be more concise, such
      // as only showing the year for yearly data.
      const scale = scales[key];
      this.format[key] = scale?.bandwidth ? inferTickFormat(scale, scale.domain()) : formatDefault;
    }
  }

  return sources;
}

// Promote x and y shorthand for paired channels, while preserving order.
function maybeExpandPairedFormat(format: any, channels: any, key: string) {
  if (!(key in format)) return format;
  const key1 = `${key}1`;
  const key2 = `${key}2`;
  if ((key1 in format || !(key1 in channels)) && (key2 in format || !(key2 in channels))) return format;
  const entries = Object.entries(format);
  const value = format[key];
  entries.splice(entries.findIndex(([name]) => name === key) + 1, 0, [key1, value], [key2, value]);
  return Object.fromEntries(entries);
}

function formatTitle(this: any, i: any, index: any, {title}: any) {
  return this.format.title(title.value[i], i);
}

function* formatChannels(this: any, i: any, index: any, channels: any, scales: any, values: any): any {
  for (const key in channels) {
    if (key === "fx" || key === "fy") {
      yield {
        label: formatLabel(scales, channels, key),
        value: this.format[key](index[key], i)
      };
      continue;
    }
    if (key === "x1" && "x2" in channels) continue;
    if (key === "y1" && "y2" in channels) continue;
    const channel = channels[key];
    if (key === "x2" && "x1" in channels) {
      yield {
        label: formatPairLabel(scales, channels, "x"),
        value: formatPair(this.format.x2, channels.x1, channel, i)
      };
    } else if (key === "y2" && "y1" in channels) {
      yield {
        label: formatPairLabel(scales, channels, "y"),
        value: formatPair(this.format.y2, channels.y1, channel, i)
      };
    } else {
      const value = channel.value[i];
      const scale = channel.scale;
      if (!defined(value) && scale == null) continue;
      yield {
        label: formatLabel(scales, channels, key),
        value: this.format[key](value, i),
        color: scale === "color" ? values[key][i] : null,
        opacity: scale === "opacity" ? values[key][i] : null
      };
    }
  }
}

function formatPair(formatValue: any, c1: any, c2: any, i: any) {
  return c2.hint?.length // e.g., stackY’s y1 and y2
    ? `${formatValue(c2.value[i] - c1.value[i], i)}`
    : `${formatValue(c1.value[i], i)}–${formatValue(c2.value[i], i)}`;
}

function formatPairLabel(scales: any, channels: any, key: string) {
  const l1 = formatLabel(scales, channels, `${key}1`, key);
  const l2 = formatLabel(scales, channels, `${key}2`, key);
  return l1 === l2 ? l1 : `${l1}–${l2}`;
}

function formatLabel(scales: any, channels: any, key: string, defaultLabel: string = key) {
  const channel = channels[key];
  const scale = scales[channel?.scale ?? key];
  return String(scale?.label ?? channel?.label ?? defaultLabel);
}
