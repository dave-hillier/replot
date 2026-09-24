import {ascending, descending} from "d3";
import {createElement as h, type ReactNode} from "react";
import type {ChannelValueSpec} from "../channel.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {radians} from "../math.js";
import {constant, keyword} from "../options.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {withDatumIndex} from "../react/perDatum.js";
import {maybeSameValue} from "./link.js";

/** Options for the arrow mark. */
export interface ArrowOptions extends MarkOptions {
  /**
   * The horizontal position, for vertical arrows; typically bound to the *x*
   * scale; shorthand for setting defaults for both **x1** and **x2**.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position, for horizontal arrows; typically bound to the *y*
   * scale; shorthand for setting defaults for both **y1** and **y2**.
   */
  y?: ChannelValueSpec;

  /**
   * The starting horizontal position; typically bound to the *x* scale; also
   * sets a default for **x2**.
   */
  x1?: ChannelValueSpec;

  /**
   * The starting vertical position; typically bound to the *y* scale; also sets
   * a default for **y2**.
   */
  y1?: ChannelValueSpec;

  /**
   * The ending horizontal position; typically bound to the *x* scale; also sets
   * a default for **x1**.
   */
  x2?: ChannelValueSpec;

  /**
   * The ending vertical position; typically bound to the *y* scale; also sets a
   * default for **y1**.
   */
  y2?: ChannelValueSpec;

  /**
   * The angle, a constant in degrees, between the straight line intersecting
   * the arrow’s two control points and the outgoing tangent direction of the
   * arrow from the start point. The angle must be within ±90°; a positive angle
   * will produce a clockwise curve, while a negative angle will produce a
   * counterclockwise curve; zero (the default) will produce a straight line.
   * Use true for 22.5°.
   */
  bend?: number | boolean;

  /**
   * How pointy the arrowhead is, in degrees; a constant typically between 0°
   * and 180°, and defaults to 60°.
   */
  headAngle?: number;

  /**
   * The size of the arrowhead relative to the **strokeWidth**; a constant.
   * Assuming the default of stroke width 1.5px, this is the length of the
   * arrowhead’s side in pixels.
   */
  headLength?: number;

  /**
   * Shorthand to set the same default for **insetStart** and **insetEnd**.
   */
  inset?: number;

  /**
   * The starting inset, a constant in pixels; defaults to 0. A positive inset
   * shortens the arrow by moving the starting point towards the endpoint point,
   * while a negative inset extends it by moving the starting point in the
   * opposite direction. A positive starting inset may be useful if the arrow
   * emerges from a dot.
   */
  insetStart?: number;

  /**
   * The ending inset, a constant in pixels; defaults to 0. A positive inset
   * shortens the arrow by moving the ending point towards the starting point,
   * while a negative inset extends it by moving the ending point in the
   * opposite direction. A positive ending inset may be useful if the arrow
   * points to a dot.
   */
  insetEnd?: number;

  /**
   * The sweep order; defaults to 1 indicating a positive (clockwise) bend
   * angle; -1 indicates a negative (anticlockwise) bend angle; 0 effectively
   * clears the bend angle. If set to *-x*, the bend angle is flipped when the
   * ending point is to the left of the starting point — ensuring all arrows
   * bulge up (down if bend is negative); if set to *-y*, the bend angle is
   * flipped when the ending point is above the starting point — ensuring all
   * arrows bulge right (left if bend is negative); the sign is negated for *+x*
   * and *+y*.
   */
  sweep?: number | "+x" | "-x" | "+y" | "-y" | ((x1: number, y1: number, x2: number, y2: number) => number);
}

const defaults = {
  ariaLabel: "arrow",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeMiterlimit: 1,
  strokeWidth: 1.5
};

/** The arrow mark. */
export class Arrow extends Mark {
  bend: number;
  headAngle: number;
  headLength: number;
  insetStart: number;
  insetEnd: number;
  sweep: any;
  constructor(data: Data | null | undefined, options: ArrowOptions = {}) {
    const {
      x1,
      y1,
      x2,
      y2,
      bend = 0,
      headAngle = 60,
      headLength = 8, // Disable the arrow with headLength = 0; or, use Plot.link.
      inset = 0,
      insetStart = inset,
      insetEnd = inset,
      sweep
    } = options;
    super(
      data,
      {
        x1: {value: x1, scale: "x"},
        y1: {value: y1, scale: "y"},
        x2: {value: x2, scale: "x", optional: true},
        y2: {value: y2, scale: "y", optional: true}
      },
      options,
      defaults
    );
    this.bend = bend === true ? 22.5 : Math.max(-90, Math.min(90, bend as number));
    this.headAngle = +headAngle;
    this.headLength = +headLength;
    this.insetStart = +insetStart;
    this.insetEnd = +insetEnd;
    this.sweep = maybeSweep(sweep);
  }
  renderJSX(this: any, index, scales, channels): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x1: X1, y1: Y1, x2: X2 = X1, y2: Y2 = Y1, SW} = channels;
    const {strokeWidth, bend, headAngle, headLength, insetStart, insetEnd} = this;
    const sw = SW ? (i: number) => SW[i] : constant(strokeWidth === undefined ? 1 : strokeWidth);
    const wingAngle = (headAngle * radians) / 2;
    const wingScale = headLength / 1.5;

    const buildPath = (i: number): string | null => {
      let x1 = X1[i],
        y1 = Y1[i],
        x2 = X2[i],
        y2 = Y2[i];
      const lineLength = Math.hypot(x2 - x1, y2 - y1);
      if (lineLength <= insetStart + insetEnd) return null;
      let lineAngle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.min(wingScale * sw(i), lineLength / 3);
      const bendAngle = this.sweep(x1, y1, x2, y2) * bend * radians;
      const r = Math.hypot(lineLength / Math.tan(bendAngle), lineLength) / 2;
      if (insetStart || insetEnd) {
        if (r < 1e5) {
          const sign = Math.sign(bendAngle);
          const [cx, cy] = pointPointCenter([x1, y1], [x2, y2], r, sign);
          if (insetStart) {
            [x1, y1] = circleCircleIntersect([cx, cy, r], [x1, y1, insetStart], -sign * Math.sign(insetStart));
          }
          if (insetEnd) {
            const [x, y] = circleCircleIntersect([cx, cy, r], [x2, y2, insetEnd], sign * Math.sign(insetEnd));
            lineAngle += Math.atan2(y - cy, x - cx) - Math.atan2(y2 - cy, x2 - cx);
            (x2 = x), (y2 = y);
          }
        } else {
          const dx = x2 - x1,
            dy = y2 - y1,
            d = Math.hypot(dx, dy);
          if (insetStart) (x1 += (dx / d) * insetStart), (y1 += (dy / d) * insetStart);
          if (insetEnd) (x2 -= (dx / d) * insetEnd), (y2 -= (dy / d) * insetEnd);
        }
      }
      const endAngle = lineAngle + bendAngle;
      const leftAngle = endAngle + wingAngle;
      const rightAngle = endAngle - wingAngle;
      const x3 = x2 - headLen * Math.cos(leftAngle);
      const y3 = y2 - headLen * Math.sin(leftAngle);
      const x4 = x2 - headLen * Math.cos(rightAngle);
      const y4 = y2 - headLen * Math.sin(rightAngle);
      const a = r < 1e5 ? `A${r},${r} 0,0,${bendAngle > 0 ? 1 : 0} ` : `L`;
      const head = headLen ? `M${x3},${y3}L${x2},${y2}L${x4},${y4}` : "";
      return `M${x1},${y1}${a}${x2},${y2}${head}`;
    };

    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, scales);
    const direct = directStyleProps(this);
    const paths = (index as number[]).map((i, k) => {
      const d = buildPath(i);
      if (d == null) return null;
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const pathEl = h("path", {key: k, ...direct, ...channel, d}, titled);
      return withDatumIndex(withHrefWrap(channels, this.target, i, pathEl), i);
    });
    return h("g", {...indirect, ...transform}, paths);
  }
}

// Maybe flip the bend angle, depending on the arrow orientation.
function maybeSweep(sweep: ArrowOptions["sweep"] = 1) {
  if (typeof sweep === "number") return constant(Math.sign(sweep));
  if (typeof sweep === "function") return (x1, y1, x2, y2) => Math.sign((sweep as any)(x1, y1, x2, y2));
  switch (keyword(sweep, "sweep", ["+x", "-x", "+y", "-y"])) {
    case "+x":
      return (x1, y1, x2) => ascending(x1, x2);
    case "-x":
      return (x1, y1, x2) => descending(x1, x2);
    case "+y":
      return (x1, y1, x2, y2) => ascending(y1, y2);
    case "-y":
      return (x1, y1, x2, y2) => descending(y1, y2);
  }
}

// Returns the center of a circle that goes through the two given points ⟨ax,ay⟩
// and ⟨bx,by⟩ and has radius r. There are two such points; use the sign +1 or
// -1 to choose between them. Returns [NaN, NaN] if r is too small.
function pointPointCenter([ax, ay], [bx, by], r, sign) {
  const dx = bx - ax,
    dy = by - ay,
    d = Math.hypot(dx, dy);
  const k = (sign * Math.sqrt(r * r - (d * d) / 4)) / d;
  return [(ax + bx) / 2 - dy * k, (ay + by) / 2 + dx * k];
}

// Given two circles, one centered at ⟨ax,ay⟩ with radius ar, and the other
// centered at ⟨bx,by⟩ with radius br, returns a point at which the two circles
// intersect. There are typically two such points; use the sign +1 or -1 to
// chose between them. Returns [NaN, NaN] if there is no intersection.
// https://mathworld.wolfram.com/Circle-CircleIntersection.html
function circleCircleIntersect([ax, ay, ar], [bx, by, br], sign) {
  const dx = bx - ax,
    dy = by - ay,
    d = Math.hypot(dx, dy);
  const x = (dx * dx + dy * dy - br * br + ar * ar) / (2 * d);
  const y = sign * Math.sqrt(ar * ar - x * x);
  return [ax + (dx * x + dy * y) / d, ay + (dy * x - dx * y) / d];
}

/**
 * Returns a new arrow mark for the given *data* and *options*, drawing
 * (possibly swoopy) arrows connecting pairs of points. For example, to draw an
 * arrow connecting an observation from 1980 with an observation from 2015 in a
 * scatterplot of population and revenue inequality of U.S. cities:
 *
 * ```js
 * Plot.arrow(inequality, {x1: "POP_1980", y1: "R90_10_1980", x2: "POP_2015", y2: "R90_10_2015", bend: true})
 * ```
 */
export function arrow(data?: Data, {x, x1, x2, y, y1, y2, ...options}: ArrowOptions = {}): Arrow {
  [x1, x2] = maybeSameValue(x, x1, x2);
  [y1, y2] = maybeSameValue(y, y1, y2);
  return new Arrow(data, {...options, x1, x2, y1, y2});
}
