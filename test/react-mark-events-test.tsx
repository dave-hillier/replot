// @ts-nocheck — JSDOM React tests for per-mark event handlers (onClick etc.).
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, Dot, Line, TickX, stampOptions} from "../src/react/api.js";

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

// Which child of a mark's root is which datum cannot be inferred from the
// child count. A line with markers renders a <defs> plus one path per series,
// so three data in two series is three children: the counts matched and the
// <defs> was handed datum 0 while every series path was shifted by one. The
// mark declares its per-datum elements explicitly (src/react/perDatum.ts) and
// the handlers attach by that declaration alone.
describe("per-datum handler attachment", () => {
  const series = [
    {x: 1, y: 1, g: "a"},
    {x: 2, y: 2, g: "a"},
    {x: 3, y: 1, g: "b"}
  ];

  jsdomit("a grouped mark's paths do not claim a datum when the counts coincide", async () => {
    const clicks = [];
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <Line
          data={series}
          x="x"
          y="y"
          z="g"
          markerEnd="arrow"
          onClick={(event, datum, i) => clicks.push({type: event.type, datum, i})}
        />
      </Replot>
    );
    // Two series paths and one <defs>: exactly as many children as data.
    const paths = container.querySelectorAll('svg > g[aria-label="line"] > path');
    assert.strictEqual(paths.length, 2, "expected one path per series");
    await click(paths[0]);
    assert.strictEqual(clicks.length, 1, "expected the mark-level handler to fire");
    assert.strictEqual(clicks[0].type, "click");
    assert.strictEqual(clicks[0].datum, undefined, "a grouped mark's path stands for a series, not a datum");
    assert.strictEqual(clicks[0].i, undefined, "a grouped mark's path has no datum index");
    await cleanup();
  });

  jsdomit("a grouped mark's paths do not claim a datum without a <defs> either", async () => {
    const pairs = [
      {x: 1, y: 1, g: "a"},
      {x: 2, y: 2, g: "b"}
    ];
    const clicks = [];
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <Line data={pairs} x="x" y="y" z="g" onClick={(event, datum, i) => clicks.push({datum, i})} />
      </Replot>
    );
    const paths = container.querySelectorAll('svg > g[aria-label="line"] > path');
    assert.strictEqual(paths.length, pairs.length, "expected one path per series");
    await click(paths[0]);
    assert.deepStrictEqual(clicks, [{datum: undefined, i: undefined}]);
    await cleanup();
  });

  jsdomit("a per-datum mark attaches per datum, skipping structural children", async () => {
    const clicks = [];
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <TickX data={data} x="x" markerEnd="arrow" onClick={(event, datum, i) => clicks.push({datum, i})} />
      </Replot>
    );
    // One line per tick, with the marker's <defs> first: more children than data.
    const lines = container.querySelectorAll('svg > g[aria-label="tick"] > line');
    assert.strictEqual(lines.length, data.length, "expected one line per tick");
    await click(lines[1]);
    assert.deepStrictEqual(clicks, [{datum: data[1], i: 1}]);
    await click(lines[2]);
    assert.deepStrictEqual(clicks[1], {datum: data[2], i: 2});
    await cleanup();
  });

  jsdomit("a per-datum element wrapped by the href channel keeps its datum", async () => {
    const rows = [
      {x: 1, y: 2, url: "https://example.com/1"},
      {x: 2, y: 3, url: "https://example.com/2"}
    ];
    const clicks = [];
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <Dot data={rows} x="x" y="y" href="url" onClick={(event, datum, i) => clicks.push({datum, i})} />
      </Replot>
    );
    // The datum is tagged on the <a> the href channel wraps the dot in.
    const anchors = container.querySelectorAll("a");
    assert.strictEqual(anchors.length, rows.length, "expected one anchor per dot");
    await click(anchors[1]);
    assert.deepStrictEqual(clicks, [{datum: rows[1], i: 1}]);
    await cleanup();
  });

  jsdomit("a grouped mark with handlers renders markup identical to one without", async () => {
    const plot = (handlers) => (
      <Replot width={200} height={200}>
        <Line data={series} x="x" y="y" z="g" markerEnd="arrow" {...handlers} />
      </Replot>
    );
    const withHandlers = await mount(plot({onClick: () => {}}));
    const without = await mount(plot({}));
    // Marker ids come from a module-global counter (like clip ids), so two
    // mounts never agree on them; everything else must be byte-identical.
    const ids = /plot-marker-\d+/g;
    assert.strictEqual(
      svgMarkup(withHandlers.container).replace(ids, "plot-marker-N"),
      svgMarkup(without.container).replace(ids, "plot-marker-N")
    );
    await withHandlers.cleanup();
    await without.cleanup();
  });
});
