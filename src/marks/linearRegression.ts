import {extent, range, sum, area as shapeArea} from "d3";
import {createElement as h, type ReactNode} from "react";
import type {ChannelValue, ChannelValueDenseBinSpec, ChannelValueSpec} from "../channel.js";
import type {Data, MarkOptions, RenderableMark} from "../mark.js";
import {Mark} from "../mark.js";
import {identity, indexOf, isNone, isNoneish, maybeZ} from "../options.js";
import {directStyleProps, groupChannelStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {qt} from "../stats.js";
// @ts-expect-error — these helpers are exported by style.js but not declared in style.d.ts
import {groupZ} from "../style.js";
import type {BinOptions, BinReducer} from "../transforms/bin.js";
// @ts-expect-error — maybeDenseIntervalX/Y are exported by bin.js but not declared in bin.d.ts
import {maybeDenseIntervalX, maybeDenseIntervalY} from "../transforms/bin.js";

/** Options for the linearRegressionX and linearRegressionY marks. */
interface LinearRegressionOptions extends MarkOptions, BinOptions {
  /** The confidence interval in (0, 1), or 0 to hide bands; defaults to 0.95. */
  ci?: number;
  /** The distance in pixels between samples of the confidence band; defaults to 4. */
  precision?: number;

  /**
   * An optional ordinal channel for grouping data into (possibly stacked)
   * series, producing an independent regression for each group. If not
   * specified, it defaults to **fill** if a channel, or **stroke** if a
   * channel.
   */
  z?: ChannelValue;

  /**
   * How to reduce the dependent variable (**y** for linearRegressionY, or **x**
   * for linearRegressionX) when the independent variable (**x** for
   * linearRegressionY, or **y** for linearRegressionX) is binned with an
   * **interval**; defaults to *first*. For example, for a trend line on the
   * maximum value of the Apple’s stock price by month:
   *
   * ```js
   * Plot.linearRegressionY(aapl, {x: "Date", y: "Close", interval: "month", reduce: "max"})
   * ```
   *
   * To default to zero instead of showing gaps in data, as when the observed
   * value represents a quantity, use the *sum* reducer.
   */
  reduce?: BinReducer;
}

/** Options for the linearRegressionX mark. */
export interface LinearRegressionXOptions extends LinearRegressionOptions {
  /**
   * The independent variable vertical position channel, typically bound to the
   * *y* scale; defaults to the zero-based index of the data [0, 1, 2, …].
   *
   * If an **interval** is specified, **y** values are binned accordingly,
   * allowing zeroes for empty bins instead of interpolating across gaps. This
   * is recommended to “regularize” sampled data; for example, if your data
   * represents timestamped observations and you expect one observation per day,
   * use *day* as the **interval**.
   */
  y?: ChannelValueDenseBinSpec;

  /**
   * The dependent variable horizontal position channel, typically bound to the
   * *x* scale; defaults to identity, assuming that *data* = [*x₀*, *x₁*, *x₂*,
   * …].
   */
  x?: ChannelValueSpec;
}

/** Options for the linearRegressionY mark. */
export interface LinearRegressionYOptions extends LinearRegressionOptions {
  /**
   * The independent variable horizontal position channel, typically bound to
   * the *x* scale; defaults to the zero-based index of the data [0, 1, 2, …].
   *
   * If an **interval** is specified, **x** values are binned accordingly,
   * allowing zeroes for empty bins instead of interpolating across gaps. This
   * is recommended to “regularize” sampled data; for example, if your data
   * represents timestamped observations and you expect one observation per day,
   * use *day* as the **interval**.
   */
  x?: ChannelValueDenseBinSpec;

  /**
   * The dependent variable vertical position channel, typically bound to the
   * *y* scale; defaults to identity, assuming that *data* = [*y₀*, *y₁*, *y₂*,
   * …].
   */
  y?: ChannelValueSpec;
}

const defaults = {
  ariaLabel: "linear-regression",
  fill: "currentColor",
  fillOpacity: 0.1,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeMiterlimit: 1
};

class LinearRegression extends Mark {
  z: any;
  ci: number;
  precision: number;
  constructor(data: any, options: any = {}) {
    const {x, y, z, ci = 0.95, precision = 4} = options;
    super(
      data,
      {
        x: {value: x, scale: "x"},
        y: {value: y, scale: "y"},
        z: {value: maybeZ(options), optional: true}
      },
      options,
      defaults
    );
    this.z = z;
    this.ci = +ci;
    this.precision = +precision;
    if (!(0 <= this.ci && this.ci < 1)) throw new Error(`invalid ci; not in [0, 1): ${ci}`);
    if (!(this.precision > 0)) throw new Error(`invalid precision: ${precision}`);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, _dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash
    // on the degenerate regression of an empty group.
    if (index == null) index = [];
    const {x: X, y: Y, z: Z} = channels;
    const {ci} = this;
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, scales);
    const showBand = ci && !isNone(this.fill);
    const groups = index.length ? Array.from((Z ? groupZ(index, Z, this.z) : [index]) as Iterable<number[]>) : [];
    const elements: ReactNode[] = [];
    groups.forEach((G, k) => {
      const lineChannel = groupChannelStyleProps(G, {...channels, fill: null, fillOpacity: null});
      const lineTitled = withTitleChild(this, channels, G[0], null);
      const dLine = (this as any)._renderLine(G, X, Y);
      if (showBand) {
        const bandChannel = groupChannelStyleProps(G, {
          ...channels,
          stroke: null,
          strokeOpacity: null,
          strokeWidth: null
        });
        const dBand = (this as any)._renderBand(G, X, Y);
        // The band carries the same title as its line — upstream applies the
        // grouped channel styles, title included, to both paths.
        const bandTitled = withTitleChild(this, channels, G[0], null);
        const bandEl = h("path", {key: `b${k}`, stroke: "none", ...direct, ...bandChannel, d: dBand}, bandTitled);
        elements.push(withHrefWrap(channels, this.target, G[0], bandEl));
      }
      const lineEl = h("path", {key: `l${k}`, fill: "none", ...direct, ...lineChannel, d: dLine}, lineTitled);
      elements.push(withHrefWrap(channels, this.target, G[0], lineEl));
    });
    return h("g", {...indirect, ...transform}, elements);
  }
}

class LinearRegressionX extends LinearRegression {
  constructor(data: any, options: any) {
    super(data, options);
  }
  _renderBand(I: any, X: any, Y: any) {
    const {ci, precision} = this;
    const [y1, y2] = extent(I as any[], (i: any) => Y[i]) as [number, number];
    const f = linearRegressionF(I, Y, X);
    const g = confidenceIntervalF(I, Y, X, (1 - ci) / 2, f);
    return (shapeArea() as any)
      .y((y: any) => y)
      .x0((y: any) => g(y, -1))
      .x1((y: any) => g(y, +1))(range(y1, y2 - precision / 2, precision).concat(y2));
  }
  _renderLine(I: any, X: any, Y: any) {
    const [y1, y2] = extent(I as any[], (i: any) => Y[i]) as [number, number];
    const f = linearRegressionF(I, Y, X);
    return `M${f(y1)},${y1}L${f(y2)},${y2}`;
  }
}

class LinearRegressionY extends LinearRegression {
  constructor(data: any, options: any) {
    super(data, options);
  }
  _renderBand(I: any, X: any, Y: any) {
    const {ci, precision} = this;
    const [x1, x2] = extent(I as any[], (i: any) => X[i]) as [number, number];
    const f = linearRegressionF(I, X, Y);
    const g = confidenceIntervalF(I, X, Y, (1 - ci) / 2, f);
    return (shapeArea() as any)
      .x((x: any) => x)
      .y0((x: any) => g(x, -1))
      .y1((x: any) => g(x, +1))(range(x1, x2 - precision / 2, precision).concat(x2));
  }
  _renderLine(I: any, X: any, Y: any) {
    const [x1, x2] = extent(I as any[], (i: any) => X[i]) as [number, number];
    const f = linearRegressionF(I, X, Y);
    return `M${x1},${f(x1)}L${x2},${f(x2)}`;
  }
}

/**
 * Like linearRegressionY, but where *x* is the dependent variable and *y* is
 * the independent variable. This orientation is infrequently used, but suitable
 * for example when visualizing a time-series where time goes up↑; use
 * linearRegressionY instead if time goes right→.
 */
export function linearRegressionX(
  data?: Data,
  {
    y = indexOf,
    x = identity,
    stroke,
    fill = isNoneish(stroke) ? "currentColor" : stroke,
    ...options
  }: LinearRegressionXOptions = {} as LinearRegressionXOptions
): RenderableMark {
  return new LinearRegressionX(
    data,
    maybeDenseIntervalY({...options, x, y, fill, stroke})
  ) as unknown as RenderableMark;
}

/**
 * Returns a mark that draws [linear regression][1] lines with confidence bands,
 * representing the estimated relation of a dependent variable (*y*) on an
 * independent variable (*x*). For example to estimate the linear dependence of
 * horsepower (*hp*) on weight (*wt*):
 *
 * ```js
 * Plot.linearRegressionY(mtcars, {x: "wt", y: "hp"})
 * ```
 *
 * The linear regression line is fit using the [least squares][2] approach. See
 * Torben Jansen’s [“Linear regression with confidence bands”][3] and [this
 * StatExchange question][4] for details on the confidence interval calculation.
 *
 * Multiple regressions can be produced by specifying a **z**, **fill**, or
 * **stroke** channel.
 *
 * [1]: https://en.wikipedia.org/wiki/Linear_regression
 * [2]: https://en.wikipedia.org/wiki/Least_squares
 * [3]: https://observablehq.com/@toja/linear-regression-with-confidence-bands
 * [4]: https://stats.stackexchange.com/questions/101318/understanding-shape-and-calculation-of-confidence-bands-in-linear-regression
 */
export function linearRegressionY(
  data?: Data,
  {
    x = indexOf,
    y = identity,
    stroke,
    fill = isNoneish(stroke) ? "currentColor" : stroke,
    ...options
  }: LinearRegressionYOptions = {} as LinearRegressionYOptions
): RenderableMark {
  return new LinearRegressionY(
    data,
    maybeDenseIntervalX({...options, x, y, fill, stroke})
  ) as unknown as RenderableMark;
}

function linearRegressionF(I: any, X: any, Y: any) {
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const i of I) {
    const xi = X[i];
    const yi = Y[i];
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
  }
  const n = I.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return (x) => slope * x + intercept;
}

function confidenceIntervalF(I: any, X: any, Y: any, p: any, f: any) {
  const mean = sum(I as any[], (i: any) => X[i]) / I.length;
  let a = 0,
    b = 0;
  for (const i of I) {
    a += (X[i] - mean) ** 2;
    b += (Y[i] - f(X[i])) ** 2;
  }
  const sy = Math.sqrt(b / (I.length - 2));
  const t = qt(p, I.length - 2);
  return (x: any, k: any) => {
    const Y = f(x);
    const se = sy * Math.sqrt(1 / I.length + (x - mean) ** 2 / a);
    return Y + k * t * se;
  };
}
