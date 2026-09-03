import {group, pathRound as path, Delaunay} from "d3";
import type {ChannelValue, ChannelValueSpec} from "../channel.js";
import type {CurveOptions} from "../curve.js";
import {maybeCurve} from "../curve.js";
import {defined} from "../defined.js";
import type {Data, MarkOptions, RenderableMark} from "../mark.js";
import {Mark} from "../mark.js";
import type {MarkerOptions} from "../marker.js";
import {markers} from "../marker.js";
import {constant, maybeTuple, maybeZ} from "../options.js";
import {applyPosition} from "../projection.js";
import {applyFrameAnchor} from "../style.js";
import {basic, initializer} from "../transforms/basic.js";
import {exclusiveFacets} from "../transforms/exclusiveFacets.js";
import {maybeGroup} from "../transforms/group.js";
import {createElement as h, Fragment, type ReactNode} from "react";
import {markerToJSX} from "../react/Markers.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";

/** Options for the Delaunay marks. */
export interface DelaunayOptions extends MarkOptions, MarkerOptions, CurveOptions {
  /** The horizontal position channel, typically bound to the *x* scale. */
  x?: ChannelValueSpec;
  /** The vertical position channel, typically bound to the *y* scale. */
  y?: ChannelValueSpec;
  /** An optional ordinal channel for grouping to produce multiple (possibly overlapping) triangulations. */
  z?: ChannelValue;
}

const delaunayLinkDefaults = {
  ariaLabel: "delaunay link",
  fill: "none",
  stroke: "currentColor",
  strokeMiterlimit: 1
};

const delaunayMeshDefaults = {
  ariaLabel: "delaunay mesh",
  fill: null,
  stroke: "currentColor",
  strokeOpacity: 0.2
};

const hullDefaults = {
  ariaLabel: "hull",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeMiterlimit: 1
};

const voronoiDefaults = {
  ariaLabel: "voronoi",
  fill: "none",
  stroke: "currentColor",
  strokeMiterlimit: 1
};

const voronoiMeshDefaults = {
  ariaLabel: "voronoi mesh",
  fill: null,
  stroke: "currentColor",
  strokeOpacity: 0.2
};

// Mark base class lacks declared constructor in mark.d.ts; use a permissive alias.
const MarkBase = Mark as any;

class DelaunayLink extends MarkBase {
  curve: any;
  constructor(data: Data, options: any = {}) {
    const {x, y, z, curve, tension} = options;
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        z: {value: z, optional: true}
      },
      options,
      delaunayLinkDefaults
    );
    this.curve = maybeCurve(curve, tension);
    markers(this, options);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, z: Z} = channels;
    const {curve} = this;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const xi = X ? (i: number) => X[i] : constant(cx);
    const yi = Y ? (i: number) => Y[i] : constant(cy);
    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const direct = directStyleProps(this);
    const markerDefs = new Map<string, ReactNode>();
    const markerAttrsFor = (color: any) => {
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

    const buildLinks = (subIndex: any[]) => {
      let i = -1;
      const newIndex: number[] = [];
      const newChannels: any = {};
      for (const k in channels) newChannels[k] = [];
      const X1: number[] = [];
      const X2: number[] = [];
      const Y1: number[] = [];
      const Y2: number[] = [];

      function link(ti: number, tj: number) {
        ti = subIndex[ti];
        tj = subIndex[tj];
        newIndex.push(++i);
        X1[i] = xi(ti);
        Y1[i] = yi(ti);
        X2[i] = xi(tj);
        Y2[i] = yi(tj);
        for (const k in channels) newChannels[k].push(channels[k][tj]);
      }

      const {halfedges, hull, triangles} = Delaunay.from(subIndex, xi, yi);
      for (let i = 0; i < halfedges.length; ++i) {
        const j = halfedges[i];
        if (j > i) link(triangles[i], triangles[j]);
      }
      for (let i = 0; i < hull.length; ++i) {
        link(hull[i], hull[(i + 1) % hull.length]);
      }

      return newIndex.map((ni, k) => {
        const p = path();
        const c = curve(p);
        c.lineStart();
        c.point(X1[ni], Y1[ni]);
        c.point(X2[ni], Y2[ni]);
        c.lineEnd();
        const channel = channelStyleProps(ni, newChannels);
        const titled = withTitleChild(this, newChannels, ni, null);
        const color = newChannels.stroke ? newChannels.stroke[ni] : this.stroke;
        const markerAttrs = markerAttrsFor(color);
        const pathEl = h("path", {key: k, ...direct, ...channel, ...markerAttrs, d: `${p}`}, titled);
        return withHrefWrap(newChannels, this.target, ni, pathEl);
      });
    };

    let children: ReactNode;
    if (Z) {
      const groups = Array.from(group(index, (i: number) => Z[i]).values()) as any[];
      children = groups.map((sub, gi) => h("g", {key: gi}, buildLinks(sub)));
    } else {
      children = buildLinks(index);
    }
    const defs =
      markerDefs.size > 0
        ? h(
            "defs",
            {key: "__defs"},
            ...Array.from(markerDefs.entries()).map(([id, def]) => h(Fragment, {key: id}, def))
          )
        : null;
    return h("g", {...indirect, ...transform}, defs, children);
  }
}

class AbstractDelaunayMark extends MarkBase {
  constructor(data: Data, options: any = {}, defaults: any, zof: (options: any) => any = ({z}) => z) {
    const {x, y} = options;
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        z: {value: zof(options), optional: true}
      },
      options,
      defaults
    );
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash
    // (an empty triangulation would otherwise render a degenerate path).
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, z: Z} = channels;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const xi = X ? (i: number) => X[i] : constant(cx);
    const yi = Y ? (i: number) => Y[i] : constant(cy);
    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const direct = directStyleProps(this);

    const buildPath = (subIndex: any[], key: number) => {
      const delaunay = Delaunay.from(subIndex, xi, yi);
      const i = subIndex[0];
      const d = (this as any)._render(delaunay, dimensions);
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const pathEl = h("path", {key, ...direct, ...channel, d}, titled);
      return withHrefWrap(channels, this.target, i, pathEl);
    };

    let children: ReactNode;
    if (Z) {
      const groups = Array.from(group(index, (i: number) => Z[i]).values()) as any[];
      children = groups.map((sub, gi) => h("g", {key: gi}, buildPath(sub, 0)));
    } else {
      children = index.length ? buildPath(index, 0) : null;
    }
    return h("g", {...indirect, ...transform}, children);
  }
}

class DelaunayMesh extends AbstractDelaunayMark {
  constructor(data: Data, options: any = {}) {
    super(data, options, delaunayMeshDefaults);
    (this as any).fill = "none";
  }
  _render(delaunay: any) {
    return delaunay.render();
  }
}

class Hull extends AbstractDelaunayMark {
  constructor(data: Data, options: any = {}) {
    super(data, options, hullDefaults, maybeZ);
  }
  _render(delaunay: any) {
    return delaunay.renderHull();
  }
}

class Voronoi extends MarkBase {
  constructor(data: Data, options: any = {}) {
    const {x, y, z} = options;
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        z: {value: z, optional: true}
      },
      initializer(
        options,
        function (this: any, data: any, facets: any, channels: any, scales: any, dimensions: any, context: any) {
          let {x: X, y: Y, z: Z} = channels;
          ({x: X, y: Y} = applyPosition(channels, scales, context));
          Z = Z?.value;
          const C = new Array((X ?? Y).length).fill(null);
          const [cx, cy] = applyFrameAnchor(this, dimensions);
          const xi = X ? (i: number) => X[i] : constant(cx);
          const yi = Y ? (i: number) => Y[i] : constant(cy);
          for (let I of facets) {
            if (X) I = I.filter((i: number) => defined(xi(i)));
            if (Y) I = I.filter((i: number) => defined(yi(i)));
            for (const [, J] of maybeGroup(I, Z)) {
              const delaunay = Delaunay.from(J, xi, yi);
              const voronoi = voronoiof(delaunay, dimensions);
              for (let i = 0, n = J.length; i < n; ++i) {
                C[J[i]] = voronoi.renderCell(i);
              }
            }
          }
          return {data, facets, channels: {cells: {value: C}}};
        }
      ),
      voronoiDefaults
    );
  }
  renderJSX(this: any, index: any, scales: any, channels: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, cells: C} = channels;
    const indirect = indirectStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const direct = directStyleProps(this);
    const paths = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const pathEl = h("path", {key: k, ...direct, ...channel, d: C[i]}, titled);
      return withHrefWrap(channels, this.target, i, pathEl);
    });
    return h("g", {...indirect, ...transform}, paths);
  }
}

class VoronoiMesh extends AbstractDelaunayMark {
  constructor(data: Data, options: any) {
    super(data, options, voronoiMeshDefaults);
    (this as any).fill = "none";
  }
  _render(delaunay: any, dimensions: any) {
    return voronoiof(delaunay, dimensions).render();
  }
}

function voronoiof(delaunay: any, dimensions: any) {
  const {width, height, marginTop, marginRight, marginBottom, marginLeft} = dimensions;
  return delaunay.voronoi([marginLeft, marginTop, width - marginRight, height - marginBottom]);
}

function delaunayMark(DelaunayMark: any, data: Data, {x, y, ...options}: any = {}) {
  [x, y] = maybeTuple(x, y);
  return new DelaunayMark(data, {...options, x, y});
}

/**
 * Returns a mark that draws links for each edge of the Delaunay triangulation
 * of the points given by the **x** and **y** channels. Like the link mark,
 * except that **x1**, **y1**, **x2**, and **y2** are derived automatically from
 * **x** and **y**. When an aesthetic channel is specified (such as **stroke**
 * or **strokeWidth**), the link inherits the corresponding channel value from
 * one of its two endpoints arbitrarily.
 *
 * If **z** is specified, the input points are grouped by *z*, producing a
 * separate Delaunay triangulation for each group.
 */
export function delaunayLink(data?: Data, options?: DelaunayOptions): RenderableMark {
  return delaunayMark(DelaunayLink, data as Data, options);
}

/**
 * Returns a mark that draws a mesh of the Delaunay triangulation of the points
 * given by the **x** and **y** channels. The **stroke** option defaults to
 * _currentColor_, and the **strokeOpacity** defaults to 0.2; the **fill**
 * option is not supported. When an aesthetic channel is specified (such as
 * **stroke** or **strokeWidth**), the mesh inherits the corresponding channel
 * value from one of its constituent points arbitrarily.
 *
 * If **z** is specified, the input points are grouped by *z*, producing a
 * separate Delaunay triangulation for each group.
 */
export function delaunayMesh(data?: Data, options?: DelaunayOptions): RenderableMark {
  return delaunayMark(DelaunayMesh, data as Data, options);
}

/**
 * Returns a mark that draws a convex hull around the points given by the **x**
 * and **y** channels. The **stroke** option defaults to _currentColor_ and the
 * **fill** option defaults to _none_. When an aesthetic channel is specified
 * (such as **stroke** or **strokeWidth**), the hull inherits the corresponding
 * channel value from one of its constituent points arbitrarily.
 *
 * If **z** is specified, the input points are grouped by *z*, producing a
 * separate hull for each group. If **z** is not specified, it defaults to the
 * **fill** channel, if any, or the **stroke** channel, if any.
 */
export function hull(data?: Data, options?: DelaunayOptions): RenderableMark {
  return delaunayMark(Hull, data as Data, options);
}

/**
 * Returns a mark that draws polygons for each cell of the Voronoi tesselation
 * of the points given by the **x** and **y** channels.
 *
 * If **z** is specified, the input points are grouped by *z*, producing a
 * separate Voronoi tesselation for each group.
 */
export function voronoi(data?: Data, {x, y, initializer, ...options}: any = {}): RenderableMark {
  return delaunayMark(Voronoi, data as Data, {...basic({...options, x, y}, exclusiveFacets), initializer});
}

/**
 * Returns a mark that draws a mesh for the cell boundaries of the Voronoi
 * tesselation of the points given by the **x** and **y** channels. The
 * **stroke** option defaults to _currentColor_, and the **strokeOpacity**
 * defaults to 0.2. The **fill** option is not supported. When an aesthetic
 * channel is specified (such as **stroke** or **strokeWidth**), the mesh
 * inherits the corresponding channel value from one of its constituent points
 * arbitrarily.
 *
 * If **z** is specified, the input points are grouped by *z*, producing a
 * separate Voronoi tesselation for each group.
 */
export function voronoiMesh(data?: Data, options?: DelaunayOptions): RenderableMark {
  return delaunayMark(VoronoiMesh, data as Data, options);
}
