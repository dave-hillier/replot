import {createElement as h, type ReactNode} from "react";
import type {MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {number, singleton} from "../options.js";
import {offset} from "../style.js";
import {sqrt4_3} from "../symbol.js";
import {ox, oy} from "../transforms/hexbin.js";
import {channelStyleProps, indirectStyleProps, directStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";

/** Options for the hexgrid mark. */
export interface HexgridOptions extends MarkOptions {
  /**
   * The distance between centers of neighboring hexagons, in pixels; defaults
   * to 20. Should match the **binWidth** of the hexbin transform.
   */
  binWidth?: number;
}

const defaults = {
  ariaLabel: "hexgrid",
  fill: "none",
  stroke: "currentColor",
  strokeOpacity: 0.1
};

/**
 * The hexgrid decoration mark complements the hexbin transform, showing the
 * outlines of all hexagons spanning the frame with a default **stroke** of
 * *currentColor* and a default **strokeOpacity** of 0.1, similar to the the
 * default axis grids. For example:
 *
 * ```js
 * Plot.plot({
 *   marks: [
 *     Plot.hexagon(Plot.hexbin({fill: "count"}, {binWidth: 12, x: "weight", y: "economy"})),
 *     Plot.hexgrid({binWidth: 12})
 *   ]
 * })
 * ```
 *
 * Note that the **binWidth** option of the hexgrid mark should match that of
 * the hexbin transform. The grid is clipped by the frame. This is a stroke-only
 * mark, and **fill** is not supported; to fill the frame, use the frame mark.
 */
export function hexgrid(options?: HexgridOptions): Hexgrid {
  return new Hexgrid(options);
}

/** The hexgrid mark. */
export class Hexgrid extends Mark {
  binWidth: number;
  constructor({binWidth = 20, clip = true, ...options}: any = {}) {
    super(singleton, undefined, {clip, ...options}, defaults);
    this.binWidth = number(binWidth);
  }
  renderJSX(this: any, _index: any, _scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    const {binWidth} = this;
    const {marginTop, marginRight, marginBottom, marginLeft, width, height} = dimensions;
    const x0 = marginLeft - ox,
      x1 = width - marginRight - ox,
      y0 = marginTop - oy,
      y1 = height - marginBottom - oy,
      rx = binWidth / 2,
      ry = rx * sqrt4_3,
      hy = ry / 2,
      wx = rx * 2,
      wy = ry * 1.5,
      i0 = Math.floor(x0 / wx),
      i1 = Math.ceil(x1 / wx),
      j0 = Math.floor((y0 + hy) / wy),
      j1 = Math.ceil((y1 - hy) / wy) + 1,
      path = `m0,${round(-ry)}l${round(rx)},${round(hy)}v${round(ry)}l${round(-rx)},${round(hy)}`;
    let d = path;
    for (let j = j0; j < j1; ++j) {
      for (let i = i0; i < i1; ++i) {
        d += `M${round(i * wx + (j & 1) * rx)},${round(j * wy)}${path}`;
      }
    }
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, {}, offset + ox, offset + oy);
    // The grid is one path over a singleton datum, so its channel values — like
    // upstream, which renders it with .datum(0) — are read at index 0.
    const channel = channelStyleProps(0, channels);
    const titled = withTitleChild(this, channels, 0, null);
    const pathEl = h("path", {...direct, ...channel, d}, titled);
    return h("g", {...indirect, ...transform}, withHrefWrap(channels, this.target, 0, pathEl));
  }
}

function round(x: number) {
  return Math.round(x * 1e3) / 1e3;
}
