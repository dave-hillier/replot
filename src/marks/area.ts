import {area as shapeArea, line as shapeLine} from "d3";
import {createElement as h, Fragment, type ReactNode} from "react";
import type {ChannelValue, ChannelValueDenseBinSpec, ChannelValueSpec} from "../channel.js";
import {maybeCurve} from "../curve.js";
import type {CurveOptions} from "../curve.js";
import {Mark} from "../mark.js";
import type {Data, MarkOptions} from "../mark.js";
import {markers} from "../marker.js";
import type {MarkerOptions} from "../marker.js";
// @ts-expect-error — runtime helpers not exposed in companion .d.ts
import {first, indexOf, keyof, maybeZ, second} from "../options.js";
// @ts-expect-error — runtime helpers not exposed in companion .d.ts
import {groupIndex} from "../style.js";
import {markerToJSX} from "../react/Markers.js";
import {groupChannelStyleProps, indirectStyleProps, directStyleProps, offset, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
// @ts-expect-error — runtime helpers not exposed in companion .d.ts
import {maybeDenseIntervalX, maybeDenseIntervalY} from "../transforms/bin.js";
import type {BinOptions, BinReducer} from "../transforms/bin.js";
import {maybeIdentityX, maybeIdentityY} from "../transforms/identity.js";
import {maybeStackX, maybeStackY} from "../transforms/stack.js";
import type {StackOptions} from "../transforms/stack.js";

/** Options for the area, areaX, and areaY marks. */
export interface AreaOptions extends MarkOptions, StackOptions, CurveOptions {
  /**
   * The required primary (starting, often left) horizontal position channel,
   * representing the area’s baseline, typically bound to the *x* scale. For
   * areaX, setting this option disables the implicit stackX transform.
   */
  x1?: ChannelValueSpec;

  /**
   * The optional secondary (ending, often right) horizontal position channel,
   * representing the area’s topline, typically bound to the *x* scale; if not
   * specified, **x1** is used. For areaX, setting this option disables the
   * implicit stackX transform.
   */
  x2?: ChannelValueSpec;

  /**
   * The required primary (starting, often bottom) vertical position channel,
   * representing the area’s baseline, typically bound to the *y* scale. For
   * areaY, setting this option disables the implicit stackY transform.
   */
  y1?: ChannelValueSpec;

  /**
   * The optional secondary (ending, often top) vertical position channel,
   * representing the area’s topline, typically bound to the *y* scale; if not
   * specified, **y1** is used. For areaY, setting this option disables the
   * implicit stackY transform.
   */
  y2?: ChannelValueSpec;

  /**
   * An optional ordinal channel for grouping data into (possibly stacked)
   * series to be drawn as separate areas; defaults to **fill** if a channel, or
   * **stroke** if a channel.
   */
  z?: ChannelValue;
}

/** Options for the areaX mark. */
export interface AreaXOptions extends Omit<AreaOptions, "y1" | "y2">, BinOptions, MarkerOptions {
  /**
   * Whether to draw the area’s topline again as a stroke-only line, as in the
   * area-line mark (area.js:96 upstream); the line also takes the marker
   * options. The area itself is unchanged, so a translucent fill and a crisp
   * edge can be combined without a second mark.
   */
  line?: boolean;

  /**
   * The horizontal position (or length) channel, typically bound to the *x*
   * scale.
   *
   * If neither **x1** nor **x2** is specified, an implicit stackX transform is
   * applied and **x** defaults to the identity function, assuming that *data* =
   * [*x₀*, *x₁*, *x₂*, …]. Otherwise, if only one of **x1** or **x2** is
   * specified, the other defaults to **x**, which defaults to zero.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position channel, typically bound to the *y* scale; defaults
   * to the zero-based index of the data [0, 1, 2, …].
   *
   * If an **interval** is specified, **y** values are binned accordingly,
   * allowing zeroes for empty bins instead of interpolating across gaps. This
   * is recommended to “regularize” sampled data; for example, if your data
   * represents timestamped observations and you expect one observation per day,
   * use *day* as the **interval**.
   */
  y?: ChannelValueDenseBinSpec;

  /**
   * How to reduce **x** values when the **y** channel is binned with an
   * **interval**; defaults to *first*. For example, to create a vertical
   * density plot (count of *y* values binned every 0.5):
   *
   * ```js
   * Plot.areaX(data, {y: "value", interval: 0.5, reduce: "count"})
   * ```
   *
   * To default to zero instead of showing gaps in data, as when the observed
   * value represents a quantity, use the *sum* reducer.
   */
  reduce?: BinReducer;
}

/** Options for the areaY mark. */
export interface AreaYOptions extends Omit<AreaOptions, "x1" | "x2">, BinOptions, MarkerOptions {
  /**
   * Whether to draw the area’s topline again as a stroke-only line, as in the
   * area-line mark (area.js:96 upstream); the line also takes the marker
   * options. The area itself is unchanged, so a translucent fill and a crisp
   * edge can be combined without a second mark.
   */
  line?: boolean;

  /**
   * The horizontal position channel, typically bound to the *x* scale; defaults
   * to the zero-based index of the data [0, 1, 2, …].
   *
   * If an **interval** is specified, **x** values are binned accordingly,
   * allowing zeroes for empty bins instead of interpolating across gaps. This
   * is recommended to “regularize” sampled data; for example, if your data
   * represents timestamped observations and you expect one observation per day,
   * use *day* as the **interval**.
   */
  x?: ChannelValueDenseBinSpec;

  /**
   * The vertical position (or length) channel, typically bound to the *y*
   * scale.
   *
   * If neither **y1** nor **y2** is specified, an implicit stackY transform is
   * applied and **y** defaults to the identity function, assuming that *data* =
   * [*y₀*, *y₁*, *y₂*, …]. Otherwise, if only one of **y1** or **y2** is
   * specified, the other defaults to **y**, which defaults to zero.
   */
  y?: ChannelValueSpec;

  /**
   * How to reduce **y** values when the **x** channel is binned with an
   * **interval**; defaults to *first*. For example, for an area chart of the
   * count of records by month:
   *
   * ```js
   * Plot.areaY(records, {x: "Date", interval: "month", reduce: "count"})
   * ```
   *
   * To default to zero instead of showing gaps in data, as when the observed
   * value represents a quantity, use the *sum* reducer.
   */
  reduce?: BinReducer;
}

const areaDefaults = {
  ariaLabel: "area",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeMiterlimit: 1
};

// The area-line defaults follow the line mark (area.js:20-29 upstream): the
// topline is stroked over a translucent fill, so the fill opacity drops to 0.3
// and the stroke takes the line’s 1.5 weight. They are passed to the Area
// constructor rather than merged into the options, so that the user’s options
// still win.
const areaLineDefaults = {
  ariaLabel: "area-line",
  fillOpacity: 0.3,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeMiterlimit: 1
};

/** The area mark. */
export class Area extends Mark {
  z: any;
  curve: any;
  constructor(data: Data | null | undefined, options: any = {}, defaults: any = areaDefaults) {
    const {x1, y1, x2, y2, z, curve, tension} = options;
    const channels = {
      x1: {value: x1, scale: "x"},
      y1: {value: y1, scale: "y"},
      x2: {value: x2, scale: "x", optional: true},
      y2: {value: y2, scale: "y", optional: true},
      z: {value: maybeZ(options), optional: true}
    };
    super(data, channels, options, defaults);
    this.z = z;
    this.curve = maybeCurve(curve, tension);
  }
  filter(index: any): any {
    return index;
  }
  renderJSX(this: any, index: any, scales: any, channels: any, _dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x1: X1, y1: Y1, x2: X2 = X1, y2: Y2 = Y1} = channels;
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, scales, 0, 0);
    const generator = shapeArea()
      .curve(this.curve)
      .defined((i: any) => i >= 0)
      .x0((i: any) => X1[i])
      .y0((i: any) => Y1[i])
      .x1((i: any) => X2[i])
      .y1((i: any) => Y2[i]);
    const groups = Array.from(groupIndex(index, [X1, Y1, X2, Y2], this, channels) as Iterable<number[]>);
    const paths = groups.map((G, k) => {
      const channel = groupChannelStyleProps(G, channels);
      const titled = withTitleChild(this, channels, G[0], null);
      const d = generator(G as any) ?? undefined;
      const pathEl = h("path", {key: k, ...direct, ...channel, d}, titled);
      return withHrefWrap(channels, this.target, G[0], pathEl);
    });
    return h("g", {...indirect, ...transform}, paths);
  }
}

/**
 * The area-line mark: the area mark (area.js:96-152 upstream) with its topline
 * drawn again as a stroke-only path, so that the area fill can be translucent
 * while the edge stays crisp. The two paths share a group, which carries the
 * direct and channel styles for the pair; the area path drops the stroke and
 * the line path drops the fill.
 *
 * It is not exported: areaX and areaY select it from the **line** option, as
 * upstream does.
 */
class AreaLine extends Area {
  constructor(data: Data | null | undefined, options: any = {}) {
    super(data, options, areaLineDefaults);
    markers(this, options);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, _dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x1: X1, y1: Y1, x2: X2 = X1, y2: Y2 = Y1, stroke: S} = channels;
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, scales, 0, 0);
    const areaGenerator = shapeArea()
      .curve(this.curve)
      .defined((i: any) => i >= 0)
      .x0((i: any) => X1[i])
      .y0((i: any) => Y1[i])
      .x1((i: any) => X2[i])
      .y1((i: any) => Y2[i]);
    // The line follows the topline only — the baseline is the area’s business.
    const lineGenerator = shapeLine()
      .curve(this.curve)
      .defined((i: any) => i >= 0)
      .x((i: any) => X2[i])
      .y((i: any) => Y2[i]);
    // Marker defs are collected by id and hoisted into a single <defs> at the
    // mark root, as in Line.renderJSX: upstream inserts each <marker> inline
    // before the first path that references it (marker.js:164), which the JSX
    // path cannot do without a post-render pass.
    const markerDefs = new Map<string, ReactNode>();
    const markerUrl = (marker: any, color: any): string | null => {
      if (!marker) return null;
      const m = markerToJSX(marker, color);
      if (!m) return null;
      if (!markerDefs.has(m.id)) markerDefs.set(m.id, m.defJSX);
      return m.urlRef;
    };
    const groups = Array.from(groupIndex(index, [X1, Y1, X2, Y2], this, channels) as Iterable<number[]>);
    // Grouped-marker orientation, mirroring getGroupedOrientation in marker.js
    // (and, in this port, Line.renderJSX): when a series (z) is split into
    // several path segments only the first segment takes marker-start, and only
    // the last takes marker-end; the interior joints take marker-mid.
    const Z = channels.z;
    const START = new Array(groups.length).fill(false);
    const END = new Array(groups.length).fill(false);
    if (Z) {
      const multi = groups.map((_, k) => k).filter((k) => groups[k].length > 1);
      const UNSET = {};
      let z: any = UNSET;
      for (const k of multi) if (z !== (z = keyof(Z[groups[k][0]]))) START[k] = true;
      z = UNSET;
      for (let j = multi.length - 1; j >= 0; --j) {
        const k = multi[j];
        if (z !== (z = keyof(Z[groups[k][0]]))) END[k] = true;
      }
    }
    const paths = groups.map((G, k) => {
      const channel = groupChannelStyleProps(G, channels);
      const i = G[0];
      const color = S ? S[i] : this.stroke;
      const markerAttrs: Record<string, string> = {};
      const startUrl = !Z || START[k] ? markerUrl(this.markerStart, color) : markerUrl(this.markerMid, color);
      if (startUrl) markerAttrs.markerStart = startUrl;
      const midUrl = markerUrl(this.markerMid, color);
      if (midUrl) markerAttrs.markerMid = midUrl;
      if (!Z || END[k]) {
        const endUrl = markerUrl(this.markerEnd, color);
        if (endUrl) markerAttrs.markerEnd = endUrl;
      }
      const titled = withTitleChild(this, channels, i, null);
      const d = areaGenerator(G as any) ?? undefined;
      const dl = lineGenerator(G as any) ?? undefined;
      const areaPath = h("path", {key: "area", stroke: "none", d});
      const linePath = h(
        "path",
        {
          key: "line",
          ...markerAttrs,
          fill: "none",
          transform: offset ? `translate(${offset},${offset})` : undefined,
          d: dl
        },
        titled
      );
      return withHrefWrap(channels, this.target, i, h("g", {key: k, ...direct, ...channel}, areaPath, linePath));
    });
    const defs =
      markerDefs.size > 0
        ? h(
            "defs",
            {key: "__defs"},
            ...Array.from(markerDefs.entries()).map(([id, def]) => h(Fragment, {key: id}, def))
          )
        : null;
    return h("g", {...indirect, ...transform}, defs, ...paths);
  }
}

/**
 * Returns a new area mark with the given *data* and *options*. The area mark is
 * rarely used directly; it is only needed when the baseline and topline have
 * neither *x* nor *y* values in common. Use areaY for a horizontal orientation
 * where the baseline and topline share *x* values, or areaX for a vertical
 * orientation where the baseline and topline share *y* values.
 */
export function area(data?: Data, options?: AreaOptions): Area {
  if (options === undefined) return areaY(data, {x: first, y: second} as any);
  return new Area(data, options);
}

/**
 * Returns a new vertically-oriented area mark for the given *data* and
 * *options*, where the baseline and topline share **y** values, as in a
 * time-series area chart where time goes up↑.
 */
export function areaX(data?: Data, options?: AreaXOptions): Area {
  // Apply the y=indexOf default and the implicit identity-x transform before
  // binning, so that maybeDenseIntervalY emits the binned y1/y2 edges (and the
  // reduced x channel) rather than overwriting them downstream.
  const {y = indexOf, ...denseRest} = (options ?? {}) as any;
  const {
    x,
    y: yOut,
    line,
    color,
    stroke = color,
    fill = color,
    z = x === fill || x === stroke ? null : undefined,
    ...rest
  } = maybeDenseIntervalY({y, ...maybeIdentityX(denseRest)}) as any;
  return new (line ? AreaLine : Area)(data, maybeStackX({...rest, x, y1: yOut, y2: undefined, z, stroke, fill}));
}

/**
 * Returns a new horizontally-oriented area mark for the given *data* and
 * *options*, where the baseline and topline share **x** values, as in a
 * time-series area chart where time goes right→.
 */
export function areaY(data?: Data, options?: AreaYOptions): Area {
  // Apply the x=indexOf default and the implicit identity-y transform before
  // binning, so that maybeDenseIntervalX emits the binned x1/x2 edges (and the
  // reduced y channel) rather than overwriting them downstream.
  const {x = indexOf, ...denseRest} = (options ?? {}) as any;
  const {
    x: xOut,
    y,
    line,
    color,
    stroke = color,
    fill = color,
    z = y === fill || y === stroke ? null : undefined,
    ...rest
  } = maybeDenseIntervalX({x, ...maybeIdentityY(denseRest)}) as any;
  return new (line ? AreaLine : Area)(data, maybeStackY({...rest, x1: xOut, x2: undefined, y, z, stroke, fill}));
}
