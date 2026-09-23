// @ts-nocheck — JSDOM React tests: every data-accepting mark must tolerate
// data={null} (which yields a null index) by rendering nothing, in both the
// React and imperative APIs. See also react-geo-null-data-test.tsx for the
// projection variant that motivated the renderJSX null-index guards.
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
  const markup = svg ? svg.outerHTML : null;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return markup;
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
const cases = [
  {name: "arrow", Component: Arrow, props: linkChannels, mark: () => Plot.arrow(null, linkChannels)},
  {name: "barX", Component: BarX, mark: () => Plot.barX(null)},
  {name: "barY", Component: BarY, mark: () => Plot.barY(null)},
  {name: "cell", Component: Cell, mark: () => Plot.cell(null)},
  {name: "circle", Component: Circle, mark: () => Plot.circle(null)},
  {name: "delaunayLink", Component: DelaunayLink, mark: () => Plot.delaunayLink(null)},
  {name: "delaunayMesh", Component: DelaunayMesh, mark: () => Plot.delaunayMesh(null)},
  {name: "differenceY", Component: DifferenceY, mark: () => Plot.differenceY(null)},
  {name: "dot", Component: Dot, mark: () => Plot.dot(null)},
  {name: "dotX", Component: DotX, mark: () => Plot.dotX(null)},
  {name: "dotY", Component: DotY, mark: () => Plot.dotY(null)},
  {name: "geo", Component: Geo, mark: () => Plot.geo(null)},
  {name: "hexagon", Component: Hexagon, mark: () => Plot.hexagon(null)},
  {name: "hull", Component: Hull, mark: () => Plot.hull(null)},
  {name: "image", Component: Image, mark: () => Plot.image(null)},
  {name: "line", Component: Line, mark: () => Plot.line(null)},
  {name: "lineX", Component: LineX, mark: () => Plot.lineX(null)},
  {name: "lineY", Component: LineY, mark: () => Plot.lineY(null)},
  {name: "linearRegressionX", Component: LinearRegressionX, mark: () => Plot.linearRegressionX(null)},
  {name: "linearRegressionY", Component: LinearRegressionY, mark: () => Plot.linearRegressionY(null)},
  {name: "link", Component: Link, props: linkChannels, mark: () => Plot.link(null, linkChannels)},
  {
    name: "raster",
    Component: Raster,
    props: {width: 2, height: 2},
    mark: () => Plot.raster(null, {width: 2, height: 2})
  },
  {name: "rect", Component: Rect, mark: () => Plot.rect(null)},
  {name: "rectX", Component: RectX, mark: () => Plot.rectX(null)},
  {name: "rectY", Component: RectY, mark: () => Plot.rectY(null)},
  {name: "ruleX", Component: RuleX, mark: () => Plot.ruleX(null)},
  {name: "ruleY", Component: RuleY, mark: () => Plot.ruleY(null)},
  {name: "spike", Component: Spike, mark: () => Plot.spike(null)},
  {name: "text", Component: Text, mark: () => Plot.text(null)},
  {name: "textX", Component: TextX, mark: () => Plot.textX(null)},
  {name: "textY", Component: TextY, mark: () => Plot.textY(null)},
  {name: "tickX", Component: TickX, mark: () => Plot.tickX(null)},
  {name: "tickY", Component: TickY, mark: () => Plot.tickY(null)},
  {name: "tip", Component: Tip, mark: () => Plot.tip(null)},
  {name: "vector", Component: Vector, mark: () => Plot.vector(null)},
  {name: "vectorX", Component: VectorX, mark: () => Plot.vectorX(null)},
  {name: "vectorY", Component: VectorY, mark: () => Plot.vectorY(null)},
  {name: "voronoiMesh", Component: VoronoiMesh, mark: () => Plot.voronoiMesh(null)}
];

describe("marks with null data", () => {
  describe("imperative plot() renders without throwing", () => {
    for (const {name, mark} of cases) {
      jsdomit(name, async () => {
        const svg = Plot.plot({...scaleOptions, marks: [mark()]});
        assert.strictEqual(svg.nodeName.toLowerCase(), "svg");
      });
    }
  });

  describe("React mark with data={null} renders without throwing", () => {
    for (const {name, Component, props = {}} of cases) {
      jsdomit(name, async () => {
        const markup = await renderSvg(
          <PlotComponent {...scaleOptions} width={400} height={300}>
            <Component data={null} {...props} />
          </PlotComponent>
        );
        assert.ok(markup, "expected an <svg>");
      });
    }
  });
});
