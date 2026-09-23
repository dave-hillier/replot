import {pathRound as path, symbolCircle} from "d3";
import {createElement as h, type ReactNode} from "react";
import {
  channelStyleProps,
  directStyleProps,
  indirectStyleProps,
  transformProp,
  computeFrameAnchor
} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import type {ChannelValue, ChannelValueIntervalSpec, ChannelValueSpec} from "../channel.js";
import {negative, positive} from "../defined.js";
import type {Interval} from "../interval.js";
import type {Data, FrameAnchor, MarkOptions, RenderableMark} from "../mark.js";
import {Mark} from "../mark.js";
import {identity, maybeFrameAnchor, maybeNumberChannel, maybeTuple} from "../options.js";
import type {SymbolType} from "../symbol.js";
// @ts-expect-error not yet exported in symbol.d.ts
import {maybeSymbolChannel} from "../symbol.js";
import {sort} from "../transforms/basic.js";
import {maybeIntervalMidX, maybeIntervalMidY} from "../transforms/interval.js";

/** Options for the dot mark. */
export interface DotOptions extends MarkOptions {
  /**
   * The horizontal position channel specifying the dot’s center, typically
   * bound to the *x* scale.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position channel specifying the dot’s center, typically bound
   * to the *y* scale.
   */
  y?: ChannelValueSpec;

  /**
   * The radius of dots; either a channel or constant. When a number, it is
   * interpreted as a constant radius in pixels. Otherwise it is interpreted as
   * a channel, typically bound to the *r* channel, which defaults to the *sqrt*
   * type for proportional symbols. The radius defaults to 4.5 pixels when using
   * the **symbol** channel, and otherwise 3 pixels. Dots with a nonpositive
   * radius are not drawn.
   */
  r?: ChannelValueSpec | number;

  /**
   * The rotation angle of dots in degrees clockwise; either a channel or a
   * constant. When a number, it is interpreted as a constant; otherwise it is
   * interpreted as a channel. Defaults to 0°, pointing up.
   */
  rotate?: ChannelValue | number;

  /**
   * The categorical symbol; either a channel or a constant. A constant symbol
   * can be specified by a valid symbol name such as *star*, or a symbol object
   * (implementing the draw method); otherwise it is interpreted as a channel.
   * Defaults to *circle* for the **dot** mark, and *hexagon* for the
   * **hexagon** mark.
   *
   * If the **symbol** channel’s values are all symbols, symbol names, or
   * nullish, the channel is unscaled (values are interpreted literally);
   * otherwise, the channel is bound to the *symbol* scale.
   */
  symbol?: ChannelValueSpec | SymbolType;

  /**
   * The frame anchor specifies defaults for **x** and **y** based on the plot’s
   * frame; it may be one of the four sides (*top*, *right*, *bottom*, *left*),
   * one of the four corners (*top-left*, *top-right*, *bottom-right*,
   * *bottom-left*), or the *middle* of the frame. For example, for dots
   * distributed horizontally at the top of the frame:
   *
   * ```js
   * Plot.dot(data, {x: "date", frameAnchor: "top"})
   * ```
   */
  frameAnchor?: FrameAnchor;
}

/** Options for the dotX mark. */
export interface DotXOptions extends Omit<DotOptions, "y"> {
  /**
   * The vertical position of the dot’s center, typically bound to the *y*
   * scale.
   */
  y?: ChannelValueIntervalSpec;

  /**
   * An interval (such as *day* or a number), to transform **y** values to the
   * middle of the interval.
   */
  interval?: Interval;
}

/** Options for the dotY mark. */
export interface DotYOptions extends Omit<DotOptions, "x"> {
  /**
   * The horizontal position of the dot’s center, typically bound to the *x*
   * scale.
   */
  x?: ChannelValueIntervalSpec;

  /**
   * An interval (such as *day* or a number), to transform **x** values to the
   * middle of the interval.
   */
  interval?: Interval;
}

const defaults = {
  ariaLabel: "dot",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5
};

export function withDefaultSort(options: any): any {
  return options.sort === undefined && options.reverse === undefined ? sort({channel: "-r"}, options) : options;
}

/** The dot mark. */
export class Dot extends (Mark as unknown as new (...args: any[]) => RenderableMark) {
  r: any;
  rotate: any;
  symbol: any;
  frameAnchor: any;
  declare fill: any;
  declare stroke: any;
  declare channels: any;
  constructor(data: Data | undefined, options: DotOptions = {}) {
    const {x, y, r, rotate, symbol = symbolCircle, frameAnchor} = options;
    const [vrotate, crotate] = maybeNumberChannel(rotate, 0);
    const [vsymbol, csymbol] = maybeSymbolChannel(symbol);
    const [vr, cr] = maybeNumberChannel(r, vsymbol == null ? 3 : 4.5);
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        r: {value: vr, scale: "r", filter: positive, optional: true},
        rotate: {value: vrotate, optional: true},
        symbol: {value: vsymbol, scale: "auto", optional: true}
      },
      withDefaultSort(options),
      defaults
    );
    this.r = cr;
    this.rotate = crotate;
    this.symbol = csymbol;
    this.frameAnchor = maybeFrameAnchor(frameAnchor);

    // Give a hint to the symbol scale; this allows the symbol scale to choose
    // appropriate default symbols based on whether the dots are filled or
    // stroked, and for the symbol legend to match the appearance of the dots.
    const {channels} = this;
    const {symbol: symbolChannel} = channels;
    if (symbolChannel) {
      const {fill: fillChannel, stroke: strokeChannel} = channels;
      symbolChannel.hint = {
        fill: fillChannel
          ? fillChannel.value === symbolChannel.value
            ? "color"
            : "currentColor"
          : this.fill ?? "currentColor",
        stroke: strokeChannel
          ? strokeChannel.value === symbolChannel.value
            ? "color"
            : "currentColor"
          : this.stroke ?? "none"
      };
    }
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x: X, y: Y, r: R, rotate: A, symbol: S} = channels;
    const {r, rotate, symbol} = this;
    const [cx, cy] = computeFrameAnchor(this.frameAnchor, dimensions);
    const isCircle = symbol === symbolCircle;
    const size = R ? undefined : r * r * Math.PI;
    const indices: number[] = negative(r) ? [] : (index as number[]);
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, {x: X && scales.x, y: Y && scales.y});
    const items = indices.map((i) => {
      const channel = channelStyleProps(i, channels);
      // The title channel is a CHILD of the dot, not a sibling: upstream
      // appends it to the selected dot (style.js's applyTitle), so a titled
      // dot is <circle><title/></circle> and never a <g> wrapper.
      const title = withTitleChild(this, channels, i, null);
      let element: ReactNode;
      if (isCircle) {
        element = h(
          "circle",
          {
            key: i,
            ...direct,
            ...channel,
            cx: X ? X[i] : cx,
            cy: Y ? Y[i] : cy,
            r: R ? R[i] : r
          },
          title
        );
      } else {
        const tx = X ? X[i] : cx;
        const ty = Y ? Y[i] : cy;
        const angle = A ? A[i] : rotate;
        const t = `translate(${tx},${ty})${angle ? ` rotate(${angle})` : ``}`;
        const p = path();
        const sym = S ? S[i] : symbol;
        const sz = R ? R[i] * R[i] * Math.PI : size;
        sym.draw(p, sz);
        element = h(
          "path",
          {
            key: i,
            ...direct,
            ...channel,
            transform: t,
            d: `${p}`
          },
          title
        );
      }
      return withHrefWrap(channels, this.target, i, element);
    });
    return h("g", {...indirect, ...transform}, items);
  }
}

/**
 * Returns a new dot mark for the given *data* and *options* that draws circles,
 * or other symbols, as in a scatterplot. For example, a scatterplot of sales by
 * fruit type (category) and units sold (quantitative):
 *
 * ```js
 * Plot.dot(sales, {x: "units", y: "fruit"})
 * ```
 *
 * If either **x** or **y** is not specified, the default is determined by the
 * **frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
 * specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
 * *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
 * [*y₀*, *y₁*, *y₂*, …].
 *
 * Dots are sorted by descending radius **r** by default to mitigate
 * overplotting; set the **sort** option to null to draw them in input order.
 */
export function dot(data?: Data, {x, y, ...options}: DotOptions = {}): Dot {
  if (options.frameAnchor === undefined) [x, y] = maybeTuple(x, y);
  return new Dot(data, {...options, x, y});
}

/**
 * Like dot, except that **x** defaults to the identity function, assuming that
 * *data* = [*x₀*, *x₁*, *x₂*, …].
 *
 * ```js
 * Plot.dotX(cars.map(d => d["economy (mpg)"]))
 * ```
 *
 * If an **interval** is specified, such as *day*, **y** is transformed to the
 * middle of the interval.
 */
export function dotX(data?: Data, {x = identity, ...options}: DotXOptions = {}): Dot {
  return new Dot(data, maybeIntervalMidY({...options, x}));
}

/**
 * Like dot, except that **y** defaults to the identity function, assuming that
 * *data* = [*y₀*, *y₁*, *y₂*, …].
 *
 * ```js
 * Plot.dotY(cars.map(d => d["economy (mpg)"]))
 * ```
 *
 * If an **interval** is specified, such as *day*, **x** is transformed to the
 * middle of the interval.
 */
export function dotY(data?: Data, {y = identity, ...options}: DotYOptions = {}): Dot {
  return new Dot(data, maybeIntervalMidX({...options, y}));
}

/** Like dot, except that the **symbol** option is set to *circle*. */
export function circle(data?: Data, options?: Omit<DotOptions, "symbol">): Dot {
  return dot(data, {...options, symbol: "circle"});
}

/** Like dot, except that the **symbol** option is set to *hexagon*. */
export function hexagon(data?: Data, options?: Omit<DotOptions, "symbol">): Dot {
  return dot(data, {...options, symbol: "hexagon"});
}
