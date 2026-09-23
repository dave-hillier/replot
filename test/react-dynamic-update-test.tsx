// @ts-nocheck — JSDOM React tests for <Replot> recompute-on-update invalidation.
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, Dot, BarY, stampOptions} from "../src/react/api.js";

const dataA = [
  {x: 1, y: 2},
  {x: 2, y: 3},
  {x: 3, y: 1}
];

const dataB = [
  {x: 1, y: 9},
  {x: 2, y: 1},
  {x: 3, y: 5}
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

describe("Plot recomputes when mark props change after mount", () => {
  jsdomit("updates the SVG when a mark's data changes", async () => {
    let setData;
    function Harness() {
      const [data, set] = useState(dataA);
      setData = set;
      return (
        <Replot width={200} height={200}>
          <Dot data={data} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setData(dataB));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when data changes");
    await cleanup();
  });

  jsdomit("updates the SVG when a constant channel value changes", async () => {
    let setR;
    function Harness() {
      const [r, set] = useState(3);
      setR = set;
      return (
        <Replot width={200} height={200}>
          <Dot data={dataA} x="x" y="y" r={r} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setR(9));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when a constant channel changes");
    await cleanup();
  });

  jsdomit("updates the SVG when a channel field name changes", async () => {
    let setField;
    function Harness() {
      const [field, set] = useState("y");
      setField = set;
      return (
        <Replot width={200} height={200}>
          <Dot data={dataA} x="x" y={field} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setField("x"));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when a channel field changes");
    await cleanup();
  });

  jsdomit("updates the SVG when a nested object-valued option changes", async () => {
    const bars = [
      {letter: "a", value: 2},
      {letter: "b", value: 3},
      {letter: "c", value: 1}
    ];
    let setSort;
    function Harness() {
      const [sort, set] = useState({x: "y"});
      setSort = set;
      return (
        <Replot width={200} height={200}>
          <BarY data={bars} x="letter" y="value" sort={sort} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setSort({x: "-y"}));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when an object-valued option changes");
    await cleanup();
  });
});

describe("stampOptions with object-valued options", () => {
  it("stamps equal-shaped equal-valued objects identically across references", () => {
    const a = stampOptions("dot", null, {tip: {format: {x: ".2f"}}});
    const b = stampOptions("dot", null, {tip: {format: {x: ".2f"}}});
    assert.strictEqual(a, b);
  });

  it("stamps a nested object value change differently", () => {
    const a = stampOptions("dot", null, {tip: {format: {x: ".2f"}}});
    const b = stampOptions("dot", null, {tip: {format: {x: ".0f"}}});
    assert.notStrictEqual(a, b);
  });

  it("stamps object entries order-independently", () => {
    const a = stampOptions("dot", null, {sort: {x: "y", reverse: true}});
    const b = stampOptions("dot", null, {sort: {reverse: true, x: "y"}});
    assert.strictEqual(a, b);
  });

  // A nested function is stamped by identity like a top-level one: `sort={{value:
  // fn}}` and `tip: {format: {x: fn}}` are the same class of value as a channel
  // accessor, and a change of either has to recompute the plot (#146).
  it("includes function identity inside objects", () => {
    const f = () => "a";
    assert.strictEqual(
      stampOptions("dot", null, {tip: {format: {x: f}}}),
      stampOptions("dot", null, {tip: {format: {x: f}}})
    );
    const a = stampOptions("dot", null, {tip: {format: {x: () => "a"}}});
    const b = stampOptions("dot", null, {tip: {format: {x: () => "b"}}});
    assert.notStrictEqual(a, b);
  });

  it("falls back to shape only past the depth cap", () => {
    const a = stampOptions("dot", null, {a: {b: {c: {d: {e: 1}}}}});
    const b = stampOptions("dot", null, {a: {b: {c: {d: {e: 2}}}}});
    assert.strictEqual(a, b);
  });

  it("falls back to shape only past the entry cap", () => {
    const wide = (v) => Object.fromEntries(Array.from({length: 40}, (_, i) => [`k${i}`, i === 0 ? v : i]));
    const a = stampOptions("dot", null, {big: wide(1)});
    const b = stampOptions("dot", null, {big: wide(2)});
    assert.strictEqual(a, b);
  });

  // A class instance — a d3 scale, a d3 interval, a scale-like object — has no
  // content the stamp can read, so it is stamped by identity instead of by shape
  // (#149): swapping one for another has to recompute the plot.
  it("stamps class instances by identity", () => {
    class Interval {
      step: number;
      constructor(step) {
        this.step = step;
      }
    }
    const one = new Interval(1);
    assert.strictEqual(stampOptions("dot", null, {interval: one}), stampOptions("dot", null, {interval: one}));
    assert.notStrictEqual(
      stampOptions("dot", null, {interval: one}),
      stampOptions("dot", null, {interval: new Interval(1)})
    );
  });
});

// #150: the plot's options key is what decides whether a recompute is needed,
// and it is built by serializing the options. A value JSON cannot serialize (a
// BigInt, a cycle) used to fall back to Math.random(), which gave a new key on
// every render: the compute effect re-ran, called setMode, re-rendered, and
// looped until React gave up with "Maximum update depth exceeded". A plot must
// settle instead.
describe("plot options that JSON.stringify refuses", () => {
  // The cyclic value sits on a prop <Replot> does not interpret, so it reaches
  // the options key (which covers every prop) but not computePlot's scales.
  function cyc() {
    const o: any = {a: 1};
    o.self = o;
    return o;
  }

  jsdomit("settles with a cyclic value in the plot props", async () => {
    const {container, cleanup} = await mount(
      <Replot width={200} height={200} meta={cyc()}>
        <Dot data={dataA} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(container.querySelectorAll("circle").length, 3);
    await cleanup();
  });

  jsdomit("settles with a BigInt in the plot props", async () => {
    const {container, cleanup} = await mount(
      <Replot width={200} height={200} meta={{count: 3n}}>
        <Dot data={dataA} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(container.querySelectorAll("circle").length, 3);
    await cleanup();
  });

  jsdomit("still recomputes when a stable option changes beside an unserializable one", async () => {
    // The fallback key has to be sensitive to the rest of the options, or the
    // loop would be fixed by freezing the plot instead of keying it.
    const cyclic = cyc();
    let setType;
    function Harness() {
      const [type, set] = useState("linear");
      setType = set;
      return (
        <Replot width={200} height={200} meta={cyclic} x={{type}}>
          <Dot data={dataA} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setType("log"));
    await act(async () => {});
    assert.notStrictEqual(svgMarkup(container), before, "expected the recompute after the scale type change");
    await cleanup();
  });
});
