// @ts-nocheck — JSDOM React tests for the centroid transform wrappers.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, Text, centroid, geoCentroid} from "../src/react/api.js";
import {Centroid, GeoCentroid} from "../src/react/transforms/Centroid.js";

const countries = [
  {
    type: "Feature",
    id: "a",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ]
      ]
    }
  },
  {
    type: "Feature",
    id: "b",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [20, 20],
          [30, 20],
          [30, 30],
          [20, 30],
          [20, 20]
        ]
      ]
    }
  }
];

const regions = countries.map((feature, i) => ({name: `r${i}`, shape: feature.geometry}));

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
  const markup = svg.outerHTML;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return markup;
}

// Each plot instance gets a unique generated class name; normalize it so the
// nested and spread renderings compare as equal strings.
function normalize(markup) {
  return markup.replace(/plot-[0-9a-f]+/g, "plot-x");
}

describe("centroid wrapper equivalence", () => {
  jsdomit("<Centroid> around <Text> matches the spread centroid form", async () => {
    const nested = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <Centroid>
          <Text data={countries} text="id" fill="blue" />
        </Centroid>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <Text data={countries} {...centroid({text: "id", fill: "blue"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<GeoCentroid> around <Text> matches the spread geoCentroid form", async () => {
    const nested = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <GeoCentroid>
          <Text data={countries} text="id" fill="red" />
        </GeoCentroid>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <Text data={countries} {...geoCentroid({text: "id", fill: "red"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<Centroid geometry> resolves a named geometry channel", async () => {
    const nested = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <Centroid geometry="shape">
          <Text data={regions} text="name" />
        </Centroid>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot projection="equirectangular" width={400} height={300}>
        <Text data={regions} {...centroid({geometry: "shape", text: "name"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});
