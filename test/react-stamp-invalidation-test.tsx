// @ts-nocheck — JSDOM React tests for what the mark and scale stamps cover, and
// what a change to a stamped value costs.
//
// #146 and #149 are two halves of the same function. The stamp in useMark.ts
// decides whether a plot recomputes, so a value the stamp cannot distinguish
// leaves the plot stale, and a value the stamp walks in full makes every render
// of every mark expensive:
//
//   #146 — function props (accessors, filters, comparators, intervals, custom
//          renders) were excluded from the stamp, on the theory that a mark's
//          factory closure is re-evaluated per run and so already sees the
//          latest props. It does — but only when a run happens, and an accessor
//          that closed over React state changed nothing the stamp read, so no
//          run happened, and the plot went on drawing for the old closure.
//   #149 — everything that was neither a primitive, a short array nor a plain
//          object stamped as just "object" or "function", so swapping a Map, a
//          Set, a typed array, a d3 scale or a d3 interval never recomputed the
//          plot either. A long array was the opposite failure: walked element by
//          element, on every render, with no cap (objects had one).
//
// Both are fixed in stampValue by stamping those values by IDENTITY — a
// sequence number per reference — which is what the plot already does for data.
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import * as d3 from "d3";
import {Replot, Dot, AxisY, ScaleX, useMark, stampOptions} from "../src/react/index.js";
import {dot} from "../src/marks/dot.js";

const data = [
  {x: 1, y: 2},
  {x: 2, y: 3},
  {x: 3, y: 1}
];

// Four weeks apart, so a weekly interval and a daily one produce ticks that
// cannot be confused for one another.
const dated = [
  {date: new Date(Date.UTC(2024, 0, 3)), value: 1},
  {date: new Date(Date.UTC(2024, 0, 10)), value: 2},
  {date: new Date(Date.UTC(2024, 0, 17)), value: 3},
  {date: new Date(Date.UTC(2024, 1, 7)), value: 4}
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

// The rendered cy values, in data order, rounded: the dots' positions are what
// an accessor's captured state has to reach, and rounding keeps the assertion
// about where they went rather than about d3's float formatting.
function cys(container) {
  return [...container.querySelectorAll("circle")].map((c) => Math.round(+c.getAttribute("cy")));
}

function labels(container) {
  return [...container.querySelectorAll("text")].map((t) => t.textContent);
}

function circleCount(container) {
  return container.querySelectorAll("circle").length;
}

describe("#146 an accessor that closes over React state recomputes the plot", () => {
  jsdomit("recomputes the marks when the captured value changes", async () => {
    // The issue's repro, with an explicit domain so the DOTS are the evidence:
    // against an inferred domain an affine accessor rescales the axis and leaves
    // every dot where it was, which would let a stale plot pass.
    let setK;
    function Harness() {
      const [k, set] = useState(1);
      setK = set;
      return (
        <Replot width={200} height={200} y={{domain: [0, 100]}}>
          <Dot data={data} x="x" y={(d) => d.y * k} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    assert.deepStrictEqual(cys(container), [167, 166, 169]);
    await act(async () => setK(10));
    await act(async () => {});
    assert.deepStrictEqual(cys(container), [140, 125, 155], "expected the dots to move with the captured k");
    await cleanup();
  });

  jsdomit("recomputes the inferred domain when the captured value changes", async () => {
    // The other half of the repro: with no explicit domain the dot positions are
    // unchanged (the accessor only rescales the data), so the y ticks are what
    // shows the plot is stale — the axis keeps the domain the old closure
    // implied.
    let setK;
    function Harness() {
      const [k, set] = useState(1);
      setK = set;
      return (
        <Replot width={200} height={200}>
          <AxisY />
          <Dot data={data} x="x" y={(d) => d.y * k} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    assert.ok(labels(container).includes("1.0"), "expected the k=1 domain to tick at 1.0");
    await act(async () => setK(10));
    await act(async () => {});
    const after = labels(container);
    assert.deepStrictEqual(after, ["1", "2", "3", "x →", "10", "15", "20", "25", "30"]);
    await cleanup();
  });

  jsdomit("recomputes when a filter that closes over state changes", async () => {
    let setMin;
    function Harness() {
      const [min, set] = useState(1);
      setMin = set;
      return (
        <Replot width={200} height={200}>
          <Dot data={data} x="x" y="y" filter={(d) => d.y >= min} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    assert.strictEqual(circleCount(container), 3);
    await act(async () => setMin(3));
    await act(async () => {});
    assert.strictEqual(circleCount(container), 1, "expected the filter to drop the rows below the captured min");
    await cleanup();
  });
});

describe("#149 a value the stamp cannot read recomputes the plot when it changes", () => {
  jsdomit("recomputes when a scale component's interval changes", async () => {
    // A d3 interval is a function with no useful serialization, so it used to
    // stamp as just "function" and the axis kept the old ticks. Two fresh mounts
    // are the reference: the updated plot must end up where a plot mounted with
    // the new interval starts.
    const weekly = await mount(
      <Replot width={200} height={200}>
        <ScaleX interval={d3.utcWeek} />
        <Dot data={dated} x="date" y="value" />
      </Replot>
    );
    const daily = await mount(
      <Replot width={200} height={200}>
        <ScaleX interval={d3.utcDay} />
        <Dot data={dated} x="date" y="value" />
      </Replot>
    );
    assert.notDeepStrictEqual(labels(weekly.container), labels(daily.container), "expected the intervals to differ");
    let setInterval;
    function Harness() {
      const [interval, set] = useState(() => d3.utcWeek);
      setInterval = set;
      return (
        <Replot width={200} height={200}>
          <ScaleX interval={interval} />
          <Dot data={dated} x="date" y="value" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    assert.deepStrictEqual(labels(container), labels(weekly.container));
    await act(async () => setInterval(() => d3.utcDay));
    await act(async () => {});
    assert.deepStrictEqual(labels(container), labels(daily.container), "expected the ticks to follow the new interval");
    await cleanup();
    await weekly.cleanup();
    await daily.cleanup();
  });
});

// The stamp is a pure function of the values it is handed, so these unit tests
// say exactly what enters it. Two references the stamp cannot compare by content
// must stamp differently — a new Map, scale or interval is a new plot — while
// the same reference must keep the same stamp, or a re-render with unchanged
// props would recompute.
describe("stampOptions covers values it cannot read", () => {
  const once = (options) => stampOptions("dot", null, options);

  it("stamps a Map, a Set, a typed array, a d3 scale, an interval and a function by identity", () => {
    class Interval {
      constructor(step) {
        this.step = step;
      }
    }
    const pairs = [
      [new Map([["a", 1]]), new Map([["a", 1]]), "Map"],
      [new Set([1, 2]), new Set([1, 2]), "Set"],
      [new Float64Array([1, 2]), new Float64Array([1, 2]), "typed array"],
      [d3.scaleLinear(), d3.scaleLinear(), "d3 scale"],
      [new Interval(1), new Interval(1), "class instance"],
      [d3.utcWeek, d3.utcDay, "d3 interval"],
      [() => 1, () => 1, "function"]
    ];
    for (const [a, b, what] of pairs) {
      assert.strictEqual(once({v: a}), once({v: a}), `expected the same ${what} reference to restamp identically`);
      assert.notStrictEqual(once({v: a}), once({v: b}), `expected a different ${what} to restamp`);
    }
  });

  // A Proxy so the test can count element reads: only numeric index keys count,
  // so Array.isArray and .length do not set it off, and simply holding the array
  // must not read anything.
  function counting(values) {
    let reads = 0;
    const array = new Proxy(values, {
      get(target, key, receiver) {
        if (typeof key === "string" && /^[0-9]+$/.test(key)) reads++;
        return Reflect.get(target, key, receiver);
      }
    });
    return {array, reads: () => reads};
  }

  it("stamps an array past the cap by identity, without reading its elements", () => {
    const big = counting(new Array(100000).fill(1));
    const stamp = once({x: big.array});
    assert.strictEqual(big.reads(), 0, "expected the stamp not to walk a 100k-element array");
    assert.strictEqual(stamp, once({x: big.array}), "expected the same reference to restamp identically");
    assert.notStrictEqual(stamp, once({x: new Array(100000).fill(1)}), "expected a new reference to restamp");
  });

  it("still stamps a short array by value", () => {
    const small = counting([1, 2, 3]);
    assert.strictEqual(once({x: small.array}), once({x: [1, 2, 3]}), "expected a small array to be compared by value");
    assert.ok(small.reads() > 0, "expected a small array to be walked");
    assert.notStrictEqual(once({x: [1, 2, 3]}), once({x: [1, 2, 4]}));
  });
});

// What including function identity COSTS. An inline accessor is a new function
// on every render of its component, so a render that changes nothing else still
// recomputes the plot — the price of noticing that the closure may have changed,
// since a closure's captured values cannot be read. The recompute is per
// COMMIT, not per mark, and a stable identity (a module-level function, or
// useCallback) costs nothing at all; both are measured here by counting the
// factories <Plot> calls, which it does exactly once per registration per
// computePlot run.
let builds = 0;
function CountedDot({data: rows, ...options}) {
  useMark({
    name: "dot",
    data: rows,
    options,
    create: (d, o) => {
      builds++;
      return dot(d, o);
    }
  });
  return null;
}

describe("#146 what an accessor identity change costs", () => {
  jsdomit("recomputes once per commit that changes an identity, however many marks", async () => {
    let setK, setUnrelated;
    function Harness() {
      const [k, set1] = useState(1);
      const [unrelated, set2] = useState(0);
      setK = set1;
      setUnrelated = set2;
      return (
        <div>
          <span>{unrelated}</span>
          <Replot width={200} height={200} y={{domain: [0, 100]}}>
            <CountedDot data={data} x="x" y={(d) => d.y * k} />
            <CountedDot data={data} x="x" y={(d) => d.y + k} />
          </Replot>
        </div>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    builds = 0;
    // State the plot does not read, but that re-renders the marks: both inline
    // accessors are new functions, so the plot recomputes — once.
    await act(async () => setUnrelated(1));
    await act(async () => {});
    assert.strictEqual(builds, 2, "expected one recompute (two registrations) for the re-render");
    builds = 0;
    await act(async () => setK(10));
    await act(async () => {});
    assert.strictEqual(builds, 2, "expected one recompute for the captured value change");
    // The first mark's dots (the next three circles are the second mark's).
    assert.deepStrictEqual(cys(container).slice(0, 3), [140, 125, 155]);
    await cleanup();
  });

  jsdomit("recomputes nothing while the accessor identity is stable", async () => {
    const stableY = (d) => d.y;
    let setUnrelated;
    function Harness() {
      const [unrelated, set] = useState(0);
      setUnrelated = set;
      return (
        <div>
          <span>{unrelated}</span>
          <Replot width={200} height={200}>
            <CountedDot data={data} x="x" y={stableY} />
          </Replot>
        </div>
      );
    }
    const {cleanup} = await mount(<Harness />);
    builds = 0;
    await act(async () => setUnrelated(1));
    await act(async () => {});
    assert.strictEqual(builds, 0, "expected no recompute while the accessor identity is stable");
    await cleanup();
  });
});
