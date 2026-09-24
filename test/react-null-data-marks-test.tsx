// @ts-nocheck — JSDOM React tests: every data-accepting mark must tolerate
// data={null} (which yields a null index) without throwing and without drawing
// anything. See also react-geo-null-data-test.tsx for the projection variant
// that motivated the renderJSX null-index guards.
//
// "Without drawing anything" is asserted, not assumed: each case names the
// aria-label the mark renders its own group under, and the test checks that
// the group is there and that nothing datum-shaped was drawn inside it. The
// group is the load-bearing half. Upstream creates it before it looks at the
// index — a mark's render builds a <g> and only then runs a data-driven
// selection against the index — so a null index yields an empty group, and a
// mark that returned early instead would yield no group at all. Asserting only
// that an <svg> exists cannot tell those two apart, which is what this file
// used to do.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import * as Plot from "../src/index.ts";
import {
  Replot as PlotComponent,
  Arrow,
  BarX,
  BarY,
  Cell,
  Circle,
  DelaunayLink,
  DelaunayMesh,
  DifferenceY,
  Dot,
  DotX,
  DotY,
  Geo,
  Hexagon,
  Hull,
  Image,
  Line,
  LineX,
  LineY,
  LinearRegressionX,
  LinearRegressionY,
  Link,
  Raster,
  Rect,
  RectX,
  RectY,
  RuleX,
  RuleY,
  Spike,
  Text,
  TextX,
  TextY,
  TickX,
  TickY,
  Tip,
  Vector,
  VectorX,
  VectorY,
  VoronoiMesh
} from "../src/react/api.js";

/** Renders `node` into a fresh jsdom container and returns the <svg> it drew. */
async function renderSvg(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  await act(async () => {});
  const svg = container.querySelector("svg");
  assert.ok(svg, "expected an <svg>");
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return svg;
}

// What a mark draws per datum. A mark that draws nothing for a null index
// leaves every one of these counts at zero.
const GEOMETRY = "circle, rect, path, line, polyline, polygon, text, image, use";

/** Every element the named mark drew, in document order. Fails if a group is missing. */
function drawnByMark(root, ariaLabels) {
  return ariaLabels.flatMap((ariaLabel) => {
    const group = root.querySelector(`g[aria-label="${ariaLabel}"]`);
    assert.ok(group, `expected the mark to render a <g aria-label="${ariaLabel}">`);
    return Array.from(group.querySelectorAll(GEOMETRY)).map((element) => String(element.tagName).toLowerCase());
  });
}

// Null channel values must not reach scale-type inference (a separate,
// upstream-parity limitation), so every scale a mark might bind gets an
// explicit domain.
const scaleOptions = {
  x: {domain: [0, 1]},
  y: {domain: [0, 1]},
  r: {domain: [0, 1]},
  length: {domain: [0, 1]},
  opacity: {domain: [0, 1]},
  color: {domain: [0, 1]},
  symbol: {domain: ["circle"]}
};

// Arrow and link require their position channels at construction.
const linkChannels = {x1: [], y1: [], x2: [], y2: []};

// Excluded marks, and why:
// - frame, hexgrid, sphere, graticule: decoration marks that take no data and
//   legitimately render with a null index.
// - area/areaX/areaY, boxX/boxY, bollingerX/bollingerY, density, voronoi,
//   waffleX/waffleY: with null data these crash before renderJSX, in shared
//   transform or initializer code (stack, group, map, exclusiveFacets, the
//   density and waffle initializers) — identically to upstream Observable
//   Plot; the renderJSX guards under test here are never reached.
// - cellX/cellY: their default indexOf accessor makes inferChannelScale
//   iterate the (null) channel values during channel creation.
// - contour, auto, axes: reject null data (or no data) at construction.
//
// `ariaLabels` lists every group the mark renders under — differenceY is three
// marks composed, so it has three — and `draws` lists the elements the mark
// still draws for a null index. Every mark but raster draws none, so `draws`
// is omitted below except where it is not empty.
const cases = [
  {
    name: "arrow",
    Component: Arrow,
    props: linkChannels,
    ariaLabels: ["arrow"],
    mark: () => Plot.arrow(null, linkChannels)
  },
  {name: "barX", Component: BarX, ariaLabels: ["bar"], mark: () => Plot.barX(null)},
  {name: "barY", Component: BarY, ariaLabels: ["bar"], mark: () => Plot.barY(null)},
  {name: "cell", Component: Cell, ariaLabels: ["cell"], mark: () => Plot.cell(null)},
  {name: "circle", Component: Circle, ariaLabels: ["dot"], mark: () => Plot.circle(null)},
  {
    name: "delaunayLink",
    Component: DelaunayLink,
    ariaLabels: ["delaunay link"],
    mark: () => Plot.delaunayLink(null)
  },
  {
    name: "delaunayMesh",
    Component: DelaunayMesh,
    ariaLabels: ["delaunay mesh"],
    mark: () => Plot.delaunayMesh(null)
  },
  // The positive and negative areas are clipped areas whose clip path is built
  // from the same index, so an unguarded index here would render <path>s
  // through the clip transform; the third mark is differenceY's own difference
  // line, which upstream appends unconditionally (difference.js:84).
  {
    name: "differenceY",
    Component: DifferenceY,
    ariaLabels: ["positive difference", "negative difference", "line"],
    mark: () => Plot.differenceY(null)
  },
  {name: "dot", Component: Dot, ariaLabels: ["dot"], mark: () => Plot.dot(null)},
  {name: "dotX", Component: DotX, ariaLabels: ["dot"], mark: () => Plot.dotX(null)},
  {name: "dotY", Component: DotY, ariaLabels: ["dot"], mark: () => Plot.dotY(null)},
  {name: "geo", Component: Geo, ariaLabels: ["geo"], mark: () => Plot.geo(null)},
  {name: "hexagon", Component: Hexagon, ariaLabels: ["dot"], mark: () => Plot.hexagon(null)},
  {name: "hull", Component: Hull, ariaLabels: ["hull"], mark: () => Plot.hull(null)},
  {name: "image", Component: Image, ariaLabels: ["image"], mark: () => Plot.image(null)},
  {name: "line", Component: Line, ariaLabels: ["line"], mark: () => Plot.line(null)},
  {name: "lineX", Component: LineX, ariaLabels: ["line"], mark: () => Plot.lineX(null)},
  {name: "lineY", Component: LineY, ariaLabels: ["line"], mark: () => Plot.lineY(null)},
  {
    name: "linearRegressionX",
    Component: LinearRegressionX,
    ariaLabels: ["linear-regression"],
    mark: () => Plot.linearRegressionX(null)
  },
  {
    name: "linearRegressionY",
    Component: LinearRegressionY,
    ariaLabels: ["linear-regression"],
    mark: () => Plot.linearRegressionY(null)
  },
  {name: "link", Component: Link, props: linkChannels, ariaLabels: ["link"], mark: () => Plot.link(null, linkChannels)},
  {
    // The one mark that draws for a null index, and not a divergence: upstream
    // appends the raster's <image> outside any data-driven selection
    // (raster.js:157), so the grid it computed is painted whatever the index is
    // — with no fill channel that is the mark's own fill, over the whole
    // rectangle. Replot's renderJSX appends the same single <image>
    // (raster.ts:346). Pinning it at exactly one keeps the image honest: it is
    // drawn once for the grid, never once per datum.
    name: "raster",
    Component: Raster,
    props: {width: 2, height: 2},
    ariaLabels: ["raster"],
    draws: ["image"],
    mark: () => Plot.raster(null, {width: 2, height: 2})
  },
  {name: "rect", Component: Rect, ariaLabels: ["rect"], mark: () => Plot.rect(null)},
  {name: "rectX", Component: RectX, ariaLabels: ["rect"], mark: () => Plot.rectX(null)},
  {name: "rectY", Component: RectY, ariaLabels: ["rect"], mark: () => Plot.rectY(null)},
  {name: "ruleX", Component: RuleX, ariaLabels: ["rule"], mark: () => Plot.ruleX(null)},
  {name: "ruleY", Component: RuleY, ariaLabels: ["rule"], mark: () => Plot.ruleY(null)},
  {name: "spike", Component: Spike, ariaLabels: ["vector"], mark: () => Plot.spike(null)},
  {name: "text", Component: Text, ariaLabels: ["text"], mark: () => Plot.text(null)},
  {name: "textX", Component: TextX, ariaLabels: ["text"], mark: () => Plot.textX(null)},
  {name: "textY", Component: TextY, ariaLabels: ["text"], mark: () => Plot.textY(null)},
  {name: "tickX", Component: TickX, ariaLabels: ["tick"], mark: () => Plot.tickX(null)},
  {name: "tickY", Component: TickY, ariaLabels: ["tick"], mark: () => Plot.tickY(null)},
  {name: "tip", Component: Tip, ariaLabels: ["tip"], mark: () => Plot.tip(null)},
  {name: "vector", Component: Vector, ariaLabels: ["vector"], mark: () => Plot.vector(null)},
  {name: "vectorX", Component: VectorX, ariaLabels: ["vector"], mark: () => Plot.vectorX(null)},
  {name: "vectorY", Component: VectorY, ariaLabels: ["vector"], mark: () => Plot.vectorY(null)},
  {name: "voronoiMesh", Component: VoronoiMesh, ariaLabels: ["voronoi mesh"], mark: () => Plot.voronoiMesh(null)}
];

describe("marks with null data", () => {
  describe("imperative plot() renders the mark and draws no data", () => {
    for (const {name, mark, ariaLabels, draws = []} of cases) {
      jsdomit(name, async () => {
        const svg = Plot.plot({...scaleOptions, marks: [mark()]});
        assert.strictEqual(svg.nodeName.toLowerCase(), "svg");
        assert.deepStrictEqual(drawnByMark(svg, ariaLabels), draws);
      });
    }
  });

  describe("React mark with data={null} renders the mark and draws no data", () => {
    for (const {name, Component, props = {}, ariaLabels, draws = []} of cases) {
      jsdomit(name, async () => {
        const svg = await renderSvg(
          <PlotComponent {...scaleOptions} width={400} height={300}>
            <Component data={null} {...props} />
          </PlotComponent>
        );
        assert.deepStrictEqual(drawnByMark(svg, ariaLabels), draws);
      });
    }
  });
});
