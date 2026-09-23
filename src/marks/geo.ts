import type {GeoPermissibleObjects} from "d3";
import {geoGraticule10} from "d3";
import type {ChannelValue, ChannelValueSpec} from "../channel.js";
import {negative, positive} from "../defined.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import {identity, maybeNumberChannel} from "../options.js";
import {createElement as h, type ReactNode} from "react";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {centroid} from "../transforms/centroid.js";
import {withDefaultSort} from "./dot.js";

/** Options for the geo mark. */
export interface GeoOptions extends MarkOptions {
  /**
   * A required channel for the geometry to render; defaults to identity,
   * assuming *data* is a GeoJSON object or an iterable of GeoJSON objects.
   */
  geometry?: ChannelValue;

  /**
   * In conjunction with the tip option, the horizontal position channel
   * specifying the tip’s anchor, typically bound to the *x* scale. If not
   * specified, defaults to the centroid of the projected geometry.
   */
  x?: ChannelValue;

  /**
   * In conjunction with the tip option, the vertical position channel
   * specifying the tip’s anchor, typically bound to the *y* scale. If not
   * specified, defaults to the centroid of the projected geometry.
   */
  y?: ChannelValue;

  /**
   * The size of Point and MultiPoint geometries, defaulting to a constant 3
   * pixels. If **r** is a number, it is interpreted as a constant radius in
   * pixels; otherwise it is interpreted as a channel and the effective radius
   * is controlled by the *r* scale, which defaults to a *sqrt* scale such that
   * the visual area of a point is proportional to its associated value.
   *
   * If **r** is a channel, geometries will be sorted by descending radius by
   * default, to limit occlusion; use the **sort** transform to control render
   * order. Geometries with a nonpositive radius are not drawn.
   */
  r?: ChannelValueSpec;
}

const defaults = {
  ariaLabel: "geo",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeMiterlimit: 1
};

/** The geo mark. */
export class Geo extends Mark {
  r: any;
  constructor(data: any, options: any = {}) {
    const [vr, cr] = maybeNumberChannel(options.r, 3);
    super(
      data,
      {
        x: {value: options.tip ? options.x : null, scale: "x", optional: true},
        y: {value: options.tip ? options.y : null, scale: "y", optional: true},
        r: {value: vr, scale: "r", filter: positive, optional: true},
        geometry: {value: options.geometry, scale: "projection"}
      },
      withDefaultSort(options),
      defaults
    );
    this.r = cr;
  }
  renderJSX(this: any, index: any, scales: any, channels: any, _dimensions: any, context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {geometry: G, r: R} = channels;
    const path = context.path();
    const {r} = this;
    if (negative(r)) index = [];
    else if (r !== undefined) path.pointRadius(r);
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, scales);
    const paths = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const d = (R ? path.pointRadius(R[i])(G[i]) : path(G[i])) ?? undefined;
      const pathEl = h("path", {key: k, ...direct, ...channel, d}, titled);
      return withHrefWrap(channels, this.target, i, pathEl);
    });
    return h("g", {...indirect, ...transform}, paths);
  }
}

/**
 * Returns a new geo mark with the given *data* and *options*. The **geometry**
 * channel, which defaults to the identity function assuming that *data* is a
 * GeoJSON object or an iterable of GeoJSON objects, is projected to the plane
 * using the plot’s top-level **projection**. For example, for a choropleth map
 * of county polygons with a *rate* property:
 *
 * ```js
 * Plot.geo(counties, {fill: (d) => d.properties.rate})
 * ```
 *
 * If *data* is a GeoJSON feature collection, then the mark’s data is
 * *data*.features; if *data* is a GeoJSON geometry collection, then the mark’s
 * data is *data*.geometries; if *data* is some other GeoJSON object, then the
 * mark’s data is the single-element array [*data*].
 */
export function geo(data?: Data | GeoPermissibleObjects, options: GeoOptions = {}): Geo {
  if (options.tip && options.x === undefined && options.y === undefined) options = centroid(options);
  else if (options.geometry === undefined) options = {...options, geometry: identity};
  return new Geo(data, options);
}

/**
 * Returns a new geo mark whose *data* is the outline of the sphere on the
 * projection’s plane. (For use with a spherical **projection** only.)
 */
export function sphere({strokeWidth = 1.5, ...options}: GeoOptions = {}): Geo {
  return geo({type: "Sphere"} as any, {strokeWidth, ...options});
}

/**
 * Returns a new geo mark whose *data* is a 10° global graticule. (For use with
 * a spherical **projection** only.) For more control, use [d3.geoGraticule][1]
 * with the geo mark.
 *
 * [1]: https://d3js.org/d3-geo/shape#geoGraticule
 */
export function graticule({strokeOpacity = 0.1, ...options}: GeoOptions = {}): Geo {
  return geo(geoGraticule10(), {strokeOpacity, ...options});
}
