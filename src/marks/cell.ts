import {createElement as h, type ReactNode} from "react";
import type {ChannelValueSpec} from "../channel.js";
import type {InsetOptions} from "../inset.js";
import type {Data, MarkOptions, RenderableMark} from "../mark.js";
import {identity, indexOf, maybeColorChannel, maybeTuple} from "../options.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {withDatumIndex} from "../react/perDatum.js";
import {AbstractBar} from "./bar.js";
import type {RectCornerOptions} from "./rect.js";
import {roundedRectPath} from "./rect.js";

/** Options for the cell mark. */
export interface CellOptions extends MarkOptions, InsetOptions, RectCornerOptions {
  /**
   * The horizontal position of the cell; an optional ordinal channel typically
   * bound to the *x* scale. If not specified, the cell spans the horizontal
   * extent of the frame; otherwise the *x* scale must be a *band* scale.
   *
   * If *x* represents quantitative or temporal values, use a barX mark instead;
   * if *y* is also quantitative or temporal, use a rect mark.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position of the cell; an optional ordinal channel typically
   * bound to the *y* scale. If not specified, the cell spans the vertical
   * extent of the frame; otherwise the *y* scale must be a *band* scale.
   *
   * If *y* represents quantitative or temporal values, use a barY mark instead;
   * if *x* is also quantitative or temporal, use a rect mark.
   */
  y?: ChannelValueSpec;
}

const defaults = {
  ariaLabel: "cell"
};

/** The cell mark. */
export class Cell extends (AbstractBar as {new (...args: any[]): RenderableMark}) {
  constructor(data?: Data, {x, y, ...options}: CellOptions = {}) {
    super(
      data,
      {
        x: {value: x, scale: "x", type: "band", optional: true},
        y: {value: y, scale: "y", type: "band", optional: true}
      },
      options,
      defaults
    );
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {rx, ry, rx1y1, rx1y2, rx2y1, rx2y2} = this;
    const rounded = rx1y1 || rx1y2 || rx2y1 || rx2y2;
    const xOf = this._x(scales, channels, dimensions);
    const yOf = this._y(scales, channels, dimensions);
    const wOf = this._width(scales, channels, dimensions);
    const hOf = this._height(scales, channels, dimensions);
    const at = (v: any, i: number) => (typeof v === "function" ? v(i) : v);
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, {}, 0, 0);
    const rects = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const x = at(xOf, i);
      const y = at(yOf, i);
      const w = at(wOf, i);
      const h2 = at(hOf, i);
      const rect = rounded
        ? h("path", {key: k, ...direct, ...channel, d: roundedRectPath(x, y, x + w, y + h2, this)}, titled)
        : h(
            "rect",
            {
              key: k,
              ...direct,
              ...channel,
              x,
              y,
              width: w,
              height: h2,
              rx: rx ?? undefined,
              ry: ry ?? undefined
            },
            titled
          );
      return withDatumIndex(withHrefWrap(channels, this.target, i, rect), i);
    });
    return h("g", {...indirect, ...transform}, rects);
  }
}

/**
 * Returns a rectangular cell mark for the given *data* and *options*. Along
 * with **x** and/or **y**, a **fill** channel is typically specified to encode
 * value as color. For example, for a heatmap of the IMDb ratings of Simpons
 * episodes by season:
 *
 * ```js
 * Plot.cell(simpsons, {x: "number_in_season", y: "season", fill: "imdb_rating"})
 * ```
 *
 * If neither **x** nor **y** are specified, *data* is assumed to be an array of
 * pairs [[*x₀*, *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*,
 * *x₁*, *x₂*, …] and **y** = [*y₀*, *y₁*, *y₂*, …].
 *
 * Both **x** and **y** should be ordinal; if only **x** is quantitative (or
 * temporal), use a barX mark; if only **y** is quantitative, use a barY mark;
 * if both are quantitative, use a rect mark.
 */
export function cell(data?: Data, {x, y, ...options}: CellOptions = {}): Cell {
  [x, y] = maybeTuple(x, y);
  return new Cell(data, {...options, x, y});
}

/**
 * Like cell, but **x** defaults to the zero-based index [0, 1, 2, …], and if
 * **stroke** is not a channel, **fill** defaults to the identity function,
 * assuming that *data* = [*x₀*, *x₁*, *x₂*, …]. For a quick horizontal stripe
 * map visualizating an array of numbers:
 *
 * ```js
 * Plot.cellX(values)
 * ```
 */
export function cellX(data?: Data, {x = indexOf, fill, stroke, ...options}: CellOptions = {}): Cell {
  if (fill === undefined && maybeColorChannel(stroke)[0] === undefined) fill = identity;
  return new Cell(data, {...options, x, fill, stroke});
}

/**
 * Like cell, but **y** defaults to the zero-based index [0, 1, 2, …], and if
 * **stroke** is not a channel, **fill** defaults to the identity function,
 * assuming that *data* = [*y₀*, *y₁*, *y₂*, …]. For a quick vertical stripe map
 * visualizating an array of numbers:
 *
 * ```js
 * Plot.cellY(values)
 * ```
 */
export function cellY(data?: Data, {y = indexOf, fill, stroke, ...options}: CellOptions = {}): Cell {
  if (fill === undefined && maybeColorChannel(stroke)[0] === undefined) fill = identity;
  return new Cell(data, {...options, y, fill, stroke});
}
