// @ts-nocheck — JSDOM React tests for per-mark event handlers (onClick etc.).
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, Dot, stampOptions} from "../src/react/api.js";

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
  await act(async () => {});
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function svgMarkup(container) {
  const svg = container.querySelector("svg");
  assert.ok(svg, "expected an <svg>");
  return svg.outerHTML;
}

async function click(element) {
  const MouseEvent = element.ownerDocument.defaultView.MouseEvent;
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  });
}

describe("per-mark event handlers", () => {
  jsdomit("onClick on a Dot receives the clicked datum and index", async () => {
    const clicks = [];
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" onClick={(event, datum, i) => clicks.push({type: event.type, datum, i})} />
      </Replot>
    );
    const circles = container.querySelectorAll("circle");
    assert.strictEqual(circles.length, data.length);
    await click(circles[1]);
    assert.strictEqual(clicks.length, 1);
    assert.strictEqual(clicks[0].type, "click");
    assert.strictEqual(clicks[0].datum, data[1]);
    assert.strictEqual(clicks[0].i, 1);
    await click(circles[2]);
    assert.strictEqual(clicks.length, 2);
    assert.strictEqual(clicks[1].datum, data[2]);
    assert.strictEqual(clicks[1].i, 2);
    await cleanup();
  });

  jsdomit("handler identity change does not rebuild the plot, yet the new handler fires", async () => {
    assert.strictEqual(
      stampOptions("dot", data, {x: "x", y: "y", onClick: () => 1}),
      stampOptions("dot", data, {x: "x", y: "y", onClick: () => 2}),
      "expected handler identity to be excluded from the stamp"
    );
    const first = [];
    const second = [];
    let swap;
    function Harness() {
      const [swapped, set] = useState(false);
      swap = set;
      const target = swapped ? second : first;
      return (
        <Replot width={200} height={200}>
          <Dot data={data} x="x" y="y" onClick={(event, datum, i) => target.push({datum, i})} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const svg = container.querySelector("svg");
    const scaleBefore = svg.scale;
    const markupBefore = svg.outerHTML;
    await act(async () => swap(true));
    await act(async () => {});
    assert.strictEqual(svg.scale, scaleBefore, "expected no recompute (same scales identity)");
    assert.strictEqual(svg.outerHTML, markupBefore, "expected identical markup after a handler identity change");
    await click(container.querySelectorAll("circle")[0]);
    assert.strictEqual(first.length, 0, "expected the stale handler NOT to fire");
    assert.strictEqual(second.length, 1, "expected the latest handler to fire");
    assert.strictEqual(second[0].datum, data[0]);
    assert.strictEqual(second[0].i, 0);
    await cleanup();
  });

  jsdomit("a mark with handlers renders markup identical to one without", async () => {
    const withHandlers = await mount(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" onClick={() => {}} onPointerEnter={() => {}} />
      </Replot>
    );
    const without = await mount(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(svgMarkup(withHandlers.container), svgMarkup(without.container));
    await withHandlers.cleanup();
    await without.cleanup();
  });
});
