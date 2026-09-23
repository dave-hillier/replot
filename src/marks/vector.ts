import {pathRound as path} from "d3";
import {createElement as h, type ReactNode} from "react";
import type {ChannelValue, ChannelValueSpec} from "../channel.js";
import type {Data, FrameAnchor, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {identity} from "../options.js";
import {maybeFrameAnchor, maybeNumberChannel, maybeTuple, keyword} from "../options.js";
import {applyFrameAnchor} from "../style.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";

/**
 * The built-in vector shape implementations; one of:
 *
 * - *arrow* - a straight line with an open arrowhead at the end (↑)
 * - *spike* - an isosceles triangle with a flat base (▲)
 */
export type VectorShapeName = "arrow" | "spike";

/** A vector shape implementation. */
export interface VectorShapeImplementation {
  /** Draws a shape of the given *length* and *radius* to the given *context*. */
  draw(context: CanvasPath, length: number, radius: number): void;
}

/** How to draw a vector: either a named shape or a custom implementation. */
export type VectorShape = VectorShapeName | VectorShapeImplementation;

/** Options for the vector mark. */
export interface VectorOptions extends MarkOptions {
  /**
   * The horizontal position of the vector’s anchor point; an optional channel
   * bound to the *x* scale. Default depends on the **frameAnchor**.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position of the vector’s anchor point; an optional channel
   * bound to the *y* scale. Default depends on the **frameAnchor**.
   */
  y?: ChannelValueSpec;

  /**
   * The vector shape’s radius, such as half the width of the *arrow*’s head or
   * the *spike*’s base; a constant number in pixels. Defaults to 3.5 pixels.
   */
  r?: number;

  /**
   * The vector’s length; either an optional channel bound to the *length* scale
   * or a constant number in pixels. Defaults to 12 pixels.
   */
  length?: ChannelValueSpec;

  /**
   * The vector’s orientation (rotation angle); either a constant number in
   * degrees clockwise, or an optional channel (with no associated scale).
   * Defaults to 0 degrees with the vector pointing up.
   */
  rotate?: ChannelValue;

  /** The shape of the vector; a constant. Defaults to *arrow*. */
  shape?: VectorShape;

  /**
   * The vector’s position along its orientation relative to its anchor point; a
   * constant. Assuming a default **rotate** angle of 0°, one of:
   *
   * - *start* - from [*x*, *y*] to [*x*, *y* - *l*]
   * - *middle* (default) - from [*x*, *y* + *l* / 2] to [*x*, *y* - *l* / 2]
   * - *end* - from [*x*, *y* + *l*] to [*x*, *y*]
   *
   * where [*x*, *y*] is the vector’s anchor point and *l* is the vector’s
   * (possibly scaled) length in pixels.
   */
  anchor?: "start" | "middle" | "end";

  /**
   * The vector’s frame anchor, to default **x** and **y** relative to the
   * frame; a constant representing one of the frame corners (*top-left*,
   * *top-right*, *bottom-right*, *bottom-left*), sides (*top*, *right*,
   * *bottom*, *left*), or *middle* (default). Has no effect if both **x** and
   * **y** are specified.
   */
  frameAnchor?: FrameAnchor;
}

const defaults = {
  ariaLabel: "vector",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round",
  strokeLinecap: "round"
};

const defaultRadius = 3.5;

// The size of the arrowhead is proportional to its length, but we still allow
// the relative size of the head to be controlled via the mark’s width option;
// doubling the default radius will produce an arrowhead that is twice as big.
// That said, we’ll probably want a arrow with a fixed head size, too.
const wingRatio = defaultRadius * 5;

const shapeArrow: VectorShapeImplementation = {
  draw(context, l, r) {
    const wing = (l * r) / wingRatio;
    context.moveTo(0, 0);
    context.lineTo(0, -l);
    context.moveTo(-wing, wing - l);
    context.lineTo(0, -l);
    context.lineTo(wing, wing - l);
  }
};

const shapeSpike: VectorShapeImplementation = {
  draw(context, l, r) {
    context.moveTo(-r, 0);
    context.lineTo(0, -l);
    context.lineTo(r, 0);
  }
};

const shapes = new Map<string, VectorShapeImplementation>([
  ["arrow", shapeArrow],
  ["spike", shapeSpike]
]);

function isShapeObject(value): value is VectorShapeImplementation {
  return value && typeof value.draw === "function";
}

function maybeShape(shape): VectorShapeImplementation {
  if (isShapeObject(shape)) return shape;
  const value = shapes.get(`${shape}`.toLowerCase());
  if (value) return value;
  throw new Error(`invalid shape: ${shape}`);
}

/** The vector mark. */
export class Vector extends Mark {
  r: number;
  length: any;
  rotate: any;
  shape: VectorShapeImplementation;
  anchor: "start" | "middle" | "end";
  frameAnchor: any;
  constructor(data: Data | null | undefined, options: VectorOptions = {}) {
    const {x, y, r = defaultRadius, length, rotate, shape = shapeArrow, anchor = "middle", frameAnchor} = options;
    const [vl, cl] = maybeNumberChannel(length, 12);
    const [vr, cr] = maybeNumberChannel(rotate, 0);
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        length: {value: vl, scale: "length", optional: true},
        rotate: {value: vr, optional: true}
      },
      options,
      defaults
    );
    this.r = +r;
    this.length = cl;
    this.rotate = cr;
    this.shape = maybeShape(shape);
    this.anchor = keyword(anchor, "anchor", ["start", "middle", "end"]);
    this.frameAnchor = maybeFrameAnchor(frameAnchor);
  }
  renderJSX(this: any, index, scales, channels, dimensions, _context): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, length: L, rotate: A} = channels;
    const {length, rotate, anchor, shape, r} = this;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const direct = directStyleProps(this);
    const paths = (index as number[]).map((i, k) => {
      const tx = X ? X[i] : cx;
      const ty = Y ? Y[i] : cy;
      const ang = A ? A[i] : rotate;
      const len = L ? L[i] : length;
      // The rotate clause turns on the presence of the rotate channel rather
      // than on its value, so a zero angle is written (vector.js:106-114
      // upstream); likewise the anchor translate is written for every anchor
      // but start, even when the length is zero.
      const rotationAttr = A || ang ? ` rotate(${ang})` : "";
      const anchorAttr = anchor === "start" ? "" : ` translate(0,${anchor === "end" ? len : len / 2})`;
      const t = `translate(${tx},${ty})${rotationAttr}${anchorAttr}`;
      const p = path();
      shape.draw(p as unknown as CanvasPath, len, r);
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const pathEl = h("path", {key: k, ...direct, ...channel, transform: t, d: `${p}`}, titled);
      return withHrefWrap(channels, this.target, i, pathEl);
    });
    return h("g", {...indirect, ...transform}, paths);
  }
}

/**
 * Returns a new vector mark for the given *data* and *options*. For example, to
 * create a vector field from spatial samples of wind observations:
 *
 * ```js
 * Plot.vector(wind, {x: "longitude", y: "latitude", length: "speed", rotate: "direction"})
 * ```
 *
 * If none of **frameAnchor**, **x**, and **y** are specified, then **x** and
 * **y** default to accessors assuming that *data* contains tuples [[*x₀*,
 * *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*], …]
 */
export function vector(data?: Data, options: VectorOptions = {}): Vector {
  let {x, y} = options;
  const {x: _x, y: _y, ...rest} = options;
  if (options.frameAnchor === undefined) [x, y] = maybeTuple(x, y);
  return new Vector(data, {...rest, x, y});
}

/**
 * Like vector, but **x** instead defaults to the identity function and **y**
 * defaults to null, assuming that *data* is an array of numbers [*x₀*, *x₁*,
 * *x₂*, …].
 */
export function vectorX(data?: Data, options: VectorOptions = {}): Vector {
  const {x = identity, ...rest} = options;
  return new Vector(data, {...rest, x});
}

/**
 * Like vector, but **y** instead defaults to the identity function and **x**
 * defaults to null, assuming that *data* is an array of numbers [*y₀*, *y₁*,
 * *y₂*, …].
 */
export function vectorY(data?: Data, options: VectorOptions = {}): Vector {
  const {y = identity, ...rest} = options;
  return new Vector(data, {...rest, y});
}

/**
 * Like vector, but with default *options* suitable for drawing a spike map. For
 * example, to show city populations:
 *
 * ```js
 * Plot.spike(cities, {x: "longitude", y: "latitude", stroke: "red", length: "population"})
 * ```
 */
export function spike(data?: Data, options: VectorOptions = {}): Vector {
  const {
    shape = shapeSpike,
    stroke = defaults.stroke,
    strokeWidth = 1,
    fill = stroke,
    fillOpacity = 0.3,
    anchor = "start",
    ...rest
  } = options;
  return vector(data, {...rest, shape, stroke, strokeWidth, fill, fillOpacity, anchor});
}
