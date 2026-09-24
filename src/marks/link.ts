import {pathRound as path} from "d3";
import {createElement as h, Fragment, type ReactNode} from "react";
import {markerToJSX} from "../react/Markers.js";
import type {ChannelValueSpec} from "../channel.js";
import type {CurveAutoOptions} from "../curve.js";
import {maybeCurveAuto} from "../curve.js";
// @ts-expect-error — runtime export missing from curve.d.ts
import {curveAuto} from "../curve.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import type {MarkerOptions} from "../marker.js";
import {markers} from "../marker.js";
// @ts-expect-error — runtime export missing from options.d.ts
import {coerceNumbers} from "../options.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {withDatumIndex} from "../react/perDatum.js";

/** Options for the link mark. */
export interface LinkOptions extends MarkOptions, MarkerOptions, CurveAutoOptions {
  /**
   * The horizontal position, for vertical links; typically bound to the *x*
   * scale; shorthand for setting defaults for both **x1** and **x2**.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position, for horizontal links; typically bound to the *y*
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
   * The curve (interpolation) method for connecting adjacent points.
   *
   * Since a link has exactly two points, only the following curves (or a custom
   * curve) are recommended: *linear*, *step*, *step-after*, *step-before*,
   * *bump-x*, or *bump-y*. Note that the *linear* curve is incapable of showing
   * a fill since a straight line has zero area. For a curved link, use an arrow
   * mark with the **bend** option.
   *
   * If the plot uses a spherical **projection**, the default *auto* **curve**
   * will render links as geodesics; to draw a straight line instead, use the
   * *linear* **curve**.
   */
  curve?: CurveAutoOptions["curve"];
}

const defaults = {
  ariaLabel: "link",
  fill: "none",
  stroke: "currentColor",
  strokeMiterlimit: 1
};

/** The link mark. */
export class Link extends Mark {
  curve: any;
  constructor(data: Data | null | undefined, options: LinkOptions = {}) {
    const {x1, y1, x2, y2, curve, tension} = options;
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
    this.curve = maybeCurveAuto(curve, tension);
    markers(this, options);
  }
  project(channels, values, context) {
    // For the auto curve, projection is handled at render.
    if (this.curve !== curveAuto) {
      // @ts-expect-error — Mark.project missing from mark.d.ts
      super.project(channels, values, context);
    }
  }
  renderJSX(this: any, index, scales, channels, dimensions, context): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x1: X1, y1: Y1, x2: X2 = X1, y2: Y2 = Y1, stroke: S} = channels;
    const {curve} = this;
    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, scales);
    const direct = directStyleProps(this);
    const useSphere = curve === curveAuto && context.projection;
    const sphereD = useSphere ? sphereLink(context.path(), X1, Y1, X2, Y2) : null;
    const dOf = (i: number) => {
      if (useSphere) return sphereD!(i);
      const p = path();
      const c = curve(p);
      c.lineStart();
      c.point(X1[i], Y1[i]);
      c.point(X2[i], Y2[i]);
      c.lineEnd();
      return `${p}`;
    };
    const markerDefs = new Map<string, ReactNode>();
    const markerAttrs = (i: number) => {
      const color = S ? S[i] : this.stroke;
      const out: Record<string, string> = {};
      for (const [opt, attr] of [
        [this.markerStart, "markerStart"],
        [this.markerMid, "markerMid"],
        [this.markerEnd, "markerEnd"]
      ] as const) {
        if (!opt) continue;
        const m = markerToJSX(opt, color);
        if (!m) continue;
        if (!markerDefs.has(m.id)) markerDefs.set(m.id, m.defJSX);
        out[attr] = m.urlRef;
      }
      return out;
    };
    const paths = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const markers = markerAttrs(i);
      const titled = withTitleChild(this, channels, i, null);
      const pathEl = h("path", {key: k, ...direct, ...channel, ...markers, d: dOf(i)}, titled);
      return withDatumIndex(withHrefWrap(channels, this.target, i, pathEl), i);
    });
    const defs =
      markerDefs.size > 0
        ? h(
            "defs",
            {key: "__defs"},
            ...Array.from(markerDefs.entries()).map(([id, def]) => h(Fragment, {key: id}, def))
          )
        : null;
    return h("g", {...indirect, ...transform}, defs, ...paths);
  }
}

function sphereLink(path, X1, Y1, X2, Y2) {
  X1 = coerceNumbers(X1);
  Y1 = coerceNumbers(Y1);
  X2 = coerceNumbers(X2);
  Y2 = coerceNumbers(Y2);
  return (i) =>
    path({
      type: "LineString",
      coordinates: [
        [X1[i], Y1[i]],
        [X2[i], Y2[i]]
      ]
    });
}

/**
 * Returns a new link mark for the given *data* and *options*, drawing line
 * segments (curves) connecting pairs of points. For example, to draw a link
 * connecting an observation from 1980 with an observation from 2015 in a
 * scatterplot of population and revenue inequality of U.S. cities:
 *
 * ```js
 * Plot.link(inequality, {x1: "POP_1980", y1: "R90_10_1980", x2: "POP_2015", y2: "R90_10_2015"})
 * ```
 *
 * If the plot uses a spherical **projection**, the default *auto* **curve**
 * will render links as geodesics; to draw a straight line instead, use the
 * *linear* **curve**.
 */
export function link(data?: Data, {x, x1, x2, y, y1, y2, ...options}: LinkOptions = {}): Link {
  [x1, x2] = maybeSameValue(x, x1, x2);
  [y1, y2] = maybeSameValue(y, y1, y2);
  return new Link(data, {...options, x1, x2, y1, y2});
}

// If x1 and x2 are specified, return them as {x1, x2}.
// If x and x1 and specified, or x and x2 are specified, return them as {x1, x2}.
// If only x, x1, or x2 are specified, return it as {x1}.
export function maybeSameValue(x?, x1?, x2?) {
  if (x === undefined) {
    if (x1 === undefined) {
      if (x2 !== undefined) return [x2];
    } else {
      if (x2 === undefined) return [x1];
    }
  } else if (x1 === undefined) {
    return x2 === undefined ? [x] : [x, x2];
  } else if (x2 === undefined) {
    return [x, x1];
  }
  return [x1, x2];
}
