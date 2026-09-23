import {blur2, contours, geoPath, max, min, nice, range, ticks, thresholdSturges} from "d3";
import {createElement as h, type ReactNode} from "react";
import type {ChannelValue} from "../channel.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
// @ts-expect-error — runtime export missing from channel.d.ts
import {createChannels} from "../channel.js";
import type {RangeInterval} from "../interval.js";
import type {Data} from "../mark.js";
// @ts-expect-error — runtime exports missing from options.d.ts
import {labelof, identity, arrayify, map} from "../options.js";
import {applyPosition} from "../projection.js";
// @ts-expect-error — runtime exports missing from style.d.ts
import {styles} from "../style.js";
import {initializer} from "../transforms/basic.js";
import type {Thresholds} from "../transforms/bin.js";
// @ts-expect-error — runtime export missing from transforms/bin.d.ts
import {maybeThresholds} from "../transforms/bin.js";
import type {RasterOptions, RasterSampler} from "./raster.js";
import {AbstractRaster, maybeTuples, rasterBounds, sampler} from "./raster.js";

/** Options for the contour mark. */
export interface ContourOptions extends Omit<RasterOptions, "interval" | "imageRendering"> {
  /**
   * Whether to apply linear interpolation after marching squares when computing
   * contour polygons; defaults to true. For smoother contours, see the **blur**
   * option.
   */
  smooth?: boolean;

  /**
   * The value can be specified as a channel based on the sample *data*, or as a
   * function *f*(*x*, *y*) to be evaluated at each pixel if the *data* is not
   * provided.
   */
  value?: ChannelValue | RasterSampler;

  /**
   * How to subdivide the domain into discrete level sets; defaults to *auto*.
   */
  thresholds?: Thresholds;

  /**
   * How to subdivide the domain into discrete level sets; a stricter
   * alternative to the **thresholds** option allowing the use of shorthand
   * numeric intervals.
   */
  interval?: RangeInterval;
}

const defaults = {
  ariaLabel: "contour",
  fill: "none",
  stroke: "currentColor",
  strokeMiterlimit: 1,
  pixelSize: 2
};

/** The contour mark. */
export class Contour extends AbstractRaster {
  contourChannels: any;
  smooth: boolean;
  constructor(data: any, {smooth = true, value, ...options}: any = {}) {
    const channels: any = styles({}, options, defaults);

    // If value is not specified explicitly, look for a channel to promote. If
    // more than one channel is present, throw an error. (To disambiguate,
    // specify the value option explicitly.)
    if (value === undefined) {
      for (const key in channels) {
        if (channels[key].value != null) {
          if (value !== undefined) throw new Error("ambiguous contour value");
          value = options[key];
          options[key] = "value";
        }
      }
    }

    // For any channel specified as the literal (contour threshold) "value"
    // (maybe because of the promotion above), propagate the label from the
    // original value definition.
    if (value != null) {
      const v = {transform: (D: any) => D.map((d: any) => d.value), label: labelof(value)};
      for (const key in channels) {
        if (options[key] === "value") {
          options[key] = v;
        }
      }
    }

    // If the data is null, then we’ll construct the raster grid by evaluating a
    // function for each point in a dense grid. The value channel is populated
    // by the sampler initializer, and hence is not passed to super to avoid
    // computing it before there’s data.
    if (data == null) {
      if (value == null) throw new Error("missing contour value");
      options = sampler("value", {value, ...options});
      value = null;
    }

    // Otherwise if data was provided, it represents a discrete set of spatial
    // samples (often a grid, but not necessarily). If no interpolation method
    // was specified, default to nearest.
    else {
      const {interpolate} = options;
      if (value === undefined) value = identity;
      if (interpolate === undefined) options.interpolate = "nearest";
    }

    // Wrap the options in our initializer that computes the contour geometries;
    // this runs after any other initializers (and transforms).
    super(data, {value: {value, optional: true}}, contourGeometry(options), defaults);

    // With the exception of the x, y, x1, y1, x2, y2, and value channels, this
    // mark’s channels are not evaluated on the initial data but rather on the
    // contour multipolygons generated in the initializer.
    const contourChannels: any = {geometry: {value: identity}};
    for (const key in (this as any).channels) {
      const channel = (this as any).channels[key];
      const {scale} = channel;
      if (scale === "x" || scale === "y" || key === "value") continue;
      contourChannels[key] = channel;
      delete (this as any).channels[key];
    }
    this.contourChannels = contourChannels;
    this.smooth = !!smooth;
  }
  filter(index: any, {x, y, value, ...channels}: any, values: any) {
    // Only filter channels constructed by the contourGeometry initializer; the
    // x, y, and value channels must be filtered by the initializer itself.
    // @ts-expect-error — Mark.filter missing from mark.d.ts
    return super.filter(index, channels, values);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {geometry: G} = channels;
    const path = geoPath();
    const indirect = indirectStyleProps(this, dimensions);
    const transform = transformProp(this, scales);
    const direct = directStyleProps(this);
    const children: ReactNode[] = [];
    for (const i of index) {
      const channel = channelStyleProps(i, channels);
      // The title channel is applied to each band’s own path rather than to the
      // enclosing group (as upstream’s applyChannelStyles does), so that
      // hovering a band shows that band’s value.
      const titled = withTitleChild(this, channels, i, null);
      const element: ReactNode = h("path", {key: i, ...direct, ...channel, d: path(G[i]) ?? undefined}, titled);
      children.push(withHrefWrap(channels, this.target, i, element));
    }
    return h("g", {...indirect, ...transform}, ...children);
  }
}

function contourGeometry({thresholds, interval, ...options}: any) {
  thresholds = maybeThresholds(thresholds, interval, thresholdSturges);
  return initializer(
    options,
    function (this: any, data: any, facets: any, channels: any, scales: any, dimensions: any, context: any) {
      const [x1, y1, x2, y2] = rasterBounds(channels, scales, dimensions, context);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const {pixelSize: k, width: w = Math.round(Math.abs(dx) / k), height: h = Math.round(Math.abs(dy) / k)} = this;
      const kx = w / dx;
      const ky = h / dy;
      const V = channels.value.value;
      const VV: any[] = []; // V per facet

      // Interpolate the raster grid, as needed.
      if (this.interpolate) {
        const {x: X, y: Y} = applyPosition(channels, scales, context);
        // Convert scaled (screen) coordinates to grid (canvas) coordinates.
        const IX = (map as any)(X, (x: any) => (x - x1) * kx, Float64Array);
        const IY = (map as any)(Y, (y: any) => (y - y1) * ky, Float64Array);
        // The contour mark normally skips filtering on x, y, and value, so here
        // we’re careful to use different names (0, 1, 2) when filtering.
        const ichannels = [channels.x, channels.y, channels.value];
        const ivalues = [IX, IY, V];
        for (const facet of facets) {
          const index = this.filter(facet, ichannels, ivalues);
          VV.push(this.interpolate(index, w, h, IX, IY, V));
        }
      }

      // Otherwise, chop up the existing dense raster grid into facets, if needed.
      // V must be a dense grid in projected coordinates; if there are multiple
      // facets, then V must be laid out vertically as facet 0, 1, 2… etc.
      else if (facets) {
        const n = w * h;
        const m = facets.length;
        for (let i = 0; i < m; ++i) VV.push(V.slice(i * n, i * n + n));
      } else {
        VV.push(V);
      }

      // Blur the raster grid, if desired.
      if (this.blur > 0) for (const V of VV) blur2({data: V, width: w, height: h}, this.blur);

      // Compute the contour thresholds.
      const T = maybeTicks(thresholds, V, ...finiteExtent(VV));
      if (T === null) throw new Error(`unsupported thresholds: ${thresholds}`);

      // Compute the (maybe faceted) contours.
      const {contour} = contours().size([w, h]).smooth(this.smooth);
      const contourData: any[] = [];
      const contourFacets: any[] = [];
      for (const V of VV) {
        contourFacets.push(range(contourData.length, contourData.push(...map(T, (t: any) => contour(V, t)))));
      }

      // Rescale the contour multipolygon from grid to screen coordinates.
      for (const {coordinates} of contourData) {
        for (const rings of coordinates) {
          for (const ring of rings) {
            for (const point of ring) {
              point[0] = point[0] / kx + x1;
              point[1] = point[1] / ky + y1;
            }
          }
        }
      }

      // Compute the deferred channels.
      return {
        data: contourData,
        facets: contourFacets,
        channels: createChannels(this.contourChannels, contourData)
      };
    }
  );
}

// Apply the thresholds interval, function, or count, and return an array of
// ticks. d3-contour unlike d3-array doesn’t pass the min and max automatically,
// so we do that here to normalize, and also so we can share consistent
// thresholds across facets. When an interval is used, note that the lowest
// threshold should be below (or equal) to the lowest value, or else some data
// will be missing.
function maybeTicks(thresholds: any, V: any, min: any, max: any) {
  if (typeof thresholds?.range === "function") return thresholds.range(thresholds.floor(min), max);
  if (typeof thresholds === "function") thresholds = thresholds(V, min, max);
  if (typeof thresholds !== "number") return arrayify(thresholds);
  const tz = ticks(...nice(min, max, thresholds), thresholds);
  while (tz[tz.length - 1] >= max) tz.pop();
  while (tz[1] < min) tz.shift();
  return tz;
}

/**
 * Returns a new contour mark, which creates contour polygons from spatial
 * samples.
 */
export function contour(data?: Data, options?: ContourOptions): Contour;
export function contour(options?: ContourOptions): Contour;
export function contour(): Contour {
  // eslint-disable-next-line prefer-rest-params
  return new Contour(...maybeTuples("value", ...(Array.from(arguments) as [any, any?])));
}

function finiteExtent(VV: any): [any, any] {
  return [min(VV, (V: any) => min(V, finite)), max(VV, (V: any) => max(V, finite))];
}

function finite(x: any) {
  return isFinite(x) ? x : NaN;
}
