import type {Data} from "../mark.js";
import type {BarXOptions, BarYOptions} from "./bar.js";
import {extent} from "d3";
import {valueObject} from "../channel.js";
import {hasXY, identity, indexOf, isObject} from "../options.js";
import {getPatternId} from "../style.js";
import {initializer} from "../transforms/basic.js";
import {maybeIdentityX, maybeIdentityY} from "../transforms/identity.js";
import {maybeIntervalX, maybeIntervalY} from "../transforms/interval.js";
import {maybeStackX, maybeStackY} from "../transforms/stack.js";
import {BarX, BarY} from "./bar.js";
import {createElement as h, type ReactNode} from "react";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";

/** Options for the waffleX and waffleY mark. */
interface WaffleOptions {
  /** The number of cells per row or column; defaults to undefined for automatic. */
  multiple?: number;
  /** The quantity each cell represents; defaults to 1. */
  unit?: number;
  /** The gap in pixels between cells; defaults to 1. */
  gap?: number;
  /** If true, round to integers to avoid partial cells. */
  round?: boolean | ((value: number) => number);
}

/** Options for the waffleX mark. */
export interface WaffleXOptions extends BarXOptions, WaffleOptions {}

/** Options for the waffleY mark. */
export interface WaffleYOptions extends BarYOptions, WaffleOptions {}

const waffleDefaults = {
  ariaLabel: "waffle"
};

/** The waffleX mark. */
export class WaffleX extends BarX {
  unit: number;
  gap: number;
  round: (value: number) => number;
  multiple: number | undefined;
  constructor(data?: Data, {unit = 1, gap = 1, round, multiple, ...options}: WaffleXOptions = {} as any) {
    super(data, wafflePolygon("x", options), waffleDefaults);
    this.unit = Math.max(0, unit);
    this.gap = +gap;
    this.round = maybeRound(round);
    this.multiple = maybeMultiple(multiple);
  }
  renderJSX(this: any, index: any, scales: any, values: any, dimensions: any): ReactNode {
    return waffleRenderJSX(this, index, scales, values, dimensions);
  }
}

/** The waffleY mark. */
export class WaffleY extends BarY {
  unit: number;
  gap: number;
  round: (value: number) => number;
  multiple: number | undefined;
  constructor(data?: Data, {unit = 1, gap = 1, round, multiple, ...options}: WaffleYOptions = {} as any) {
    super(data, wafflePolygon("y", options), waffleDefaults);
    this.unit = Math.max(0, unit);
    this.gap = +gap;
    this.round = maybeRound(round);
    this.multiple = maybeMultiple(multiple);
  }
  renderJSX(this: any, index: any, scales: any, values: any, dimensions: any): ReactNode {
    return waffleRenderJSX(this, index, scales, values, dimensions);
  }
}

function waffleRenderJSX(mark: any, index: any, scales: any, values: any, dimensions: any): ReactNode {
  // A mark whose data is null has no index; render nothing rather than crash.
  if (index == null) index = [];
  const {gap, rx, ry} = mark;
  const {channels} = values;
  const polygon = channels.polygon.value;
  const [cx, x0] = channels.cx.value;
  const [cy, y0] = channels.cy.value;
  const indirect = indirectStyleProps(mark, dimensions);
  const direct = directStyleProps(mark);
  const transform = transformProp(mark, mark._transformScales(scales), 0, 0);
  const patternId = getPatternId();
  const indexes = index as number[];
  // Either reference position may be per-index (a band-scale position): for
  // waffleY x0 is the function, for waffleX it's y0 (the channels swap roles).
  // The imperative path evaluates both via template`translate(${x0},${y0})`.
  const x0i = typeof x0 === "function" ? x0 : () => x0;
  const y0i = typeof y0 === "function" ? y0 : () => y0;
  // The pattern <rect> mirrors the imperative applyChannelStyles(visualValues)
  // call, which omits ariaLabel/href/title — those decorate the visible <path>.
  const defs = h(
    "defs",
    null,
    indexes.map((i) => {
      const {"aria-label": _al, ...rectStyles} = channelStyleProps(i, values);
      return h(
        "pattern",
        {key: i, id: `${patternId}-${i}`, width: cx, height: cy, patternUnits: "userSpaceOnUse"},
        h("rect", {
          x: gap / 2,
          y: gap / 2,
          width: cx - gap,
          height: cy - gap,
          rx: rx ?? undefined,
          ry: ry ?? undefined,
          ...direct,
          ...rectStyles
        })
      );
    })
  );
  const paths = indexes.map((i) => {
    const ariaLabel = (channelStyleProps(i, values) as any)["aria-label"];
    const pathEl = h(
      "path",
      {
        key: i,
        d: `M${polygon[i].join("L")}Z`,
        transform: `translate(${x0i(i)},${y0i(i)})`,
        fill: `url(#${patternId}-${i})`,
        stroke: mark.stroke == null ? undefined : "none",
        "aria-label": ariaLabel
      },
      withTitleChild(mark, values, i, null)
    );
    return withHrefWrap(values, mark.target, i, pathEl);
  });
  return h("g", {...indirect, ...transform}, defs, paths);
}

function wafflePolygon(y: "x" | "y", options: any) {
  const x = y === "y" ? "x" : "y";
  const y1 = `${y}1`;
  const y2 = `${y}2`;
  return initializer(
    options,
    function (this: any, data: any, facets: any, channels: any, scales: any, dimensions: any) {
      const {round, unit} = this;
      const Y1 = channels[y1].value;
      const Y2 = channels[y2].value;

      // We might not use all the available bandwidth if the cells don’t fit evenly.
      const xy = valueObject(
        {...(x in channels && {[x]: channels[x]}), [y1]: channels[y1], [y2]: channels[y2]},
        scales
      );
      const barwidth = this[y === "y" ? "_width" : "_height"](scales, xy, dimensions);
      const barx = this[y === "y" ? "_x" : "_y"](scales, xy, dimensions);

      // The length of a unit along y in pixels.
      const scale = unit * scaleof(scales.scales[y]);

      // The number of cells on each row (or column) of the waffle.
      const {multiple = Math.max(1, Math.floor(Math.sqrt(barwidth / scale)))} = this;

      // The outer size of each square cell, in pixels, including the gap.
      const cx = Math.min(barwidth / multiple, scale * multiple);
      const cy = scale * multiple;

      // The reference position.
      const tx = (barwidth - multiple * cx) / 2;
      const x0 = typeof barx === "function" ? (i: number) => barx(i) + tx : barx + tx;
      const y0 = scales[y](0);

      // TODO insets?
      const transform =
        y === "y" ? ([x, y]: [number, number]) => [x * cx, -y * cy] : ([x, y]: [number, number]) => [y * cy, x * cx];
      const mx = typeof x0 === "function" ? (i: number) => x0(i) - barwidth / 2 : () => x0;
      const [ix, iy] = y === "y" ? [0, 1] : [1, 0];

      const n = Y2.length;
      const P = new Array(n);
      const X = new Float64Array(n);
      const Y = new Float64Array(n);

      for (let i = 0; i < n; ++i) {
        P[i] = wafflePoints(round(Y1[i] / unit), round(Y2[i] / unit), multiple).map(transform);
        const c = P[i].pop(); // extract the transformed centroid
        X[i] = c[ix] + mx(i);
        Y[i] = c[iy] + y0;
      }

      return {
        channels: {
          polygon: {value: P, source: null, filter: null},
          [`c${x}`]: {value: [cx, x0], source: null, filter: null},
          [`c${y}`]: {value: [cy, y0], source: null, filter: null},
          [x]: {value: X, scale: null, source: null},
          [y1]: {value: Y, scale: null, source: channels[y1]},
          [y2]: {value: Y, scale: null, source: channels[y2]}
        }
      };
    }
  );
}

// A waffle is approximately a rectangular shape, but may have one or two corner
// cuts if the starting or ending value is not an even multiple of the number of
// columns (the width of the waffle in cells). We can represent any waffle by
// 8 points; below is a waffle of five columns representing the interval 2–11:
//
// 1-0
// |•7-------6
// |• • • • •|
// 2---3• • •|
//     4-----5
//
// Note that points 0 and 1 always have the same y-value, points 1 and 2 have
// the same x-value, and so on, so we don’t need to materialize the x- and y-
// values of all points. Also note that we can’t use the already-projected y-
// values because these assume that y-values are distributed linearly along y
// rather than wrapping around in columns.
//
// The corner points may be coincident. If the ending value is an even multiple
// of the number of columns, say representing the interval 2–10, then points 6,
// 7, and 0 are the same.
//
// 1-----0/7/6
// |• • • • •|
// 2---3• • •|
//     4-----5
//
// Likewise if the starting value is an even multiple, say representing the
// interval 0–10, points 2–4 are coincident.
//
// 1-----0/7/6
// |• • • • •|
// |• • • • •|
// 4/3/2-----5
//
// Waffles can also represent fractional intervals (e.g., 2.4–10.1). These
// require additional corner cuts, so the implementation below generates a few
// more points.
//
// The last point describes the centroid (used for pointing)
function wafflePoints(i1: number, i2: number, columns: number): any[] {
  if (i2 < i1) return wafflePoints(i2, i1, columns); // ensure i1 <= i2
  if (i1 < 0) return wafflePointsOffset(i1, i2, columns, Math.ceil(-Math.min(i1, i2) / columns)); // ensure i1 >= 0
  const x1f = Math.floor(i1 % columns);
  const x1c = Math.ceil(i1 % columns);
  const x2f = Math.floor(i2 % columns);
  const x2c = Math.ceil(i2 % columns);
  const y1f = Math.floor(i1 / columns);
  const y1c = Math.ceil(i1 / columns);
  const y2f = Math.floor(i2 / columns);
  const y2c = Math.ceil(i2 / columns);
  const points = [];
  if (y2c > y1c) points.push([0, y1c]);
  points.push([x1f, y1c], [x1f, y1f + (i1 % 1)], [x1c, y1f + (i1 % 1)]);
  if (!(i1 % columns > columns - 1)) {
    points.push([x1c, y1f]);
    if (y2f > y1f) points.push([columns, y1f]);
  }
  if (y2f > y1f) points.push([columns, y2f]);
  points.push([x2c, y2f], [x2c, y2f + (i2 % 1)], [x2f, y2f + (i2 % 1)]);
  if (!(i2 % columns < 1)) {
    points.push([x2f, y2c]);
    if (y2c > y1c) points.push([0, y2c]);
  }
  points.push(waffleCentroid(i1, i2, columns));
  return points;
}

function wafflePointsOffset(i1: number, i2: number, columns: number, k: number) {
  return wafflePoints(i1 + k * columns, i2 + k * columns, columns).map(([x, y]: [number, number]) => [x, y - k]);
}

function waffleCentroid(i1: number, i2: number, columns: number): [number, number] {
  const r = Math.floor(i2 / columns) - Math.floor(i1 / columns);
  return r === 0
    ? // Single row
      waffleRowCentroid(i1, i2, columns)
    : r === 1
    ? // Two incomplete rows; use the midpoint of their overlap if any, otherwise the larger row
      Math.floor(i2 % columns) > Math.ceil(i1 % columns)
      ? [(Math.floor(i2 % columns) + Math.ceil(i1 % columns)) / 2, Math.floor(i2 / columns)]
      : i2 % columns > columns - (i1 % columns)
      ? waffleRowCentroid(i2 - (i2 % columns), i2, columns)
      : waffleRowCentroid(i1, columns * Math.ceil(i1 / columns), columns)
    : // At least one full row; take the midpoint of all the rows that include the middle
      [columns / 2, (Math.round(i1 / columns) + Math.round(i2 / columns)) / 2];
}

function waffleRowCentroid(i1: number, i2: number, columns: number): [number, number] {
  const c = Math.floor(i2) - Math.floor(i1);
  return c === 0
    ? // Single cell
      [Math.floor(i1 % columns) + 0.5, Math.floor(i1 / columns) + (((i1 + i2) / 2) % 1)]
    : c === 1
    ? // Two incomplete cells; use the overlap if large enough, otherwise use the largest
      (i2 % 1) - (i1 % 1) > 0.5
      ? [Math.ceil(i1 % columns), Math.floor(i2 / columns) + ((i1 % 1) + (i2 % 1)) / 2]
      : i2 % 1 > 1 - (i1 % 1)
      ? [Math.floor(i2 % columns) + 0.5, Math.floor(i2 / columns) + (i2 % 1) / 2]
      : [Math.floor(i1 % columns) + 0.5, Math.floor(i1 / columns) + (1 + (i1 % 1)) / 2]
    : // At least one full cell; take the midpoint
      [
        Math.ceil(i1 % columns) + Math.ceil(Math.floor(i2) - Math.ceil(i1)) / 2,
        Math.floor(i1 / columns) + (i2 >= 1 + i1 ? 0.5 : ((i1 + i2) / 2) % 1)
      ];
}

function maybeRound(round: any): (value: number) => number {
  if (round === undefined || round === false) return Number;
  if (round === true) return Math.round;
  if (typeof round !== "function") throw new Error(`invalid round: ${round}`);
  return round;
}

function maybeMultiple(multiple: any) {
  return multiple === undefined ? undefined : Math.max(1, Math.floor(multiple));
}

function scaleof({domain, range}: {domain: any; range: any}) {
  return spread(range) / spread(domain);
}

function spread(domain: any) {
  const [min, max] = extent(domain) as [number, number];
  return max - min;
}

/**
 * Returns a new horizonta waffle mark for the given *data* and *options*; the
 * required *x* values should be quantitative, and the optional *y* values
 * should be ordinal. For example, for a horizontal waffle chart of Olympic
 * athletes by sport:
 *
 * ```js
 * Plot.waffleX(olympians, Plot.groupY({x: "count"}, {y: "sport"}))
 * ```
 *
 * If neither **x1** nor **x2** nor **interval** is specified, an implicit
 * stackX transform is applied and **x** defaults to the identity function,
 * assuming that *data* = [*x₀*, *x₁*, *x₂*, …]. Otherwise if an **interval** is
 * specified, then **x1** and **x2** are derived from **x**, representing the
 * lower and upper bound of the containing interval, respectively. Otherwise, if
 * only one of **x1** or **x2** is specified, the other defaults to **x**, which
 * defaults to zero.
 *
 * The optional **y** ordinal channel specifies the vertical position; it is
 * typically bound to the *y* scale, which must be a *band* scale. If the **y**
 * channel is not specified, the waffle will span the vertical extent of the
 * plot’s frame. Because a waffle represents a discrete number of square cells,
 * it may not use all of the available bandwidth.
 *
 * If *options* is undefined, then **y** defaults to the zero-based index of
 * *data* [0, 1, 2, …], allowing a quick waffle chart from an array of numbers:
 *
 * ```js
 * Plot.waffleX([4, 9, 24, 46, 66, 7])
 * ```
 */
export function waffleX(data?: Data, {tip, ...options}: WaffleXOptions = {} as any): WaffleX {
  if (!hasXY(options)) options = {...options, y: indexOf, x2: identity};
  return new WaffleX(data, {tip: waffleTip(tip), ...maybeStackX(maybeIntervalX(maybeIdentityX(options)))});
}

/**
 * Returns a new vertical waffle mark for the given *data* and *options*; the
 * required *y* values should be quantitative, and the optional *x* values
 * should be ordinal. For example, for a vertical waffle chart of Olympic
 * athletes by sport:
 *
 * ```js
 * Plot.waffleY(olympians, Plot.groupX({y: "count"}, {x: "sport"}))
 * ```
 *
 * If neither **y1** nor **y2** nor **interval** is specified, an implicit
 * stackY transform is applied and **y** defaults to the identity function,
 * assuming that *data* = [*y₀*, *y₁*, *y₂*, …]. Otherwise if an **interval** is
 * specified, then **y1** and **y2** are derived from **y**, representing the
 * lower and upper bound of the containing interval, respectively. Otherwise, if
 * only one of **y1** or **y2** is specified, the other defaults to **y**, which
 * defaults to zero.
 *
 * The optional **x** ordinal channel specifies the horizontal position; it is
 * typically bound to the *x* scale, which must be a *band* scale. If the **x**
 * channel is not specified, the waffle will span the horizontal extent of the
 * plot’s frame. Because a waffle represents a discrete number of square cells,
 * it may not use all of the available bandwidth.
 *
 * If *options* is undefined, then **y** defaults to the zero-based index of
 * *data* [0, 1, 2, …], allowing a quick waffle chart from an array of numbers:
 *
 * ```js
 * Plot.waffleY([4, 9, 24, 46, 66, 7])
 * ```
 */
export function waffleY(data?: Data, {tip, ...options}: WaffleYOptions = {} as any): WaffleY {
  if (!hasXY(options)) options = {...options, x: indexOf, y2: identity};
  return new WaffleY(data, {tip: waffleTip(tip), ...maybeStackY(maybeIntervalY(maybeIdentityY(options)))});
}

/**
 * Waffle tips behave a bit unpredictably because we they are driven by the
 * waffle centroid; you could be hovering over a waffle segment, but more than
 * 40px away from its centroid, or closer to the centroid of another segment.
 * We’d rather show a tip, even if it’s the “wrong” one, so we increase the
 * default maxRadius to Infinity. The “right” way to fix this would be to use
 * signed distance to the waffle geometry rather than the centroid.
 */
function waffleTip(tip: any) {
  return tip === true
    ? {maxRadius: Infinity}
    : isObject(tip) && tip.maxRadius === undefined
    ? {...tip, maxRadius: Infinity}
    : undefined;
}
