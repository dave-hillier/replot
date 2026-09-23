// @ts-nocheck — JSDOM React tests for the select transform wrapper components.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {
  Replot,
  Text,
  selectFirst,
  selectLast,
  selectMinX,
  selectMinY,
  selectMaxX,
  selectMaxY
} from "../src/react/api.js";
import {
  SelectFirst,
  SelectLast,
  SelectMinX,
  SelectMinY,
  SelectMaxX,
  SelectMaxY
} from "../src/react/transforms/Select.js";

// Two series (via z) so each selector picks one point per series.
const readings = [
  {step: 1, value: 30, series: "a"},
  {step: 2, value: 10, series: "a"},
  {step: 3, value: 45, series: "a"},
  {step: 1, value: 25, series: "b"},
  {step: 2, value: 50, series: "b"},
  {step: 3, value: 15, series: "b"}
];

const channels = {x: "step", y: "value", z: "series", text: "series"};

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

// Every select wrapper follows the same shape, so assert equivalence of the
// nested form against the functional spread form for each pair.
function equivalenceTest(name, Wrapper, fn) {
  jsdomit(`<${name}> around <Text> matches the spread ${fn.name} form`, async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <Wrapper>
          <Text data={readings} {...channels} />
        </Wrapper>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Text data={readings} {...fn({...channels})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
}

describe("select transform wrapper equivalence", () => {
  equivalenceTest("SelectFirst", SelectFirst, selectFirst);
  equivalenceTest("SelectLast", SelectLast, selectLast);
  equivalenceTest("SelectMinX", SelectMinX, selectMinX);
  equivalenceTest("SelectMinY", SelectMinY, selectMinY);
  equivalenceTest("SelectMaxX", SelectMaxX, selectMaxX);
  equivalenceTest("SelectMaxY", SelectMaxY, selectMaxY);
});
