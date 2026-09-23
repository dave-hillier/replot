// Several pointer consumers in one plot: independence, pooling, and the
// crosshair's four sub-marks.
//
// Upstream keeps one selection per rendered (mark, facet) slot, not one per
// plot, and arbitrates between slots by group: everything pools together when
// the FIRST-rendered pointer mark pools, otherwise an unfaceted slot competes
// only with itself. These cases pin both halves, and the crosshair is the
// sharpest instrument available for the second: it puts four pointer marks —
// two of them sharing an aria-label with each other — into one plot.
import assert from "assert";
import {BoxX, Crosshair, Dot, Replot, Tip, pointer} from "../src/react/api.js";
import jsdomit from "./jsdom.js";
import {hover, mountPlot, tipTexts, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10},
  {x: 50, y: 70},
  {x: 90, y: 30}
];

const boxes = [
  {g: "a", v: 1},
  {g: "a", v: 2},
  {g: "a", v: 3},
  {g: "a", v: 4},
  {g: "a", v: 9},
  {g: "b", v: 5},
  {g: "b", v: 6},
  {g: "b", v: 7},
  {g: "b", v: 8},
  {g: "b", v: 12}
];

/** The circles of the *k*th `g[aria-label="dot"]`, in document (mark) order. */
function circles(harness: PointerHarness, k = 0): any[] {
  const group = harness.svg.querySelectorAll('g[aria-label="dot"]')[k];
  assert.ok(group, `expected at least ${k + 1} dot mark(s)`);
  return Array.from(group.querySelectorAll("circle"));
}

/** A circle's cx/cy as written, i.e. in its own mark group's coordinates. */
function localCentreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

/**
 * The centre of a rendered circle in SVG USER SPACE — cx/cy plus every ancestor
 * `translate(...)` up to the svg. This is the space a hover is expressed in.
 *
 * A mark group carries a transform of its own (`applyTransform`), so cx/cy are
 * local coordinates, not the coordinates a pointer event resolves to. It is
 * usually a half-pixel crispness offset and so invisible, but a boxX's dot mark
 * sits at translate(0.5,54): hovering at the raw cx/cy puts the pointer 54px —
 * more than the 40px maxRadius — above the datum, so every mark misses and no
 * tip shows at all.
 */
function centreOf(circle: any): [number, number] {
  let [x, y] = localCentreOf(circle);
  for (
    let node = circle.parentElement;
    node != null && node.tagName.toLowerCase() !== "svg";
    node = node.parentElement
  ) {
    const transform = node.getAttribute("transform");
    if (transform == null) continue;
    const match = /^translate\(\s*([-\d.eE+]+)[ ,]\s*([-\d.eE+]+)\s*\)$/.exec(transform);
    assert.ok(match, `unexpected group transform ${transform}`);
    x += Number(match[1]);
    y += Number(match[2]);
  }
  return [x, y];
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

describe("pointer multi-consumer", () => {
  jsdomit("a tip whose own mark has nothing in range shows nothing", async () => {
    const left = [
      {x: 10, y: 10},
      {x: 20, y: 20}
    ];
    const right = [
      {x: 80, y: 80},
      {x: 90, y: 90}
    ];
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={left} x="x" y="y" tip />
        <Dot data={right} x="x" y="y" tip />
      </Replot>
    );
    // The far corner: the left mark's nearest datum is most of the plot away.
    await hover(harness, ...centreOf(circles(harness, 1)[1]));
    // A selection belongs to the slot that made it. Handing the winning INDEX
    // to every pointer mark instead makes the left tip render its own second
    // datum, which is nowhere near the pointer.
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);
    await harness.cleanup();
  });

  jsdomit("two unpooled tips in range each show their own datum", async () => {
    const a = [
      {x: 10, y: 10},
      {x: 50, y: 50}
    ];
    const b = [
      {x: 56, y: 56},
      {x: 90, y: 90}
    ];
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={a.concat(b)} x="x" y="y" />
        <Tip data={a} {...pointer({x: "x", y: "y"})} pool={false} />
        <Tip data={b} {...pointer({x: "x", y: "y"})} pool={false} />
      </Replot>
    );
    // The two tips' near data are adjacent but at DIFFERENT indices within
    // their own marks (a[1] and b[0]), so a shared winning index cannot
    // satisfy both.
    const drawn = circles(harness).map(centreOf);
    await hover(harness, ...midpoint(drawn[1], drawn[2]));
    assert.deepStrictEqual(tipTexts(harness.svg), [
      ["x 50", "y 50"],
      ["x 56", "y 56"]
    ]);
    await harness.cleanup();
  });

  jsdomit("a crosshair renders both of its rules and both of its texts", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Crosshair data={dots} x="x" y="y" />
      </Replot>
    );
    await hover(harness, ...centreOf(circles(harness)[1]));

    // A crosshair is four separate pointer marks, and its two rules share one
    // aria-label with each other, as do its two texts. Keying a registration by
    // that label collapses each pair into one slot: the rules survive (they
    // overwrite each other with the same selection) and the texts never render
    // at all, because the surviving rule slot is the one that wins.
    const rules = Array.from(harness.svg.querySelectorAll('g[aria-label="crosshair rule"]') as ArrayLike<any>);
    assert.strictEqual(rules.length, 2, "expected two crosshair rule marks");
    assert.deepStrictEqual(
      rules.map((g: any) => g.querySelectorAll("line").length),
      [1, 1],
      "expected each crosshair rule to render a line"
    );

    const texts = Array.from(harness.svg.querySelectorAll('g[aria-label="crosshair text"]') as ArrayLike<any>);
    assert.strictEqual(texts.length, 2, "expected two crosshair text marks");
    assert.deepStrictEqual(
      texts.map((g: any) => g.querySelectorAll("text").length),
      [1, 1],
      "expected each crosshair text to render a label"
    );
    await harness.cleanup();
  });

  jsdomit("the crosshair labels show the hovered datum's x and y at the frame edges", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Crosshair data={dots} x="x" y="y" />
      </Replot>
    );
    const circle = circles(harness)[1];
    // The crosshair's own groups carry their own transforms, so its labels are
    // asserted in the LOCAL space the attributes are written in, while the
    // hover is expressed in user space.
    const [cx, cy] = localCentreOf(circle);
    await hover(harness, ...centreOf(circle));

    const [xLabel, yLabel] = Array.from(
      harness.svg.querySelectorAll('g[aria-label="crosshair text"] text') as ArrayLike<any>
    );
    assert.ok(xLabel && yLabel, "expected both crosshair labels to render");
    // The x label sits on the bottom edge of the frame (height - marginBottom)
    // at the datum's x; the y label on the left edge (marginLeft) at its y.
    assert.strictEqual(xLabel.textContent, "50");
    assert.strictEqual(xLabel.getAttribute("transform"), `translate(${cx},270)`);
    assert.strictEqual(yLabel.textContent, "70");
    assert.strictEqual(yLabel.getAttribute("transform"), `translate(40,${cy})`);
    await harness.cleanup();
  });

  jsdomit("a crosshair rendered before a tip does not suppress it", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Crosshair data={dots} x="x" y="y" />
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    await hover(harness, ...centreOf(circles(harness)[1]));

    // Upstream's pool is created by whichever pointer mark renders FIRST
    // (pointer.js:97) and then applies to every later one. A crosshair does not
    // pool, so with the crosshair first nothing pools and all five pointer
    // marks show at once. (Declared the other way round the tip's pool would
    // swallow the crosshair — surprising, but upstream's own behaviour.)
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="crosshair rule"] line').length, 2);
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="crosshair text"] text').length, 2);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]]);
    await harness.cleanup();
  });

  jsdomit("two pooled tips show only the nearer one", async () => {
    const a = [{x: 50, y: 50}];
    const b = [{x: 56, y: 56}];
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots.concat(a)} x="x" y="y" tip />
        <Dot data={dots.concat(b)} x="x" y="y" tip />
      </Replot>
    );
    const first = centreOf(circles(harness, 0)[3]);
    const second = centreOf(circles(harness, 1)[3]);
    // Just inside the second mark's datum, so that both tips are in range but
    // the second is nearer. A tip pools by default, so exactly one may show.
    await hover(harness, second[0] - 2, second[1] + 2);
    assert.deepStrictEqual(
      tipTexts(harness.svg),
      [["x 56", "y 56"]],
      `expected only the nearer tip; the other mark's datum is drawn at ${first}`
    );
    await harness.cleanup();
  });

  jsdomit("a boxX with tip creates several tip marks but shows only one", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <BoxX data={boxes} x="v" y="g" tip />
      </Replot>
    );
    // A box is a rule, a bar, a tick and a dot, each with its own tip; they all
    // pool, so the mark nearest the pointer — here the outlier dot, at distance
    // zero — is the only one that may show.
    await hover(harness, ...centreOf(circles(harness)[0]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["v 9", "g a"]]);
    await harness.cleanup();
  });
});
