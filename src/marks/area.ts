import {area as shapeArea} from "d3";
import {createElement as h, type ReactNode} from "react";
import type {ChannelValue, ChannelValueDenseBinSpec, ChannelValueSpec} from "../channel.js";
import {maybeCurve} from "../curve.js";
import type {CurveOptions} from "../curve.js";
import {Mark} from "../mark.js";
import type {Data, MarkOptions} from "../mark.js";
// @ts-expect-error — runtime helpers not exposed in companion .d.ts
import {first, indexOf, maybeZ, second} from "../options.js";
// @ts-expect-error — runtime helpers not exposed in companion .d.ts
import {groupIndex} from "../style.js";
import {groupChannelStyleProps, indirectStyleProps, directStyleProps, transformProp} from "../react/styles.js";
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
export interface AreaXOptions extends Omit<AreaOptions, "y1" | "y2">, BinOptions {
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
export interface AreaYOptions extends Omit<AreaOptions, "x1" | "x2">, BinOptions {
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

const defaults = {
  ariaLabel: "area",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeMiterlimit: 1
};

/** The area mark. */
export class Area extends Mark {
  z: any;
  curve: any;
  constructor(data: Data | null | undefined, options: any = {}) {
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
    color,
    stroke = color,
    fill = color,
    z = x === fill || x === stroke ? null : undefined,
    ...rest
  } = maybeDenseIntervalY({y, ...maybeIdentityX(denseRest)}) as any;
  return new Area(data, maybeStackX({...rest, x, y1: yOut, y2: undefined, z, stroke, fill}));
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
    color,
    stroke = color,
    fill = color,
    z = y === fill || y === stroke ? null : undefined,
    ...rest
  } = maybeDenseIntervalX({x, ...maybeIdentityY(denseRest)}) as any;
  return new Area(data, maybeStackY({...rest, x1: xOut, x2: undefined, y, z, stroke, fill}));
}
