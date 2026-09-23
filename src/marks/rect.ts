import {createElement as h, type ReactNode} from "react";
import type {ChannelValueIntervalSpec, ChannelValueSpec} from "../channel.js";
import type {InsetOptions} from "../inset.js";
import type {Interval} from "../interval.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {constant, hasXY, identity, indexOf, number} from "../options.js";
import {isCollapsed} from "../scales.js";
import {impliedString} from "../style.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {withDatumIndex} from "../react/perDatum.js";
import {maybeIdentityX, maybeIdentityY} from "../transforms/identity.js";
import {maybeTrivialIntervalX, maybeTrivialIntervalY} from "../transforms/interval.js";
import type {StackOptions} from "../transforms/stack.js";
import {maybeStackX, maybeStackY} from "../transforms/stack.js";

/** Options for marks that render rectangles, including bar, cell, and rect. */
export interface RectCornerOptions {
  /**
   * The rounded radius for all corners, in pixels; shorthand for **rx1y1**,
   * **rx2y1**, **rx2y2**, and **rx1y2**. If the combined corner radii for each
   * side is greater than the corresponding length (width or height) of the
   * rect, the corner radii will be shrunk proportionally to maintain circular
   * corners. For elliptic corners, or to specify the corner radius as a
   * proportion of the width or height, use **rx** and **ry** instead.
   */
  r?: number;

  /**
   * The rounded radius for the **x1** corners (typically left for positive
   * *x*-values), in pixels; shorthand for **rx1y1** and **rx1y2**.
   */
  rx1?: number;

  /**
   * The rounded radius for the **y1** corners (typically bottom for positive
   * *y*-values), in pixels; shorthand for **rx1y1** and **rx2y1**.
   */
  ry1?: number;

  /**
   * The rounded radius for the **x2** corners (typically right for positive
   * *x*-values), in pixels; shorthand for **rx2y1** and **rx2y2**.
   */
  rx2?: number;

  /**
   * The rounded radius for the **y2** corners (typically top for positive
   * *y*-values), in pixels; shorthand for **rx1y2** and **rx2y2**.
   */
  ry2?: number;

  /**
   * The rounded radius for the **x1y1** corner (typically bottom-left for
   * positive values), in pixels. If **rx1y1** + **rx2y1** is greater than the
   * width of the rect, or if **rx1y1** + **rx1y2** is greater than the height
   * of the rect, the corner radii will be shrunk proportionally to maintain
   * circular corners.
   */
  rx1y1?: number;

  /**
   * The rounded radius for the **x1y2** corner (typically top-left for positive
   * values), in pixels. If **rx1y2** + **rx2y2** is greater than the
   * width of the rect, or if **rx1y1** + **rx1y2** is greater than the height
   * of the rect, the corner radii will be shrunk proportionally to maintain
   * circular corners.
   */
  rx1y2?: number;

  /**
   * The rounded radius for the **x2y1** corner (typically bottom-right for
   * positive values), in pixels. If **rx1y1** + **rx2y1** is greater than the
   * width of the rect, or if **rx2y1** + **rx2y2** is greater than the height
   * of the rect, the corner radii will be shrunk proportionally to maintain
   * circular corners.
   */
  rx2y1?: number;

  /**
   * The rounded radius for the **x2y2** corner (typically top-right for
   * positive values), in pixels. If **rx1y2** + **rx2y2** is greater than the
   * width of the rect, or if **rx2y1** + **rx2y2** is greater than the height
   * of the rect, the corner radii will be shrunk proportionally to maintain
   * circular corners.
   */
  rx2y2?: number;

  /**
   * The rounded corner [*x*-radius][1], either in pixels or as a percentage of
   * the rect width. If **rx** is not specified, it defaults to **ry** if
   * present, and otherwise draws square corners. This option is ignored if a
   * more specific corner radius (one of **rx1y1**, **rx2y1**, **rx1y2**, or
   * **rx2y2**) is specified.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/rx
   */
  rx?: number | string;

  /**
   * The rounded corner [*y*-radius][1], either in pixels or as a percentage of
   * the rect height. If **ry** is not specified, it defaults to **rx** if
   * present, and otherwise draws square corners. This option is ignored if a
   * more specific corner radius (one of **rx1y1**, **rx2y1**, **rx1y2**, or
   * **rx2y2**) is specified.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/ry
   */
  ry?: number | string;
}

/** Options for the rect mark. */
export interface RectOptions extends MarkOptions, InsetOptions, RectCornerOptions, StackOptions {
  /**
   * The horizontal position (or length/width) channel, typically bound to the
   * *x* scale.
   *
   * If an **interval** is specified, then **x1** and **x2** are derived from
   * **x**, representing the lower and upper bound of the containing interval,
   * respectively. For example, for a vertical bar chart of items sold by day:
   *
   * ```js
   * Plot.rectY(sales, {x: "date", interval: "day", y2: "items"})
   * ```
   *
   * If *x* represents ordinal values, use a bar or cell mark instead.
   */
  x?: ChannelValueIntervalSpec;

  /**
   * The required primary (starting, often left) horizontal position channel,
   * typically bound to the *x* scale. Setting this option disables the rectX
   * mark’s implicit stackX transform.
   *
   * If *x* represents ordinal values, use a bar or cell mark instead.
   */
  x1?: ChannelValueSpec;

  /**
   * The required secondary (ending, often right) horizontal position channel,
   * typically bound to the *x* scale. Setting this option disables the rectX
   * mark’s implicit stackX transform.
   *
   * If *x* represents ordinal values, use a bar or cell mark instead.
   */
  x2?: ChannelValueSpec;

  /**
   * The vertical position (or length/height) channel, typically bound to the
   * *y* scale.
   *
   * If an **interval** is specified, then **y1** and **y2** are derived from
   * **y**, representing the lower and upper bound of the containing interval,
   * respectively. For example, for a horizontal bar chart of items sold by day:
   *
   * ```js
   * Plot.rectX(sales, {y: "date", interval: "day", x2: "items"})
   * ```
   *
   * If *y* represents ordinal values, use a bar or cell mark instead.
   */
  y?: ChannelValueIntervalSpec;

  /**
   * The required primary (starting, often bottom) vertical position channel,
   * typically bound to the *y* scale. Setting this option disables the rectY
   * mark’s implicit stackY transform.
   *
   * If *y* represents ordinal values, use a bar or cell mark instead.
   */
  y1?: ChannelValueSpec;

  /**
   * The required secondary (ending, often top) vertical position channel,
   * typically bound to the *y* scale. Setting this option disables the rectY
   * mark’s implicit stackY transform.
   *
   * If *y* represents ordinal values, use a bar or cell mark instead.
   */
  y2?: ChannelValueSpec;

  /**
   * How to convert a continuous value (**x** for rectY, **y** for rectX, or
   * both for rect) into an interval (**x1** and **x2** for rectY, or **y1** and
   * **y2** for rectX, or both for rect); one of:
   *
   * - an object that implements *floor*, *offset*, and *range* methods
   * - a named time interval such as *day* (for date intervals)
   * - a number (for number intervals), defining intervals at integer multiples of *n*
   *
   * For example, for a scatterplot of penguin culmen length *vs.* depth, using
   * rects of half-millimeter width and height:
   *
   * ```js
   * Plot.rect(penguins, {x: "culmen_length_mm", y: "culmen_depth_mm", interval: 0.5})
   * ```
   *
   * Setting this option disables the implicit stack transform (stackX for rectX,
   * or stackY for rectY).
   */
  interval?: Interval;
}

/** Options for the rectX mark. */
export interface RectXOptions extends RectOptions {
  /**
   * The horizontal position (or length/width) channel, typically bound to the
   * *x* scale.
   *
   * If neither **x1** nor **x2** is specified, an implicit stackX transform is
   * applied and **x** defaults to the identity function, assuming that *data* =
   * [*x₀*, *x₁*, *x₂*, …]. Otherwise, if only one of **x1** or **x2** is
   * specified, the other defaults to **x**, which defaults to zero.
   */
  x?: ChannelValueSpec; // disallow x interval
}

/** Options for the rectY mark. */
export interface RectYOptions extends RectOptions {
  /**
   * The vertical position (or length/height) channel, typically bound to the
   * *y* scale.
   *
   * If neither **y1** nor **y2** is specified, an implicit stackY transform is
   * applied and **y** defaults to the identity function, assuming that *data* =
   * [*y₀*, *y₁*, *y₂*, …]. Otherwise, if only one of **y1** or **y2** is
   * specified, the other defaults to **y**, which defaults to zero.
   */
  y?: ChannelValueSpec; // disallow y interval
}

const defaults = {
  ariaLabel: "rect"
};

/** The rect mark. */
export class Rect extends Mark {
  insetTop!: number;
  insetRight!: number;
  insetBottom!: number;
  insetLeft!: number;
  rx: any;
  ry: any;
  rx1y1: any;
  rx1y2: any;
  rx2y1: any;
  rx2y2: any;
  constructor(data: Data, options: RectOptions = {}) {
    const {x1, y1, x2, y2} = options;
    super(
      data,
      {
        x1: {value: x1, scale: "x", type: x1 != null && x2 == null ? "band" : undefined, optional: true},
        y1: {value: y1, scale: "y", type: y1 != null && y2 == null ? "band" : undefined, optional: true},
        x2: {value: x2, scale: "x", optional: true},
        y2: {value: y2, scale: "y", optional: true}
      },
      options,
      defaults
    );
    rectInsets(this, options);
    rectRadii(this, options);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    let {x1: X1, y1: Y1, x2: X2, y2: Y2} = channels;
    const {marginTop, marginRight, marginBottom, marginLeft, width, height} = dimensions;
    const {projection} = context;
    const {insetTop, insetRight, insetBottom, insetLeft} = this;
    const {rx, ry, rx1y1, rx1y2, rx2y1, rx2y2} = this;
    if ((X1 || X2) && !projection && isCollapsed(x)) X1 = X2 = null;
    if ((Y1 || Y2) && !projection && isCollapsed(y)) Y1 = Y2 = null;
    const bx = x?.bandwidth ? x.bandwidth() : 0;
    const by = y?.bandwidth ? y.bandwidth() : 0;
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, {}, 0, 0);
    const rounded = !!(rx1y1 || rx1y2 || rx2y1 || rx2y2);
    const elementOf = rounded
      ? (() => {
          const x1Of =
            X1 && X2
              ? (i: number) => X1[i] + (X2[i] < X1[i] ? -insetRight : insetLeft)
              : X1
              ? (i: number) => X1[i] + insetLeft
              : () => marginLeft + insetLeft;
          const y1Of =
            Y1 && Y2
              ? (i: number) => Y1[i] + (Y2[i] < Y1[i] ? -insetBottom : insetTop)
              : Y1
              ? (i: number) => Y1[i] + insetTop
              : () => marginTop + insetTop;
          const x2Of =
            X1 && X2
              ? (i: number) => X2[i] - (X2[i] < X1[i] ? -insetLeft : insetRight)
              : X1
              ? (i: number) => X1[i] + bx - insetRight
              : () => width - marginRight - insetRight;
          const y2Of =
            Y1 && Y2
              ? (i: number) => Y2[i] - (Y2[i] < Y1[i] ? -insetTop : insetBottom)
              : Y1
              ? (i: number) => Y1[i] + by - insetBottom
              : () => height - marginBottom - insetBottom;
          return (i: number, key: number, props: Record<string, any>, children: ReactNode) =>
            h("path", {key, ...props, d: roundedRectPath(x1Of(i), y1Of(i), x2Of(i), y2Of(i), this)}, children);
        })()
      : (() => {
          const xOf = X1
            ? X2
              ? (i: number) => Math.min(X1[i], X2[i]) + insetLeft
              : (i: number) => X1[i] + insetLeft
            : () => marginLeft + insetLeft;
          const yOf = Y1
            ? Y2
              ? (i: number) => Math.min(Y1[i], Y2[i]) + insetTop
              : (i: number) => Y1[i] + insetTop
            : () => marginTop + insetTop;
          const widthOf = X1
            ? X2
              ? (i: number) => Math.max(0, Math.abs(X2[i] - X1[i]) + bx - insetLeft - insetRight)
              : () => bx - insetLeft - insetRight
            : () => width - marginRight - marginLeft - insetRight - insetLeft;
          const heightOf = Y1
            ? Y2
              ? (i: number) => Math.max(0, Math.abs(Y1[i] - Y2[i]) + by - insetTop - insetBottom)
              : () => by - insetTop - insetBottom
            : () => height - marginTop - marginBottom - insetTop - insetBottom;
          return (i: number, key: number, props: Record<string, any>, children: ReactNode) =>
            h(
              "rect",
              {
                key,
                ...props,
                x: xOf(i),
                y: yOf(i),
                width: widthOf(i),
                height: heightOf(i),
                rx: rx ?? undefined,
                ry: ry ?? undefined
              },
              children
            );
        })();
    const items = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const el = elementOf(i, k, {...direct, ...channel}, titled);
      return withDatumIndex(withHrefWrap(channels, this.target, i, el), i);
    });
    return h("g", {...indirect, ...transform}, items);
  }
}

export function rectInsets(
  mark: any,
  {inset = 0, insetTop = inset, insetRight = inset, insetBottom = inset, insetLeft = inset}: any = {}
) {
  mark.insetTop = number(insetTop);
  mark.insetRight = number(insetRight);
  mark.insetBottom = number(insetBottom);
  mark.insetLeft = number(insetLeft);
}

export function rectRadii(
  mark: any,
  {
    r,
    rx, // for elliptic corners
    ry, // for elliptic corners
    rx1 = r,
    ry1 = r,
    rx2 = r,
    ry2 = r,
    rx1y1 = rx1 !== undefined ? +rx1 : ry1 !== undefined ? +ry1 : 0,
    rx1y2 = rx1 !== undefined ? +rx1 : ry2 !== undefined ? +ry2 : 0,
    rx2y1 = rx2 !== undefined ? +rx2 : ry1 !== undefined ? +ry1 : 0,
    rx2y2 = rx2 !== undefined ? +rx2 : ry2 !== undefined ? +ry2 : 0
  }: any = {}
) {
  if (rx1y1 || rx1y2 || rx2y1 || rx2y2) {
    mark.rx1y1 = rx1y1;
    mark.rx1y2 = rx1y2;
    mark.rx2y1 = rx2y1;
    mark.rx2y2 = rx2y2;
  } else {
    mark.rx = impliedString(rx, "auto"); // number or percentage
    mark.ry = impliedString(ry, "auto");
  }
}

export function roundedRectPath(x1: number, y1: number, x2: number, y2: number, mark: any): string {
  const {rx1y1: r11, rx1y2: r12, rx2y1: r21, rx2y2: r22} = mark;
  const rx = Math.max(Math.abs(r11 + r21), Math.abs(r12 + r22));
  const ry = Math.max(Math.abs(r11 + r12), Math.abs(r21 + r22));
  const ix = x1 > x2;
  const iy = y1 > y2;
  const l = ix ? x2 : x1;
  const r = ix ? x1 : x2;
  const t = iy ? y2 : y1;
  const b = iy ? y1 : y2;
  const k = Math.min(1, (r - l) / rx, (b - t) / ry);
  const tl = k * (ix ? (iy ? r22 : r21) : iy ? r12 : r11);
  const tr = k * (ix ? (iy ? r12 : r11) : iy ? r22 : r21);
  const br = k * (ix ? (iy ? r11 : r12) : iy ? r21 : r22);
  const bl = k * (ix ? (iy ? r21 : r22) : iy ? r11 : r12);
  return (
    `M${l},${t + biasY(tl, bl)}A${tl},${tl} 0 0 ${tl < 0 ? 0 : 1} ${l + biasX(tl, bl)},${t}` +
    `H${r - biasX(tr, br)}A${tr},${tr} 0 0 ${tr < 0 ? 0 : 1} ${r},${t + biasY(tr, br)}` +
    `V${b - biasY(br, tr)}A${br},${br} 0 0 ${br < 0 ? 0 : 1} ${r - biasX(br, tr)},${b}` +
    `H${l + biasX(bl, tl)}A${bl},${bl} 0 0 ${bl < 0 ? 0 : 1} ${l},${b - biasY(bl, tl)}` +
    `Z`
  );
}

export function applyRoundedRect(selection: any, X1: any, Y1: any, X2: any, Y2: any, mark: any) {
  if (typeof X1 !== "function") X1 = constant(X1);
  if (typeof Y1 !== "function") Y1 = constant(Y1);
  if (typeof X2 !== "function") X2 = constant(X2);
  if (typeof Y2 !== "function") Y2 = constant(Y2);
  selection.attr("d", (i: number) => roundedRectPath(X1(i), Y1(i), X2(i), Y2(i), mark));
}

/**
 * If the opposing corner has a negative radius r2, if this corner has a
 * negative radius r1, this corner’s “wing” will extend horizontally rather than
 * vertically.
 */
function biasX(r1: number, r2: number) {
  return r2 < 0 ? r1 : Math.abs(r1);
}

/**
 * If the opposing corner has a negative radius r2, if this corner has a
 * negative radius r1, this corner’s “wing” will extend horizontally rather than
 * vertically.
 */
function biasY(r1: number, r2: number) {
  return r2 < 0 ? Math.abs(r1) : r1;
}

/**
 * Returns a rect mark for the given *data* and *options*. The rectangle extends
 * horizontally from **x1** to **x2**, and vertically from **y1** to **y2**. The
 * position channels are often derived with a transform. For example, for a
 * heatmap of athletes, binned by weight and height:
 *
 * ```js
 * Plot.rect(athletes, Plot.bin({fill: "proportion"}, {x: "weight", y: "height"}))
 * ```
 *
 * When **y** extends from zero, for example for a histogram where the height of
 * each rect reflects a count of values, use the rectY mark for an implicit
 * stackY transform; similarly, if **x** extends from zero, use the rectX mark
 * for an implicit stackX transform.
 *
 * If an **interval** is specified, then **x1** and **x2** are derived from
 * **x**, and **y1** and **y2** are derived from **y**, each representing the
 * lower and upper bound of the containing interval, respectively.
 *
 * Both *x* and *y* should be quantitative or temporal; otherwise, use a bar or
 * cell mark.
 */
export function rect(data?: Data, options?: RectOptions): Rect {
  return new Rect(data as Data, maybeTrivialIntervalX(maybeTrivialIntervalY(options)));
}

/**
 * Like rect, but if neither **x1** nor **x2** is specified, an implicit stackX
 * transform is applied to **x**, and if **x** is not specified, it defaults to
 * the identity function, assuming that *data* is an array of numbers [*x₀*,
 * *x₁*, *x₂*, …]. For example, for a vertical histogram of athletes by height
 * with rects aligned at *x* = 0:
 *
 * ```js
 * Plot.rectX(olympians, Plot.binY({x: "count"}, {y: "height"}))
 * ```
 */
export function rectX(data?: Data, options: RectXOptions = {}): Rect {
  if (!hasXY(options)) options = {...options, y: indexOf, x2: identity, interval: 1};
  return new Rect(data as Data, maybeStackX(maybeTrivialIntervalY(maybeIdentityX(options))));
}

/**
 * Like rect, but if neither **y1** nor **y2** is specified, apply an implicit
 * stackY transform is applied to **y**, and if **y** is not specified, it
 * defaults to the identity function, assuming that *data* is an array of
 * numbers [*y₀*, *y₁*, *y₂*, …]. For example, for a horizontal histogram of
 * athletes by weight with rects aligned at *y* = 0:
 *
 * ```js
 * Plot.rectY(olympians, Plot.binX({y: "count"}, {x: "weight"}))
 * ```
 */
export function rectY(data?: Data, options: RectYOptions = {}): Rect {
  if (!hasXY(options)) options = {...options, x: indexOf, y2: identity, interval: 1};
  return new Rect(data as Data, maybeStackY(maybeTrivialIntervalX(maybeIdentityY(options))));
}
