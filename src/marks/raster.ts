import {blurImage, Delaunay, randomLcg, rgb} from "d3";
import type {ChannelValueSpec} from "../channel.js";
import {valueObject} from "../channel.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
// @ts-expect-error — runtime exports missing from options.d.ts
import {map, first, second, third, isTuples, isNumeric, isTemporal, identity} from "../options.js";
import {maybeColorChannel, maybeNumberChannel} from "../options.js";
import {impliedString} from "../style.js";
import {directStyleProps, indirectStyleProps, offset as styleOffset, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {initializer} from "../transforms/basic.js";
import {createElement as h, Fragment, type ReactNode} from "react";

/**
 * The built-in spatial interpolation methods; one of:
 *
 * - *nearest* - assign each pixel to the closest sample’s value (Voronoi diagram)
 * - *barycentric* - apply barycentric interpolation over the Delaunay triangulation
 * - *random-walk* - apply a random walk from each pixel, stopping when near a sample
 */
export type RasterInterpolateName = "nearest" | "barycentric" | "random-walk";

/**
 * A spatial interpolation implementation function that receives samples’
 * positions and values and returns a flat array of *width*×*height* values.
 * *x*[*index*[0]] represents the *x*-position of the first sample,
 * *y*[*index*[0]] its *y*-position, and *value*[*index*[0]] its value (*e.g.*,
 * the observed height for a topographic map).
 */
export type RasterInterpolateFunction = (
  /** An array of numeric indexes into the channels *x*, *y*, *value*. */
  index: number[],
  /** The width of the raster grid in pixels; a positive integer. */
  width: number,
  /** The height of the raster grid in pixels; a positive integer. */
  height: number,
  /** An array of values representing the *x*-position of samples. */
  x: number[],
  /** An array of values representing the *y*-position of samples. */
  y: number[],
  /** An array of values representing the sample’s observed value. */
  values: any[]
) => any[];

/**
 * A spatial interpolation method; either a named built-in interpolation method,
 * or a custom interpolation function.
 */
export type RasterInterpolate = RasterInterpolateName | RasterInterpolateFunction;

/**
 * A source of pseudo-random numbers in [0, 1). The default source is seeded to
 * ensure reproducibility.
 */
export type RandomSource = () => number;

/**
 * A sampler function, which returns a value for the given *x* and *y* values in
 * the current *facet*.
 */
export type RasterSampler = (
  /** The horizontal position. */
  x: number,
  /** The vertical position. */
  y: number,
  /** The current facet index, and corresponding *fx* and *fy* value. */
  facet: number[] & {fx: any; fy: any}
) => any;

/** Options for the raster mark. */
export interface RasterOptions extends Omit<MarkOptions, "fill" | "fillOpacity"> {
  /** The horizontal position channel, typically bound to the *x* scale. */
  x?: ChannelValueSpec;
  /** The vertical position channel, typically bound to the *y* scale. */
  y?: ChannelValueSpec;

  /**
   * The starting horizontal position (typically the left edge) of the raster
   * domain; the lower bound of the *x* scale.
   *
   * If **width** is specified, defaults to 0; otherwise, if *data* is
   * specified, defaults to the frame’s left coordinate in *x*. If *data* is not
   * specified (as when **value** is a function of *x* and *y*), you must
   * specify **x1** explicitly.
   */
  x1?: number;

  /**
   * The ending horizontal position (typically the right edge) of the raster
   * domain; the upper bound of the *x* scale.
   *
   * If **width** is specified, defaults to **width**; otherwise, if *data* is
   * specified, defaults to the frame’s right coordinate in *x*. If *data* is
   * not specified (as when **value** is a function of *x* and *y*), you must
   * specify **x2** explicitly.
   */
  x2?: number;

  /**
   * The starting vertical position (typically the bottom edge) of the raster
   * domain; the lower bound of the *y* scale.
   *
   * If **height** is specified, defaults to 0; otherwise, if *data* is
   * specified, defaults to the frame’s top coordinate in *y*. If *data* is not
   * specified (as when **value** is a function of *x* and *y*), you must
   * specify **y1** explicitly.
   */
  y1?: number;

  /**
   * The ending vertical position (typically the bottom edge) of the raster
   * domain; the lower bound of the *y* scale.
   *
   * If **height** is specified, defaults to **height**; otherwise, if *data* is
   * specified, defaults to the frame’s bottom coordinate in *y*. If *data* is
   * not specified (as when **value** is a function of *x* and *y*), you must
   * specify **y2** explicitly.
   */
  y2?: number;

  /** The width (number of columns) of the raster grid, in actual pixels. */
  width?: number;

  /** The height (number of rows) of the raster grid, in actual pixels. */
  height?: number;

  /**
   * The effective screen size of a raster pixel, used to determine the height
   * and width of the raster from the frame’s dimensions; defaults to 1.
   */
  pixelSize?: number;

  /**
   * A non-negative pixel radius for smoothing; defaults to 0. Note that
   * blurring is applied on the values (before the color scale is applied) if
   * quantitative, and after (on the materialized pixels), if ordinal.
   */
  blur?: number;

  /**
   * The spatial interpolation method, when using *data* samples. One of:
   *
   * - *none* (or null, default) - assign each sample to the containing pixel
   * - a named interpolation method, such as *nearest*, *barycentric*, or *random-walk*
   * - a custom interpolation function
   */
  interpolate?: RasterInterpolate | "none" | null;

  /**
   * The [image-rendering attribute][1]; defaults to *auto* (bilinear). The
   * option may be set to *pixelated* to disable bilinear interpolation for a
   * sharper image; however, note that this is not supported in WebKit.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/image-rendering
   */
  imageRendering?: string;

  /**
   * The fill, typically bound to the *color* scale. Can be specified as a
   * constant, a channel based on the sample *data*, or as a function *f*(*x*,
   * *y*) to be evaluated at each pixel if the *data* is not provided.
   */
  fill?: ChannelValueSpec | RasterSampler;

  /**
   * The opacity, typically bound to the *opacity* scale. Can be specified as a
   * constant, a channel based on the sample *data*, or as a function *f*(*x*,
   * *y*) to be evaluated at each pixel if the *data* is not provided.
   */
  fillOpacity?: ChannelValueSpec | RasterSampler;
}

const defaults = {
  ariaLabel: "raster",
  stroke: null,
  pixelSize: 1
};

function number(input: any, name: string): number {
  const x = +input;
  if (isNaN(x)) throw new Error(`invalid ${name}: ${input}`);
  return x;
}

function integer(input: any, name: string): number {
  const x = Math.floor(input);
  if (isNaN(x)) throw new Error(`invalid ${name}: ${input}`);
  return x;
}

export class AbstractRaster extends Mark {
  width: any;
  height: any;
  pixelSize: any;
  blur: any;
  interpolate: any;
  constructor(data: any, channels: any, options: any = {}, defaults: any) {
    let {
      width,
      height,
      x,
      y,
      x1 = x == null ? 0 : undefined,
      y1 = y == null ? 0 : undefined,
      x2 = x == null ? width : undefined,
      y2 = y == null ? height : undefined
    } = options;
    const {pixelSize = defaults.pixelSize, blur = 0, interpolate} = options;
    if (width != null) width = integer(width, "width");
    if (height != null) height = integer(height, "height");
    // These represent the (minimum) bounds of the raster; they are not
    // evaluated for each datum. Also, if x and y are not specified explicitly,
    // then these bounds are used to compute the dense linear grid.
    if (x1 != null) x1 = number(x1, "x1");
    if (y1 != null) y1 = number(y1, "y1");
    if (x2 != null) x2 = number(x2, "x2");
    if (y2 != null) y2 = number(y2, "y2");
    if (x == null && (x1 == null || x2 == null)) throw new Error("missing x");
    if (y == null && (y1 == null || y2 == null)) throw new Error("missing y");
    if (data != null && width != null && height != null) {
      // If x and y are not given, assume the data is a dense array of samples
      // covering the entire grid in row-major order. These defaults allow
      // further shorthand where x and y represent grid column and row index.
      // TODO If we know that the x and y scales are linear, then we could avoid
      // materializing these columns to improve performance.
      if (x === undefined && x1 != null && x2 != null) x = denseX(x1, x2, width);
      if (y === undefined && y1 != null && y2 != null) y = denseY(y1, y2, width, height);
    }
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        x1: {value: x1 == null ? null : [x1], scale: "x", optional: true, filter: null},
        y1: {value: y1 == null ? null : [y1], scale: "y", optional: true, filter: null},
        x2: {value: x2 == null ? null : [x2], scale: "x", optional: true, filter: null},
        y2: {value: y2 == null ? null : [y2], scale: "y", optional: true, filter: null},
        ...channels
      },
      options,
      defaults
    );
    this.width = width;
    this.height = height;
    this.pixelSize = number(pixelSize, "pixelSize");
    this.blur = number(blur, "blur");
    this.interpolate = x == null || y == null ? null : maybeInterpolate(interpolate); // interpolation requires x & y
  }
}

/** The raster mark. */
export class Raster extends AbstractRaster {
  imageRendering: any;
  constructor(data: any, options: any = {}) {
    const {imageRendering} = options;
    if (data == null) {
      const {fill, fillOpacity} = options;
      if (maybeNumberChannel(fillOpacity)[0] !== undefined) options = sampler("fillOpacity", options);
      if (maybeColorChannel(fill)[0] !== undefined) options = sampler("fill", options);
    }
    super(data, undefined, options, defaults);
    this.imageRendering = impliedString(imageRendering, "auto");
  }
  // Ignore the color scale, so the fill channel is returned unscaled.
  scale(channels: any, {color, ...scales}: any, context: any) {
    // @ts-expect-error — Mark.scale missing from mark.d.ts
    return super.scale(channels, scales, context);
  }
  renderJSX(this: any, index: any, scales: any, values: any, dimensions: any, context: any): ReactNode {
    const color = scales[values.channels.fill?.scale] ?? ((x: any) => x);
    const {x: X, y: Y} = values;
    const {document} = context;
    const [x1, y1, x2, y2] = renderBounds(values, dimensions, context);
    const dx = x2 - x1;
    const dy = y2 - y1;
    // NB: do not name the height `h`; it would shadow the `createElement as h`
    // import used to build the JSX elements below.
    const {pixelSize: k, width: w = Math.round(Math.abs(dx) / k), height: rh = Math.round(Math.abs(dy) / k)} = this;
    const n = w * rh;

    let {fill: F, fillOpacity: FO} = values;
    let offset = 0;
    if (this.interpolate) {
      const kx = w / dx;
      const ky = rh / dy;
      const IX = (map as any)(X, (x: any) => (x - x1) * kx, Float64Array);
      const IY = (map as any)(Y, (y: any) => (y - y1) * ky, Float64Array);
      if (F) F = this.interpolate(index, w, rh, IX, IY, F);
      if (FO) FO = this.interpolate(index, w, rh, IX, IY, FO);
    } else if ((this as any).data == null && index) offset = index.fi * n;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = rh;
    const context2d = canvas.getContext("2d");
    const image = context2d.createImageData(w, rh);
    const imageData = image.data;
    // rgba is the parsed fill color, including its own alpha (e.g. an
    // rgba(…) string carrying per-pixel opacity); `a` is the mark-level
    // fillOpacity baseline (or, if present, the per-pixel fillOpacity
    // channel). The final pixel alpha composes the color's own opacity with
    // `a`, matching observablehq-plot's `rgba[3] * a`.
    let rgba = rgb((this as any).fill ?? "black");
    let a = (this as any).fillOpacity ?? 1;
    for (let i = 0; i < n; ++i) {
      const j = i << 2;
      if (F) {
        const fi = color(F[i + offset]);
        if (fi == null) {
          imageData[j + 3] = 0;
          continue;
        }
        rgba = rgb(fi);
      }
      if (FO) a = FO[i + offset];
      imageData[j + 0] = rgba.r;
      imageData[j + 1] = rgba.g;
      imageData[j + 2] = rgba.b;
      imageData[j + 3] = (rgba.opacity ?? 1) * a * 255;
    }
    if (this.blur > 0) blurImage(image, this.blur);
    context2d.putImageData(image, 0, 0);

    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    // The fill/fillOpacity channels are consumed into the canvas pixels above;
    // the <image> takes only direct (mark-level) styles, matching the
    // imperative applyDirectStyles (no applyChannelStyles).
    const transform = transformProp(this, scales, styleOffset, styleOffset);
    const imageRendering = this.imageRendering != null ? {"image-rendering": this.imageRendering} : {};
    let imageEl: ReactNode = h("image", {
      transform: `translate(${x1},${y1}) scale(${Math.sign(x2 - x1)},${Math.sign(y2 - y1)})`,
      width: Math.abs(dx),
      height: Math.abs(dy),
      preserveAspectRatio: "none",
      ...imageRendering,
      ...direct,
      xlinkHref: canvas.toDataURL()
    });
    const titled = withTitleChild(this, values, 0, null);
    if (titled) imageEl = h(Fragment, null, imageEl, titled);
    imageEl = withHrefWrap(values, this.target, 0, imageEl);
    return h("g", {...indirect, ...transform}, imageEl);
  }
}

export function maybeTuples(k: any, data: any, options?: any): [any, any] {
  if (arguments.length < 3) (options = data), (data = null);
  let {x, y, [k]: z} = options;
  const {x: _x, y: _y, [k]: _z, ...rest} = options;
  // Because we use implicit x and y when z is a function of (x, y), and when
  // data is a dense grid, we must further disambiguate by testing whether data
  // contains [x, y, z?] tuples. Hence you can’t use this shorthand with a
  // transform that lazily generates tuples, but that seems reasonable since
  // this is just for convenience anyway.
  if (x === undefined && y === undefined && isTuples(data)) {
    (x = first), (y = second);
    if (z === undefined) z = third;
  }
  return [data, {...rest, x, y, [k]: z}];
}

/**
 * Returns a raster mark which renders a raster image from spatial samples. If
 * *data* is provided, it represents discrete samples in abstract coordinates
 * **x** and **y**; the **fill** and **fillOpacity** channels specify further
 * abstract values (_e.g._, height in a topographic map) to be spatially
 * interpolated to produce an image.
 */
export function raster(data?: Data, options?: RasterOptions): Raster;
export function raster(options?: RasterOptions): Raster;
export function raster(): Raster {
  // eslint-disable-next-line prefer-rest-params
  const [data, options] = maybeTuples("fill", ...(Array.from(arguments) as [any, any?]));
  return new Raster(
    data,
    data == null || options.fill !== undefined || options.fillOpacity !== undefined
      ? options
      : {...options, fill: identity}
  );
}

// See rasterBounds; this version is called during render.
function renderBounds({x1, y1, x2, y2}: any, dimensions: any, {projection}: any): [number, number, number, number] {
  const {width, height, marginTop, marginRight, marginBottom, marginLeft} = dimensions;
  return [
    x1 && projection == null ? x1[0] : marginLeft,
    y1 && projection == null ? y1[0] : marginTop,
    x2 && projection == null ? x2[0] : width - marginRight,
    y2 && projection == null ? y2[0] : height - marginBottom
  ];
}

// If x1, y1, x2, y2 were specified, and no projection is in use (and thus the
// raster grid is necessarily an axis-aligned rectangle), then we can compute
// tighter bounds for the image, improving resolution.
export function rasterBounds({x1, y1, x2, y2}: any, scales: any, dimensions: any, context: any) {
  const channels: any = {};
  if (x1) channels.x1 = x1;
  if (y1) channels.y1 = y1;
  if (x2) channels.x2 = x2;
  if (y2) channels.y2 = y2;
  return renderBounds(valueObject(channels, scales), dimensions, context);
}

// Evaluates the function with the given name, if it exists, on the raster grid,
// generating a channel of the same name.
export function sampler(name: string, options: any = {}) {
  const {[name]: value} = options;
  if (typeof value !== "function") throw new Error(`invalid ${name}: not a function`);
  return initializer(
    {...options, [name]: undefined},
    function (this: any, data: any, facets: any, channels: any, scales: any, dimensions: any, context: any) {
      const {x, y} = scales;
      // TODO Allow projections, if invertible.
      if (!x) throw new Error("missing scale: x");
      if (!y) throw new Error("missing scale: y");
      const [x1, y1, x2, y2] = rasterBounds(channels, scales, dimensions, context);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const {pixelSize: k} = this;
      // Note: this must exactly match the defaults in render above!
      const {width: w = Math.round(Math.abs(dx) / k), height: h = Math.round(Math.abs(dy) / k)} = options;
      // TODO Hint to use a typed array when possible?
      const V = new Array(w * h * (facets ? facets.length : 1));
      const kx = dx / w;
      const ky = dy / h;
      let i = 0;
      for (const facet of facets ?? [undefined]) {
        for (let yi = 0.5; yi < h; ++yi) {
          for (let xi = 0.5; xi < w; ++xi, ++i) {
            V[i] = value(x.invert(x1 + xi * kx), y.invert(y1 + yi * ky), facet);
          }
        }
      }
      return {data: V, facets, channels: {[name]: {value: V, scale: "auto"}}};
    }
  );
}

function maybeInterpolate(interpolate: any): RasterInterpolateFunction | null {
  if (typeof interpolate === "function") return interpolate;
  if (interpolate == null) return interpolateNone;
  switch (`${interpolate}`.toLowerCase()) {
    case "none":
      return interpolateNone;
    case "nearest":
      return interpolateNearest;
    case "barycentric":
      return interpolatorBarycentric();
    case "random-walk":
      return interpolatorRandomWalk();
  }
  throw new Error(`invalid interpolate: ${interpolate}`);
}

/**
 * Applies a simple forward mapping of samples, binning them into pixels in the
 * raster grid without any blending or interpolation. If multiple samples map to
 * the same pixel, the last one wins; this can introduce bias if the points are
 * not in random order, so use Plot.shuffle to randomize the input if needed.
 */
export function interpolateNone(index: any, width: any, height: any, X: any, Y: any, V: any) {
  const W = new Array(width * height);
  for (const i of index) {
    if (X[i] < 0 || X[i] >= width || Y[i] < 0 || Y[i] >= height) continue;
    W[Math.floor(Y[i]) * width + Math.floor(X[i])] = V[i];
  }
  return W;
}

/**
 * Constructs a Delaunay triangulation of the samples, and then for each pixel
 * in the raster grid, determines the triangle that covers the pixel’s centroid
 * and interpolates the values associated with the triangle’s vertices using
 * barycentric coordinates.
 */
export function interpolatorBarycentric({
  random = randomLcg(42)
}: {random?: RandomSource} = {}): RasterInterpolateFunction {
  return (index, width, height, X, Y, V) => {
    // Interpolate the interior of all triangles with barycentric coordinates
    const {points, triangles, hull} = Delaunay.from(
      index,
      (i: any) => X[i],
      (i: any) => Y[i]
    );
    const W = new (V as any).constructor(width * height).fill(NaN);
    const S = new Uint8Array(width * height); // 1 if pixel has been seen.
    const mix = mixer(V, random);

    for (let i = 0; i < triangles.length; i += 3) {
      const ta = triangles[i];
      const tb = triangles[i + 1];
      const tc = triangles[i + 2];
      const Ax = points[2 * ta];
      const Bx = points[2 * tb];
      const Cx = points[2 * tc];
      const Ay = points[2 * ta + 1];
      const By = points[2 * tb + 1];
      const Cy = points[2 * tc + 1];
      const x1 = Math.min(Ax, Bx, Cx);
      const x2 = Math.max(Ax, Bx, Cx);
      const y1 = Math.min(Ay, By, Cy);
      const y2 = Math.max(Ay, By, Cy);
      const z = (By - Cy) * (Ax - Cx) + (Ay - Cy) * (Cx - Bx);
      if (!z) continue;
      const va = V[index[ta]];
      const vb = V[index[tb]];
      const vc = V[index[tc]];
      for (let x = Math.floor(x1); x < x2; ++x) {
        for (let y = Math.floor(y1); y < y2; ++y) {
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          const xp = x + 0.5; // sample pixel centroids
          const yp = y + 0.5;
          const s = Math.sign(z);
          const ga = (By - Cy) * (xp - Cx) + (yp - Cy) * (Cx - Bx);
          if (ga * s < 0) continue;
          const gb = (Cy - Ay) * (xp - Cx) + (yp - Cy) * (Ax - Cx);
          if (gb * s < 0) continue;
          const gc = z - (ga + gb);
          if (gc * s < 0) continue;
          const i = x + width * y;
          W[i] = mix(va, ga / z, vb, gb / z, vc, gc / z, x, y);
          S[i] = 1;
        }
      }
    }
    extrapolateBarycentric(W, S, X, Y, V, width, height, hull, index, mix);
    return W;
  };
}

// Extrapolate by finding the closest point on the hull.
function extrapolateBarycentric(
  W: any,
  S: any,
  X: any,
  Y: any,
  V: any,
  width: any,
  height: any,
  hull: any,
  index: any,
  mix: any
) {
  X = Float64Array.from(hull, (i: any) => X[index[i]]);
  Y = Float64Array.from(hull, (i: any) => Y[index[i]]);
  V = Array.from(hull, (i: any) => V[index[i]]);
  const n = X.length;
  const rays = Array.from({length: n}, (_, j) => ray(j, X, Y));
  let k = 0;
  for (let y = 0; y < height; ++y) {
    const yp = y + 0.5;
    for (let x = 0; x < width; ++x) {
      const i = x + width * y;
      if (!S[i]) {
        const xp = x + 0.5;
        for (let l = 0; l < n; ++l) {
          const j = (n + k + (l % 2 ? (l + 1) / 2 : -l / 2)) % n;
          if (rays[j](xp, yp)) {
            const t = segmentProject(X.at(j - 1), Y.at(j - 1), X[j], Y[j], xp, yp);
            W[i] = mix(V.at(j - 1), t, V[j], 1 - t, V[j], 0, x, y);
            k = j;
            break;
          }
        }
      }
    }
  }
}

// Projects a point p = [x, y] onto the line segment [p1, p2], returning the
// projected coordinates p’ as t in [0, 1] with p’ = t p1 + (1 - t) p2.
function segmentProject(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = dx * (x2 - x) + dy * (y2 - y);
  const b = dx * (x - x1) + dy * (y - y1);
  return a > 0 && b > 0 ? a / (a + b) : +(a > b);
}

function cross(xa: number, ya: number, xb: number, yb: number) {
  return xa * yb - xb * ya;
}

function ray(j: number, X: any, Y: any) {
  const n = X.length;
  const xc = X.at(j - 2);
  const yc = Y.at(j - 2);
  const xa = X.at(j - 1);
  const ya = Y.at(j - 1);
  const xb = X[j];
  const yb = Y[j];
  const xd = X.at(j + 1 - n);
  const yd = Y.at(j + 1 - n);
  const dxab = xa - xb;
  const dyab = ya - yb;
  const dxca = xc - xa;
  const dyca = yc - ya;
  const dxbd = xb - xd;
  const dybd = yb - yd;
  const hab = Math.hypot(dxab, dyab);
  const hca = Math.hypot(dxca, dyca);
  const hbd = Math.hypot(dxbd, dybd);
  return (x: number, y: number) => {
    const dxa = x - xa;
    const dya = y - ya;
    const dxb = x - xb;
    const dyb = y - yb;
    return (
      cross(dxa, dya, dxb, dyb) > -1e-6 &&
      cross(dxa, dya, dxab, dyab) * hca - cross(dxa, dya, dxca, dyca) * hab > -1e-6 &&
      cross(dxb, dyb, dxbd, dybd) * hab - cross(dxb, dyb, dxab, dyab) * hbd <= 0
    );
  };
}

/**
 * Assigns each pixel in the raster grid the value of the closest sample;
 * effectively a Voronoi diagram.
 */
export function interpolateNearest(index: any, width: any, height: any, X: any, Y: any, V: any) {
  const W = new (V as any).constructor(width * height);
  const delaunay = Delaunay.from(
    index,
    (i: any) => X[i],
    (i: any) => Y[i]
  );
  // memoization of delaunay.find for the line start (iy) and pixel (ix)
  let iy: any, ix: any;
  for (let y = 0.5, k = 0; y < height; ++y) {
    ix = iy;
    for (let x = 0.5; x < width; ++x, ++k) {
      ix = delaunay.find(x, y, ix);
      if (x === 0.5) iy = ix;
      W[k] = V[index[ix]];
    }
  }
  return W;
}

/**
 * For each pixel in the raster grid, initiates a random walk, stopping when
 * either the walk is within a given distance (**minDistance**) of a sample or
 * the maximum allowable number of steps (**maxSteps**) have been taken.
 */
export function interpolatorRandomWalk({
  random = randomLcg(42),
  minDistance = 0.5,
  maxSteps = 2
}: {random?: RandomSource; minDistance?: number; maxSteps?: number} = {}): RasterInterpolateFunction {
  return (index, width, height, X, Y, V) => {
    const W = new (V as any).constructor(width * height);
    const delaunay = Delaunay.from(
      index,
      (i: any) => X[i],
      (i: any) => Y[i]
    );
    // memoization of delaunay.find for the line start (iy), pixel (ix), and wos step (iw)
    let iy: any, ix: any, iw: any;
    for (let y = 0.5, k = 0; y < height; ++y) {
      ix = iy;
      for (let x = 0.5; x < width; ++x, ++k) {
        let cx = x;
        let cy = y;
        iw = ix = delaunay.find(cx, cy, ix);
        if (x === 0.5) iy = ix;
        let distance; // distance to closest sample
        let step = 0; // count of steps for this walk
        while ((distance = Math.hypot(X[index[iw]] - cx, Y[index[iw]] - cy)) > minDistance && step < maxSteps) {
          const angle = (random as any)(x, y, step) * 2 * Math.PI;
          cx += Math.cos(angle) * distance;
          cy += Math.sin(angle) * distance;
          iw = delaunay.find(cx, cy, iw);
          ++step;
        }
        W[k] = V[index[iw]];
      }
    }
    return W;
  };
}

function blend(a: number, ca: number, b: number, cb: number, c: number, cc: number) {
  return ca * a + cb * b + cc * c;
}

function pick(random: any) {
  return (a: any, ca: number, b: any, cb: number, c: any, cc: number, x: number, y: number) => {
    const u = random(x, y);
    return u < ca ? a : u < ca + cb ? b : c;
  };
}

function mixer(F: any, random: any) {
  return isNumeric(F) || isTemporal(F) ? blend : pick(random);
}

function denseX(x1: number, x2: number, width: number) {
  return {
    transform(data: any) {
      const n = data.length;
      const X = new Float64Array(n);
      const kx = (x2 - x1) / width;
      const x0 = x1 + kx / 2;
      for (let i = 0; i < n; ++i) X[i] = (i % width) * kx + x0;
      return X;
    }
  };
}

function denseY(y1: number, y2: number, width: number, height: number) {
  return {
    transform(data: any) {
      const n = data.length;
      const Y = new Float64Array(n);
      const ky = (y2 - y1) / height;
      const y0 = y1 + ky / 2;
      for (let i = 0; i < n; ++i) Y[i] = (Math.floor(i / width) % height) * ky + y0;
      return Y;
    }
  };
}
