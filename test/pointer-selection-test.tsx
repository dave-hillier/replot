// End-to-end hover selection through <Replot>'s pointer wiring, in jsdom.
//
// Every case here states UPSTREAM's behaviour (observablehq-plot
// src/interactions/pointer.js at 1c6b239d), read through the DOM: what a
// pointermove at a given SVG user-space point makes the plot render. The point
// of driving it through the DOM rather than through the store is that these are
// the assertions that survive the wiring being rewritten underneath them.
//
// Positions are always READ BACK from the rendered marks (a circle's cx/cy, a
// rect's x/width) rather than recomputed from the scales, so a change in
// default margins or nice-ing cannot silently move a test's hover off target.
import assert from "assert";
import {BarY, Dot, RectY, Replot, RuleY, binX, pointer, pointerX, pointerY} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {hover, leave, mountPlot, tipGroups, tipLines, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10, k: "A"},
  {x: 50, y: 70, k: "B"},
  {x: 90, y: 30, k: "C"}
];

// Eight categories across a 400px-wide plot give a band step of ~41px, so that
// both a band and its neighbour are inside the default 40px maxRadius: the band
// centring is then the only thing that decides which one is selected.
const bars = [
  {k: "a", v: 3},
  {k: "b", v: 4},
  {k: "c", v: 5},
  {k: "d", v: 6},
  {k: "e", v: 5},
  {k: "f", v: 4},
  {k: "g", v: 3},
  {k: "h", v: 2}
];

// Four bins with deliberately DIFFERENT counts (3, 7, 2, 4), so the tip's own
// text says which bin was selected.
const binned = [
  ...[1, 2, 3].map((v) => ({v})),
  ...[11, 12, 13, 14, 15, 16, 17].map((v) => ({v})),
  ...[21, 22].map((v) => ({v})),
  ...[31, 32, 33, 34].map((v) => ({v}))
];

/** The circles of the *k*th `g[aria-label="dot"]`, in document (mark) order. */
function circles(harness: PointerHarness, k = 0): any[] {
  const group = harness.svg.querySelectorAll('g[aria-label="dot"]')[k];
  assert.ok(group, `expected at least ${k + 1} dot mark(s)`);
  return Array.from(group.querySelectorAll("circle"));
}

/** The centre of a rendered element, in SVG user space. */
function centreOf(element: any): [number, number] {
  const n = (name: string) => Number(element.getAttribute(name));
  return element.tagName === "circle" ? [n("cx"), n("cy")] : [n("x") + n("width") / 2, n("y") + n("height") / 2];
}

describe("pointer selection", () => {
  jsdomit("a hover over a dot renders that datum in the tip, and a pointerleave clears it", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    assert.strictEqual(tipGroups(harness.svg).length, 1, "expected exactly one tip group");
    assert.deepStrictEqual(tipLines(harness.svg), [], "expected an empty tip at rest");

    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.deepStrictEqual(tipLines(harness.svg), ["x 50", "y 70"]);

    await leave(harness);
    assert.deepStrictEqual(tipLines(harness.svg), [], "expected the tip to clear on pointerleave");
    await harness.cleanup();
  });

  jsdomit("a hover far from every datum selects nothing and leaves the tip group empty", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    // (120, 60) is more than 80px from all three dots, which sit at roughly
    // (40, 270), (210, 20) and (380, 187).
    await hover(harness, 120, 60);
    assert.deepStrictEqual(tipLines(harness.svg), []);
    assert.strictEqual(tipGroups(harness.svg)[0].childNodes.length, 0, "expected the tip group to have no children");
    await harness.cleanup();
  });

  jsdomit("a barY over an ordinal x is anchored at the band centre, not the band's lower edge", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <BarY data={bars} x="k" y="v" tip />
      </Replot>
    );
    const rects = Array.from(harness.svg.querySelectorAll("rect")) as any[];
    const x0 = Number(rects[0].getAttribute("x"));
    const step = Number(rects[1].getAttribute("x")) - x0;
    const [, midY] = centreOf(rects[0]);

    // Three quarters of the way across band "a": beyond its lower edge, but
    // still on its own side of the boundary once the pointer is corrected by
    // half a bandwidth (pointerOffsets). Without that correction the raw
    // distance is smaller to band "b"'s lower edge, and "b" wins.
    await hover(harness, x0 + 0.75 * step, midY);
    assert.deepStrictEqual(tipLines(harness.svg), ["v 3", "k a"]);
    await harness.cleanup();
  });

  jsdomit("a binned rectY is anchored at the x1/x2 and y1/y2 midpoints", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <RectY data={binned} {...binX({y: "count"}, {x: "v", tip: true, thresholds: 4})} />
      </Replot>
    );
    const rects = Array.from(harness.svg.querySelectorAll("rect")) as any[];
    assert.strictEqual(rects.length, 4, "expected four bins");

    // A rect's centre IS its (x1+x2)/2, (y1+y2)/2 anchor, so hitting each bin
    // dead centre exercises both midpoints at once. A rect mark publishes no x
    // or y channel at all, only x1/x2 and y1/y2, so a hit test that reads
    // values.x/values.y finds nothing to compare and never selects anything.
    const expected = [3, 7, 2, 4];
    for (const [k, rect] of rects.entries()) {
      await hover(harness, ...centreOf(rect));
      const lines = tipLines(harness.svg);
      assert.ok(
        lines.some((line) => line === `Frequency ${expected[k]}`),
        `expected bin ${k}'s own count in the tip, got ${JSON.stringify(lines)}`
      );
    }
    await harness.cleanup();
  });

  jsdomit("pointer({px, py}) selects on the px/py channels, independently of where the mark draws", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointer({px: "x", py: "y", r: 8, fill: "red", title: "k"})} />
      </Replot>
    );
    // pointerK nulls x and y when px/py are given, so the pointer mark has no
    // position channels and draws at the frame anchor — the middle of the frame
    // — wherever the selected datum happens to live.
    const [ax, ay] = centreOf(circles(harness, 0)[0]);
    assert.deepStrictEqual([ax, ay], [40, 270], "expected datum A to be drawn at the bottom left");

    await hover(harness, ax, ay);
    const shown = circles(harness, 1);
    assert.strictEqual(shown.length, 1, "expected the pointer mark to render exactly the selected datum");
    assert.deepStrictEqual(centreOf(shown[0]), [210, 145], "expected the pointer mark at the frame anchor");
    assert.strictEqual(
      harness.svg.querySelectorAll('g[aria-label="dot"]')[1].querySelector("title").textContent,
      "A",
      "expected datum A to have been selected via px/py"
    );
    await harness.cleanup();
  });

  jsdomit("a ruleY anchors x at the frame anchor, so an edge-of-frame hover selects nothing", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        {/* tip="xy" is load-bearing: ruleY passes withTip(options, "y") (rule.js),
            so a bare `tip` would be a pointerY tip whose kx is 0.01 — a 170px
            horizontal miss would then score 1.7px and this case would say
            nothing about where x is anchored. */}
        <RuleY data={dots} y="y" tip="xy" />
      </Replot>
    );
    const lines = Array.from(harness.svg.querySelectorAll('g[aria-label="rule"] line')) as any[];
    const midY = Number(lines[1].getAttribute("y1"));

    // The frame anchor is the middle of the frame. Scoring the missing x as
    // NaN (never as zero) is what makes this a hit at all: undefined - 210 is
    // NaN, and `NaN <= ri` is false, so a mark with no x channel could never be
    // selected anywhere without the fall-through to applyFrameAnchor.
    await hover(harness, 210, midY);
    assert.deepStrictEqual(tipLines(harness.svg), ["y 70"], "expected a hit at the frame anchor's x");

    // A ruleY has no x channel, so anchorX falls through to the frame anchor
    // for EVERY datum. 380 is ~170px away from it: nothing is in range. Scoring
    // the missing x as zero distance instead would match on y alone and select
    // the same datum right across the frame.
    await hover(harness, 380, midY);
    assert.deepStrictEqual(tipLines(harness.svg), []);
    await harness.cleanup();
  });

  jsdomit("maxRadius bounds the search: 5 rejects a near miss, 100 accepts a far one", async () => {
    const tight = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointer({x: "x", y: "y", maxRadius: 5, r: 8, fill: "red"})} />
      </Replot>
    );
    const [bx, by] = centreOf(circles(tight, 0)[1]);
    await hover(tight, bx + 20, by);
    assert.strictEqual(circles(tight, 1).length, 0, "maxRadius 5 must reject a datum 20px away");
    await tight.cleanup();

    const loose = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointer({x: "x", y: "y", maxRadius: 100, r: 8, fill: "red"})} />
      </Replot>
    );
    const [cx, cy] = centreOf(circles(loose, 0)[1]);
    await hover(loose, cx + 60, cy);
    assert.deepStrictEqual(
      circles(loose, 1).map((circle) => centreOf(circle)),
      [[cx, cy]],
      "maxRadius 100 must accept a datum 60px away"
    );
    await loose.cleanup();
  });

  jsdomit("pointerX selects on x despite a large y gap, and pointerY mirrors it", async () => {
    const horizontal = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointerX({x: "x", y: "y", r: 8, fill: "red"})} />
      </Replot>
    );
    const [bx, by] = centreOf(circles(horizontal, 0)[1]);
    // ky is 0.01 under pointerX, so a 100px vertical gap contributes 1px of
    // distance and the x-nearest datum still wins.
    await hover(horizontal, bx, by + 100);
    assert.deepStrictEqual(
      circles(horizontal, 1).map((circle) => centreOf(circle)),
      [[bx, by]]
    );
    await horizontal.cleanup();

    const vertical = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointerY({x: "x", y: "y", r: 8, fill: "red"})} />
      </Replot>
    );
    const [cx, cy] = centreOf(circles(vertical, 0)[1]);
    await hover(vertical, cx - 100, cy);
    assert.deepStrictEqual(
      circles(vertical, 1).map((circle) => centreOf(circle)),
      [[cx, cy]]
    );
    await vertical.cleanup();
  });

  jsdomit("pointerX's weighting resets to isotropic outside the bottom margin", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Dot data={dots} {...pointerX({x: "x", y: "y", r: 8, fill: "red"})} />
      </Replot>
    );
    // Datum B sits at the top of the frame, so both hovers can share its x and
    // still leave room below it for a 130px gap inside the frame and another
    // one outside the bottom margin.
    const [bx, by] = centreOf(circles(harness, 0)[1]);

    // Inside the frame, the squashed y distance keeps it selected.
    await hover(harness, bx, by + 130);
    assert.deepStrictEqual(
      circles(harness, 1).map((circle) => centreOf(circle)),
      [[bx, by]]
    );

    // Below height - marginBottom the pointer is over the axis, where upstream
    // resets kpy to 1 so that the axis area selects isotropically. The same
    // vertical gap is now far outside maxRadius.
    await hover(harness, bx, 285);
    assert.strictEqual(circles(harness, 1).length, 0, "expected no selection below the bottom margin");
    await harness.cleanup();
  });

  jsdomit("a CSS-scaled svg still hit-tests in user space", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>,
      // Plot injects max-width:100%, so a narrow container scales the svg down;
      // the hit test must go through the screen CTM, not raw client pixels.
      {geometry: {scale: 0.5}}
    );
    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.deepStrictEqual(tipLines(harness.svg), ["x 50", "y 70"]);
    await harness.cleanup();
  });

  jsdomit("an svg offset within the page still hit-tests in user space", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
      </Replot>,
      {geometry: {left: 137, top: 41}}
    );
    await hover(harness, ...centreOf(circles(harness)[1]));
    assert.deepStrictEqual(tipLines(harness.svg), ["x 50", "y 70"]);
    await harness.cleanup();
  });
});
