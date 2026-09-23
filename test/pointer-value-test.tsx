// The viewof contract: `plot.value`, the bubbling `input` event, and the
// <Replot onValue> prop.
//
// Upstream's pointer transform reports its selection through
// context.dispatchValue (src/plot.js:180-184 at 1c6b239d), which assigns
// `figure.value` and dispatches a bubbling `input` event — and short-circuits
// on REFERENCE EQUALITY, so a plot with several pointer consumers over the
// same datum reports one value change, not one per consumer. Replot adds the
// onValue prop beside it, and it must follow the same contract: these cases
// are what pins that.
import assert from "assert";
import {Crosshair, Dot, Replot} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {hover, leave, mountPlot, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10, k: "A"},
  {x: 50, y: 70, k: "B"},
  {x: 90, y: 30, k: "C"}
];

/** The circles of the first `g[aria-label="dot"]`, in mark order. */
function circles(harness: PointerHarness): any[] {
  const group = harness.svg.querySelector('g[aria-label="dot"]');
  assert.ok(group, "expected a dot mark");
  return Array.from(group.querySelectorAll("circle"));
}

// Two facets of two data each, so that the pointer crosses a facet boundary
// during the sweep below and every combination of leaving and entering is
// exercised.
const faceted = [
  {x: 10, y: 10, f: "one"},
  {x: 50, y: 10, f: "one"},
  {x: 50, y: 90, f: "two"},
  {x: 90, y: 90, f: "two"}
];

/** A dispatched value as `d<index into faceted>`, or "null". */
function labelOf(value: unknown): string {
  if (value == null) return "null";
  const i = faceted.indexOf(value as any);
  assert.ok(i >= 0, `expected a datum of the faceted data, got ${JSON.stringify(value)}`);
  return `d${i}`;
}

/** The centre of a rendered circle, in SVG user space. */
function centreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

describe("pointer value dispatch", () => {
  jsdomit("calls onValue exactly once, with the hovered datum", async () => {
    const values: unknown[] = [];
    const harness = await mountPlot(
      <Replot width={400} height={300} onValue={(v) => values.push(v)}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(values, [], "no value before any pointer event");

    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.strictEqual(values.length, 1, `expected one onValue call, got ${values.length}`);
    assert.strictEqual(values[0], dots[1], "expected the datum itself, by reference");
    await harness.cleanup();
  });

  jsdomit("puts the value on the svg and clears it on pointerleave", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.strictEqual(harness.svg.value, dots[1]);

    await leave(harness);
    assert.strictEqual(harness.svg.value, null, "pointerleave reports a null value");
    await harness.cleanup();
  });

  jsdomit("dispatches one bubbling input event per value change", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    const events: unknown[] = [];
    // On the CONTAINER, not the svg: the event upstream dispatches bubbles, and
    // that is what a viewof wrapper listens for.
    harness.container.addEventListener("input", (event: any) => events.push(event.target.value));

    await hover(harness, ...centreOf(circles(harness)[1]));
    await hover(harness, ...centreOf(circles(harness)[2]));
    await leave(harness);
    assert.deepStrictEqual(events, [dots[1], dots[2], null]);
    await harness.cleanup();
  });

  jsdomit("does not re-report a datum the pointer is already on", async () => {
    const values: unknown[] = [];
    const harness = await mountPlot(
      <Replot width={400} height={300} onValue={(v) => values.push(v)}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    const [cx, cy] = centreOf(circles(harness)[1]);
    await hover(harness, cx, cy);
    // A different point, still nearest the same datum: upstream's
    // dispatchValue compares by reference, so nothing is reported.
    await hover(harness, cx + 3, cy - 2);
    assert.deepStrictEqual(values, [dots[1]]);
    await harness.cleanup();
  });

  jsdomit("reports one value per change however many pointer consumers change", async () => {
    const values: unknown[] = [];
    const harness = await mountPlot(
      <Replot width={400} height={300} onValue={(v) => values.push(v)}>
        <Dot data={dots} x="x" y="y" tip />
        <Crosshair data={dots} x="x" y="y" />
      </Replot>
    );
    const [cx, cy] = centreOf(circles(harness)[1]);
    await hover(harness, cx, cy);
    await hover(harness, ...centreOf(circles(harness)[2]));
    await leave(harness);
    // A tip and a crosshair's rule and text sub-marks are five pointer
    // registrations over the one datum; upstream's reference check makes that
    // three value changes, not fifteen.
    assert.deepStrictEqual(values, [dots[1], dots[2], null]);
    await harness.cleanup();
  });

  // A faceted plot whose first pointer consumer is a tip — `tip: true` plus a
  // facet, the commonest shape there is. The whole value contract turns on the
  // tip declaring `pool: true` (upstream tip.js:15-20): the clearing-dispatch
  // suppression at pointer.js:172 applies only when the plot is NOT globally
  // pooled, so a tip that does not pool suppresses every null and a viewof
  // never learns the pointer has left a datum. With the pool the plot reports
  // a null between every pair of data, and the sequence below is that.
  //
  // The expected sequence is not hand-written: it was produced by rendering
  // this exact spec through upstream's own plot() under this repo's jsdom (with
  // the harness's rAF and geometry shims installed), sweeping the identical
  // grid, and recording the input events upstream's dispatchValue fired. A
  // 1681-probe sweep agreed as well; 441 is enough to pin the contract and
  // small enough to read.
  jsdomit("a faceted tip reports upstream's value sequence over a sweep of the frame", async () => {
    const seen: string[] = [];
    const harness = await mountPlot(
      <Replot width={400} height={400}>
        <Dot data={faceted} x="x" y="y" fy="f" tip />
      </Replot>
    );
    // On the container: the input event upstream dispatches bubbles.
    harness.container.addEventListener("input", (event: any) => seen.push(labelOf(event.target.value)));

    for (let iy = 0; iy < 21; ++iy) {
      for (let ix = 0; ix < 21; ++ix) {
        await hover(harness, ix * 20, iy * 20);
      }
    }

    assert.deepStrictEqual(seen, [
      "d0",
      "null",
      "d1",
      "null",
      "d0",
      "null",
      "d1",
      "null",
      "d3",
      "null",
      "d0",
      "null",
      "d2",
      "null",
      "d3",
      "null",
      "d0",
      "null",
      "d2",
      "null",
      "d3",
      "null",
      "d2",
      "null",
      "d3",
      "null"
    ]);
    await harness.cleanup();
  });

  jsdomit("puts the value on the figure, not the svg, in figure mode", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300} title="Dots">
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    const figure = harness.container.querySelector("figure");
    assert.ok(figure, "expected figure mode");

    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.strictEqual(figure.value, dots[1]);
    assert.ok(!("value" in harness.svg), "the value belongs to the figure alone");
    await harness.cleanup();
  });
});
