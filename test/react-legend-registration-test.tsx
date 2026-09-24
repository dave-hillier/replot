// @ts-nocheck — JSDOM React tests for context-registered <Legend> promotion.
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, Dot, Legend} from "../src/react/api.js";

const data = [
  {x: 1, y: 2, c: "a"},
  {x: 2, y: 3, c: "b"},
  {x: 3, y: 1, c: "c"}
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
    rerender: async (next) => {
      await act(async () => {
        root.render(next);
      });
      await act(async () => {});
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function plotWith(legends) {
  return (
    <Replot width={200} height={200} color={{domain: ["a", "b", "c"]}}>
      <Dot data={data} x="x" y="y" fill="c" />
      {legends}
    </Replot>
  );
}

// The legend must be a direct child of the figure (the visible slot), not
// buried in the hidden registration div.
function assertVisibleLegend(container, count = 1) {
  const figure = container.querySelector("figure");
  assert.ok(figure, "expected a <figure> wrapper");
  const legends = container.querySelectorAll(".plot-legend");
  assert.strictEqual(legends.length, count, `expected ${count} legend(s)`);
  for (const legend of legends) {
    assert.strictEqual(legend.parentElement, figure, "expected the legend to be a direct child of the figure");
  }
  return legends;
}

describe("Plot legend registration", () => {
  jsdomit("promotes a direct <Legend> child into the figure", async () => {
    const {container, cleanup} = await mount(plotWith(<Legend scale="color" />));
    const [legend] = assertVisibleLegend(container);
    assert.ok(legend.querySelector('[class*="swatches"]'), "expected swatches content");
    await cleanup();
  });

  jsdomit("promotes a <Legend> wrapped in a user component", async () => {
    function MyLegend() {
      return <Legend scale="color" />;
    }
    const {container, cleanup} = await mount(plotWith(<MyLegend />));
    assertVisibleLegend(container);
    await cleanup();
  });

  jsdomit("promotes a memo-wrapped <Legend>", async () => {
    const MemoLegend = React.memo(Legend);
    const {container, cleanup} = await mount(plotWith(<MemoLegend scale="color" />));
    assertVisibleLegend(container);
    await cleanup();
  });

  jsdomit("promotes a <Legend> inside a fragment", async () => {
    const {container, cleanup} = await mount(
      plotWith(
        <>
          <Legend scale="color" />
        </>
      )
    );
    assertVisibleLegend(container);
    await cleanup();
  });

  jsdomit("preserves legend order", async () => {
    const {container, cleanup} = await mount(
      plotWith([<Legend key="swatches" scale="color" />, <Legend key="ramp" scale="color" legend="ramp" />])
    );
    const legends = assertVisibleLegend(container, 2);
    assert.ok(legends[0].querySelector('[class*="swatches"]'), "expected the swatches legend first");
    assert.ok(legends[1].querySelector('[class*="-ramp"]'), "expected the ramp legend second");
    await cleanup();
  });

  jsdomit("reorders legends when keyed children reorder", async () => {
    const legends = (order) =>
      order.map((kind) =>
        kind === "swatches" ? (
          <Legend key="swatches" scale="color" />
        ) : (
          <Legend key="ramp" scale="color" legend="ramp" />
        )
      );
    const {container, rerender, cleanup} = await mount(plotWith(legends(["swatches", "ramp"])));
    let visible = assertVisibleLegend(container, 2);
    assert.ok(visible[0].querySelector('[class*="swatches"]'), "expected the swatches legend first");
    await rerender(plotWith(legends(["ramp", "swatches"])));
    visible = assertVisibleLegend(container, 2);
    assert.ok(visible[0].querySelector('[class*="-ramp"]'), "expected the ramp legend first after reorder");
    assert.ok(visible[1].querySelector('[class*="swatches"]'), "expected the swatches legend second after reorder");
    await cleanup();
  });

  jsdomit("shows a legend mounted later by a stateful wrapper", async () => {
    let show;
    function Toggle() {
      const [visible, setVisible] = React.useState(false);
      show = () => setVisible(true);
      return visible ? <Legend scale="color" /> : null;
    }
    // The wrapper re-renders on its own state change without <Replot> itself
    // re-rendering; registration alone must surface the legend.
    const {container, cleanup} = await mount(plotWith(<Toggle />));
    assert.strictEqual(container.querySelector(".plot-legend"), null, "expected no legend before the toggle");
    await act(async () => show());
    assertVisibleLegend(container);
    await cleanup();
  });

  jsdomit("registers once under StrictMode double rendering", async () => {
    const {container, cleanup} = await mount(<React.StrictMode>{plotWith(<Legend scale="color" />)}</React.StrictMode>);
    assertVisibleLegend(container);
    await cleanup();
  });

  jsdomit("removes the legend (and figure) when the <Legend> unmounts", async () => {
    const {container, rerender, cleanup} = await mount(plotWith(<Legend scale="color" />));
    assertVisibleLegend(container);
    await rerender(plotWith(null));
    assert.strictEqual(container.querySelector(".plot-legend"), null, "expected the legend to be removed");
    assert.strictEqual(container.querySelector("figure"), null, "expected figure mode to end with the legend");
    assert.ok(container.querySelector("svg"), "expected the bare <svg> to remain");
    await cleanup();
  });

  // A named scale the plot doesn't have has nothing to draw. The imperative
  // plot.legend("opacity") returns undefined for that; the React legend must
  // likewise render nothing — not an empty wrapper — and must not force the
  // plot into figure mode.
  jsdomit("renders nothing for a named scale the plot doesn't have", async () => {
    const {container, cleanup} = await mount(plotWith(<Legend scale="opacity" />));
    assert.strictEqual(container.querySelector(".plot-legend"), null, "expected no legend wrapper");
    assert.strictEqual(container.querySelector("figure"), null, "expected no figure mode");
    assert.ok(container.querySelector("svg"), "expected the bare <svg>");
    await cleanup();
  });

  // Regression: `scale` and a standalone scale spec used to be freely
  // combinable (a plain intersection), and the raw `scale` string leaked
  // through the standalone fallback into <ColorSwatches>, overriding the
  // normalized descriptor and throwing "swatches legend requires ordinal or
  // threshold color scale (not undefined)". The types now reject the
  // combination (see react-legend-d-test.tsx); untyped JS callers must at
  // least not crash.
  jsdomit("does not throw when `scale` is combined with a scale spec (standalone)", async () => {
    const {container, cleanup} = await mount(
      <Legend {...({scale: "color", color: {type: "ordinal", domain: ["a", "b"]}} as any)} />
    );
    assert.strictEqual(container.querySelector(".plot-legend"), null, "expected nothing rendered");
    await cleanup();
  });

  jsdomit("does not throw when `scale` names an absent scale but a spec is given", async () => {
    const {container, cleanup} = await mount(
      plotWith(<Legend {...({scale: "opacity", color: {type: "ordinal", domain: ["a", "b"]}} as any)} />)
    );
    assert.strictEqual(container.querySelector(".plot-legend"), null, "expected nothing rendered");
    assert.strictEqual(container.querySelector("figure"), null, "expected no figure mode");
    await cleanup();
  });
});
