// TEMPORARY SCAFFOLDING (W2). This file exists only to prove test/pointer-harness.tsx
// works before the real pointer test files are written; the later work items fold
// these assertions into test/pointer-selection-test.tsx and delete this file.
// Keep it small — it is not the place to grow pointer coverage.
import assert from "assert";
import {Dot, Replot} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {
  hover,
  installFrameClock,
  leave,
  mountPlot,
  pointerEvent,
  shimGeometry,
  svgPointOf,
  tipGroups,
  tipLines
} from "./pointer-harness.js";

const data = [
  {x: 10, y: 10},
  {x: 50, y: 50},
  {x: 90, y: 90}
];

describe("pointer harness", () => {
  jsdomit("the frame clock queues, honours cancelAnimationFrame, and flushes one generation", async () => {
    const flushFrames = installFrameClock();
    const ran: string[] = [];
    const cancelled = requestAnimationFrame(() => ran.push("cancelled"));
    requestAnimationFrame(() => ran.push("first"));
    cancelAnimationFrame(cancelled);
    // Nothing runs until the flush: the clock is a queue, not a synchronous shim.
    assert.deepStrictEqual(ran, []);
    // A callback queued from inside a callback belongs to the NEXT generation.
    requestAnimationFrame(() => {
      ran.push("second");
      requestAnimationFrame(() => ran.push("third"));
    });
    await flushFrames();
    assert.deepStrictEqual(ran, ["first", "second"]);
    await flushFrames();
    assert.deepStrictEqual(ran, ["first", "second", "third"]);
  });

  jsdomit("shimGeometry's rect and CTM agree under a CSS scale and a page offset", async () => {
    const win = (globalThis as any).window;
    const svg = win.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "640");
    svg.setAttribute("height", "400");
    const toClient = shimGeometry(svg, {left: 137, top: 41, scale: 0.5});

    // 320,200 in user space is half-scale plus the page offset in client space.
    assert.deepStrictEqual(toClient(320, 200), {clientX: 297, clientY: 141});
    // d3.pointer (createSVGPoint + getScreenCTM().inverse()) inverts it exactly.
    const event = pointerEvent(win, "pointermove", toClient(320, 200));
    assert.deepStrictEqual(svgPointOf(svg, event), [320, 200]);
    // The rect models the same thing: a CSS-scaled 640x400 svg at (137,41).
    const rect = svg.getBoundingClientRect();
    assert.deepStrictEqual(
      {left: rect.left, top: rect.top, width: rect.width, height: rect.height},
      {left: 137, top: 41, width: 320, height: 200}
    );
  });

  jsdomit("a hover over a dot selects that datum's tip, and a pointerleave clears it", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={data} x="x" y="y" tip />
      </Replot>
    );
    const {svg} = harness;
    assert.strictEqual(tipGroups(svg).length, 1, "expected exactly one tip group");
    assert.deepStrictEqual(tipLines(svg), [], "expected an empty tip at rest");

    const circles = svg.querySelectorAll("circle");
    assert.strictEqual(circles.length, data.length);
    const target = circles[1];
    await hover(harness, Number(target.getAttribute("cx")), Number(target.getAttribute("cy")));

    assert.deepStrictEqual(tipLines(svg), ["x 50", "y 50"], "expected the hovered datum in the tip");

    await leave(harness);
    assert.deepStrictEqual(tipLines(svg), [], "expected the tip to clear on pointerleave");
    await harness.cleanup();
  });
});
