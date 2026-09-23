import {format as numberFormat, utcFormat} from "d3";
import {createElement as h, type ReactNode} from "react";
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
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";

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
const ignoreChannels = new Set(["geometry", "href", "src", "ariaLabel", "scales"]);

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
    const {x, y} = scales;
    const {anchor, monospace, lineHeight, lineWidth} = this;
    const {textPadding: r, pointerSize: m, pathFilter} = this;

    const {x1: X1, y1: Y1, x2: X2, y2: Y2, x: X = X1 ?? X2, y: Y = Y1 ?? Y2} = values;

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

    const items = (index as number[]).map((i, k) => {
      // Generate name-value lines for this datum.
      const raw = format.call(mark, i, index, sources, scales, values);
      let lineSpecs: any[];
      if (typeof raw === "string") {
        lineSpecs = mark.splitLines(raw).map((line: string) => ({value: mark.clipLine(line)}));
      } else {
        lineSpecs = [];
        const labels = new Set();
        for (const line of raw) {
          const {label = ""} = line;
          if (label && labels.has(label)) continue;
          else labels.add(label);
          lineSpecs.push(line);
        }
      }
      const lines = lineSpecs.map(buildLine);
      const n = lines.length;

      // Approximate text dimensions — we cannot getBBox in JSX rendering.
      // Width is the widest line; height is n lines at lineHeight em.
      // widthof returns units of ~100 per em, so scale matches getBBox roughly.
      const fontSize = +this.fontSize || 10;
      const w = Math.round(Math.max(0, ...lines.map((l) => (l.width / 100) * fontSize)));
      const heightPx = Math.round(n * lineHeight * fontSize);

      // Choose anchor: if explicit, use it; otherwise use preferredAnchor (we
      // cannot do fit detection without DOM measurement in the JSX path).
      const a = anchor ?? mark.preferredAnchor ?? "bottom";

      const d = getPath(a, m, r, w, heightPx);
      const [tx, ty] = getTextTranslate(a, m, r, w, heightPx);
      const yOffset = +getLineOffset(a, n, lineHeight).toFixed(6);

      const channel = channelStyleProps(i, values);

      const pathEl = h("path", {filter: pathFilter, d});
      const tspans: ReactNode[] = [];
      for (let li = 0; li < n; li++) {
        tspans.push(h("tspan", {key: li, x: 0, dy: `${lineHeight}em`}, ...lines[li].tspans));
      }
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

      const inner = h(
        "g",
        {
          key: k,
          transform: `translate(${Math.round(px(i))},${Math.round(py(i))})`,
          ...direct,
          ...channel
        },
        pathEl,
        textEl
      );

      const titled = withTitleChild(this, values, i, null);
      const node = titled ? h("g", {key: k}, inner, titled) : inner;
      return withHrefWrap(values, this.target, i, node);
    });

    // Upstream hides a non-empty tip until postrender measures the text and
    // reveals it; the reveal is scheduled via requestAnimationFrame (or a
    // microtask when already connected). Without an animation frame (SSR,
    // JSDOM) the tip therefore stays hidden. Our layout is computed
    // synchronously, so when a frame is available we render the revealed
    // state directly; otherwise we match upstream's hidden output.
    const visibility = index.length > 0 && typeof requestAnimationFrame === "undefined" ? "hidden" : undefined;
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
      return [r, m + r];
    case "top":
      return [-width / 2, m / 2 + r];
    case "top-right":
      return [-width - r, m + r];
    case "right":
      return [-m / 2 - width - r, height / 2];
    case "bottom-left":
      return [r, -m - r];
    case "bottom":
      return [-width / 2, -m / 2 - r];
    case "bottom-right":
      return [-width - r, -m - r];
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
      return `M0,0l${m},${m}h${w - m}v${h}h${-w}z`;
    case "top":
      return `M0,0l${m / 2},${m / 2}h${(w - m) / 2}v${h}h${-w}v${-h}h${(w - m) / 2}z`;
    case "top-right":
      return `M0,0l${-m},${m}h${m - w}v${h}h${w}z`;
    case "right":
      return `M0,0l${-m / 2},${-m / 2}v${m / 2 - h / 2}h${-w}v${h}h${w}v${m / 2 - h / 2}z`;
    case "bottom-left":
      return `M0,0l${m},${-m}h${w - m}v${-h}h${-w}z`;
    case "bottom":
      return `M0,0l${m / 2},${-m / 2}h${(w - m) / 2}v${-h}h${-w}v${h}h${(w - m) / 2}z`;
    case "bottom-right":
      return `M0,0l${-m},${-m}h${m - w}v${-h}h${w}z`;
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
      // Ignore color channels if the values are all literal colors.
      if (source.scale == null && source.defaultScale === "color") continue;
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
