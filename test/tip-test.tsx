// The tip mark's own behaviour, as distinct from the pointer plumbing the
// other pointer test files cover: a format that returns null for a datum
// (#160), and the box geometry that only a layout engine can supply (#162).
//
// The geometry lives here rather than in the snapshot suite on purpose: jsdom
// has no getBBox, so every snapshot is an *estimated* box — which is the point
// of the estimate, but means the snapshots cannot say anything about the
// measured one. These tests install a measurement (a monospace grid, or a
// fixed box) and read the geometry back off the DOM.
import assert from "assert";
import {Dot, Replot} from "../src/react/api.js";
import jsdomit from "./jsdom.js";
import {hover, mountPlot, shimTextMeasurement, tipGroups, tipTexts, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10, label: "one"},
  {x: 50, y: 70, label: "two"},
  {x: 90, y: 30, label: "three"}
];

/** The rendered dots of the first dot mark, in document order. */
function circles(harness: PointerHarness): any[] {
  return Array.from(harness.svg.querySelectorAll('g[aria-label="dot"] circle'));
}

/** The centre of a rendered circle, in SVG user space. */
function centreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

/** The centre of the first dot of the first dot mark, whatever shape it takes. */
function firstDotCentre(harness: PointerHarness): [number, number] {
  const dot: any = harness.svg.querySelector('g[aria-label="dot"] > circle, g[aria-label="dot"] > path');
  if (dot.getAttribute("cx") != null) return centreOf(dot);
  const [, x, y] = /translate\(([-\d.]+),([-\d.]+)\)/.exec(dot.getAttribute("transform")) ?? [];
  return [Number(x), Number(y)];
}

/** The showing tip's box path, or undefined when no tip is showing. */
function tipPath(harness: PointerHarness): any {
  return tipGroups(harness.svg)[0]?.querySelector("path");
}

/** The showing tip's text lines, with the tip's line tspans' x attributes. */
function lineXs(harness: PointerHarness): (string | null)[] {
  const text = tipGroups(harness.svg)[0]?.querySelector("text");
  return Array.from(text?.childNodes ?? [])
    .filter((node: any) => node.nodeType === 1 && String(node.tagName).toLowerCase() === "tspan")
    .map((node: any) => node.getAttribute("x"));
}

// Defines getBBox for every element, with a fixed box and no reference to what
// the element actually contains. That is what makes it able to check the one
// thing a self-consistent measurement cannot: that the left edge reported by
// the layout engine is used to shift the lines, and not merely re-measured
// away (which would leave the real text wherever the anchor put it).
function stubBBox(win: any, box: {x: number; y: number; width: number; height: number}): () => void {
  const proto = win.SVGElement.prototype;
  const had = Object.prototype.hasOwnProperty.call(proto, "getBBox");
  const previous = proto.getBBox;
  proto.getBBox = () => ({...box});
  return () => {
    if (had) proto.getBBox = previous;
    else delete proto.getBBox;
  };
}

describe("tip format", () => {
  jsdomit("shows nothing for a datum whose format returns null, and keeps tipping its neighbours", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" title={(d: any) => (d.label === "two" ? null : d.label)} tip />
      </Replot>
    );

    // The null datum: upstream formats every datum and then filters the nulls
    // out (tip.js:132-134), so this hover shows an empty tip rather than
    // throwing on a null it cannot iterate.
    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.deepStrictEqual(tipTexts(harness.svg), [], "expected no text for the null format");

    // …and a datum with a title still tips: a null once must not poison the mark.
    await hover(harness, ...centreOf(circles(harness)[0]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["one"]]);

    await hover(harness, ...centreOf(circles(harness)[2]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["three"]]);
    await harness.cleanup();
  });

  jsdomit("hides an explicit symbol channel, which styles the dot rather than stating a value", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" symbol="star" tip />
      </Replot>
    );

    // A literal symbol is a constant, so every dot would tip the same "star"
    // line; upstream drops channels whose values are all literal and which have
    // no scale (tip.js:357-358). The colour channels are the usual case, but
    // the rule covers any such channel, symbol included.
    await hover(harness, ...firstDotCentre(harness));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 10"]]);
    await harness.cleanup();
  });
});

describe("tip box geometry", () => {
  jsdomit("keeps the preferred anchor while the size is only estimated", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    // The rightmost dot: a box big enough to overflow the frame to the right
    // would be flipped to the left anchor if its size were known. With no
    // getBBox (jsdom, the server, a static snapshot) there is nothing to fit,
    // so the box hangs from the preferred (bottom) anchor.
    await hover(harness, ...centreOf(circles(harness)[2]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 30"]]);
    assert.match(tipPath(harness).getAttribute("d"), /^M0,0l6,-6h/);
    await harness.cleanup();
  });

  jsdomit("measures the text and fits the box to the frame", async () => {
    const teardown = shimTextMeasurement((globalThis as any).window, {charWidth: 20, lineHeight: 15});
    try {
      const harness = await mountPlot(
        <Replot width={400} height={300}>
          <Dot data={dots} x="x" y="y" tip />
        </Replot>
      );
      await hover(harness, ...centreOf(circles(harness)[2]));

      // Two lines of four characters at 20×15: the box is 80 wide and 30 high,
      // plus the padding (r = 8) on every side. The rightmost dot sits against
      // the right edge of the frame, so the fit turns the box around to face
      // left — the "right" anchor, a chevron whose point touches the dot and
      // whose body lies to its left (upstream postrender, tip.js:222-245).
      const d = tipPath(harness).getAttribute("d");
      assert.strictEqual(d, "M0,0l-6,-6v-17h-96v46h96v-17z", `unexpected box path: ${d}`);
      const [tx, ty] = (tipGroups(harness.svg)[0].querySelector("text").getAttribute("transform") as string)
        .replace(/^translate[(]|[)]$/g, "")
        .split(",")
        .map(Number);
      // The text sits one m/2 + r inside the far edge of the box.
      assert.deepStrictEqual([tx, ty], [-94, 15], "the text sits inside the flipped box");
      await harness.cleanup();
    } finally {
      teardown();
    }
  });

  jsdomit("shifts the lines by the measured left edge", async () => {
    // A left edge left of the anchor, as a middle-anchored text has: the lines
    // must be shifted so the text starts at the box's own origin (upstream
    // postrender writes -x onto every line, tip.js:238).
    const teardown = stubBBox((globalThis as any).window, {x: -40, y: 0, width: 80, height: 30});
    try {
      const harness = await mountPlot(
        <Replot width={400} height={300}>
          <Dot data={dots} x="x" y="y" tip />
        </Replot>
      );
      await hover(harness, ...centreOf(circles(harness)[0]));
      assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 10"]]);
      assert.deepStrictEqual(lineXs(harness), ["40", "40"], "each line is shifted by the measured left edge");
      await harness.cleanup();
    } finally {
      teardown();
    }
  });
});
