// @ts-nocheck — JSDOM React tests for marks with null data under a projection.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import * as Plot from "../src/index.ts";
import {Replot as PlotComponent, Geo} from "../src/react/api.js";

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

describe("geo mark with null data", () => {
  jsdomit("imperative plot() renders without throwing", async () => {
    const svg = Plot.plot({
      projection: "equirectangular",
      marks: [Plot.geo(null, {stroke: "red"}), Plot.sphere()]
    });
    assert.strictEqual(svg.nodeName.toLowerCase(), "svg");
  });

  jsdomit("<Geo data={null}> renders without throwing", async () => {
    const markup = await renderSvg(
      <PlotComponent projection="equirectangular" width={400} height={300}>
        <Geo data={null} stroke="red" />
      </PlotComponent>
    );
    assert.ok(markup, "expected an <svg>");
  });
});
