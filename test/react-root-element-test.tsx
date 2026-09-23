// @ts-nocheck — JSDOM React tests for the plot's root <svg>: what it carries as
// React props, and the API it exposes on the element itself.
//
// Both are things the React path used to do by reaching into the node from a
// ref callback: adding a class the <svg> already had as a prop, merging the
// plot's style option onto element.style (so a key dropped from the option
// stayed applied forever), and assigning the raw scales object where upstream
// exposes a lookup function.
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, Dot} from "../src/react/index.js";

const data = [
  {x: 1, y: 2},
  {x: 2, y: 3},
  {x: 3, y: 1}
];

async function mount(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  return {
    container,
    render: async (next) => {
      await act(async () => root.render(next));
      await act(async () => {});
    },
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    }
  };
}

function plotWith(props) {
  return (
    <Replot width={200} height={200} {...props}>
      <Dot data={data} x="x" y="y" />
    </Replot>
  );
}

describe("the plot's root <svg>", () => {
  // Upstream's plot() sets figure.scale = exposeScales(…) (plot.js:343), so the
  // root element's `scale` is a lookup function — plot.scale("x") — that throws
  // on an unknown scale name. The React path assigned the raw scale map
  // instead, so plot.scale("x") threw "svg.scale is not a function".
  jsdomit("exposes the scales as a lookup function, as upstream's plot() does", async () => {
    const {container, cleanup} = await mount(plotWith({}));
    const svg = container.querySelector("svg");
    assert.strictEqual(typeof svg.scale, "function", "expected svg.scale to be the exposeScales function");
    const x = svg.scale("x");
    assert.strictEqual(x.type, "linear", 'svg.scale("x") should describe the x scale');
    assert.deepStrictEqual(x.domain, [1, 3]);
    assert.throws(() => svg.scale("nope"), /unknown scale: nope/, "an unknown scale name must throw");
    await cleanup();
  });

  // The function is created once per computed plot, not once per render: a
  // re-render that recomputes nothing hands back the identical function, which
  // is how a caller can tell the scales have not changed.
  jsdomit("exposes the same function across a re-render that does not recompute", async () => {
    const {container, render, cleanup} = await mount(plotWith({}));
    const svg = container.querySelector("svg");
    const before = svg.scale;
    await render(plotWith({}));
    assert.strictEqual(svg.scale, before, "a re-render that does not recompute must expose the same function");
    await cleanup();
  });

  jsdomit("carries the className prop on the <svg>", async () => {
    const {container, cleanup} = await mount(plotWith({className: "my-plot"}));
    const svg = container.querySelector("svg");
    assert.match(svg.getAttribute("class") ?? "", /\bmy-plot\b/, "expected the className prop on the <svg>");
    await cleanup();
  });

  jsdomit("applies an object style prop, and clears a key that is dropped", async () => {
    const {container, render, cleanup} = await mount(plotWith({style: {maxWidth: "50%"}}));
    const svg = container.querySelector("svg");
    assert.strictEqual(svg.style.maxWidth, "50%", "expected the style prop on the <svg>");
    await render(plotWith({style: {maxHeight: "10%"}}));
    assert.strictEqual(svg.style.maxHeight, "10%", "expected the replaced style prop on the <svg>");
    assert.strictEqual(svg.style.maxWidth, "", "a style key dropped from the prop must be cleared");
    await cleanup();
  });

  jsdomit("accepts a string style prop", async () => {
    const {container, cleanup} = await mount(plotWith({style: "max-width: 50%"}));
    const svg = container.querySelector("svg");
    assert.strictEqual(svg.style.maxWidth, "50%", "expected the string style prop on the <svg>");
    await cleanup();
  });
});
