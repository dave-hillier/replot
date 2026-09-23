// Faceted pointer selection: facet-local coordinates, facet exclusivity, the
// value dispatched when the pointer crosses a facet boundary, and the ARIA
// promotion of a faceted pointer consumer.
//
// The one thing a faceted hit test has to get right is WHOSE coordinate system
// the numbers are in. A mark's channel values are facet-LOCAL, because each
// facet is drawn inside its own <g transform>; the pointer event is in the
// svg's own space. Upstream corrects the EVENT (pointer.js:51-55), never the
// data, so every case below is written as absolute-versus-local.
import assert from "assert";
import {computePlot} from "../src/plot.js";
import {pointer} from "../src/interactions/pointer.js";
import {dot} from "../src/marks/dot.js";
import {Dot, Replot, Tip} from "../src/react/api.js";
import {buildStaticPlotSvg} from "../src/react/renderStatic.js";
import jsdomit from "./jsdom.js";
import {hover, mountPlot, tipGroups, tipTexts, type PointerHarness} from "./pointer-harness.js";

// In a 400x400 plot faceted by fy, each facet's cell is 184px tall: the "one"
// cell is at translate(0,0) and the "two" cell at translate(0,184), and within
// a cell y=10 lands at 186 and y=90 at 20. So facet two's data are 184px BELOW
// where their own channel values say they are, and the two facets' data very
// nearly touch across the cell boundary at absolute y ≈ 186 and y ≈ 204 — which
// is what makes both the coordinate correction and the facet exclusivity
// observable in the same plot.
const faceted = [
  {x: 10, y: 10, f: "one"}, // local (40, 186)
  {x: 50, y: 10, f: "one"}, // local (200, 186)
  {x: 50, y: 90, f: "two"}, // local (200, 20), absolute (200, 204)
  {x: 90, y: 90, f: "two"} // local (360, 20), absolute (360, 204)
];

function facetedPlot(onValue?: (value: unknown) => void) {
  return (
    <Replot width={400} height={400} onValue={onValue}>
      <Dot data={faceted} x="x" y="y" fy="f" tip />
    </Replot>
  );
}

/** The facet cell transforms, read off the plain (non-pointer) dot mark. */
function facetTransforms(harness: PointerHarness): (string | null)[] {
  return Array.from(harness.svg.querySelectorAll('g[aria-label="dot"]') as ArrayLike<any>).map((group: any) =>
    group.parentNode.getAttribute("transform")
  );
}

describe("pointer faceting", () => {
  jsdomit("a faceted hit test runs in facet-local coordinates", async () => {
    const harness = await mountPlot(facetedPlot());
    assert.deepStrictEqual(facetTransforms(harness), ["translate(0,0)", "translate(0,184)"]);

    // The ABSOLUTE position of facet two's second datum. Facet one's nearest
    // datum is 160px away, so only facet two can answer.
    await hover(harness, 360, 204);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90", "f two"]]);

    // The same point in facet two's LOCAL coordinates is empty space in facet
    // one. Reading the channel values without subtracting the facet translate
    // selects here and not above — exactly backwards.
    await hover(harness, 360, 20);
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    await harness.cleanup();
  });

  jsdomit("only the facet nearest the pointer keeps its datum", async () => {
    const harness = await mountPlot(facetedPlot());
    // 198 is 12px below facet one's bottom row and 6px above facet two's top
    // row, so both facets are within maxRadius and the nearer one must win.
    await hover(harness, 200, 198);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 90", "f two"]]);
    await harness.cleanup();
  });

  jsdomit("crossing a facet boundary dispatches the entering facet's datum, with no null between", async () => {
    const values: unknown[] = [];
    const harness = await mountPlot(
      <Replot width={400} height={400} onValue={(value) => values.push(value)}>
        <Dot data={faceted} x="x" y="y" fy="f" />
        <Tip data={faceted} {...pointer({x: "x", y: "y", fy: "f"})} pool={false} />
      </Replot>
    );

    await hover(harness, 200, 186); // facet one's bottom row
    await hover(harness, 200, 204); // facet two's top row

    // The leaving facet's clearing dispatch is suppressed (pointer.js:172) so
    // that the entering facet's value is the last writer; a null in between
    // would make a viewof flicker to nothing on every boundary crossing.
    //
    // `pool={false}` is what makes that suppression reachable AT ALL: the test
    // at pointer.js:172 reads facetPool.map.size, and facetPool is only ever
    // written when the plot is not globally pooled (pointer.js:85, `state.pool
    // ?? facetPool`). A tip pools by default, so the ordinary `tip: true`
    // faceted plot takes the other branch and DOES report a null between the
    // two data — verified against upstream, and pinned by "a faceted tip
    // reports upstream's value sequence over a sweep of the frame" in
    // test/pointer-value-test.tsx.
    assert.deepStrictEqual(values, [faceted[1], faceted[2]]);
    await harness.cleanup();
  });

  jsdomit("a faceted pointer consumer emits exactly one aria-labelled group", async () => {
    const harness = await mountPlot(facetedPlot());
    // Upstream promotes the ARIA attributes to a single group per mark and
    // leaves one plain <g transform> per facet inside it (verified against
    // observablehq-plot/test/output/tipDotFacets.svg).
    assert.strictEqual(tipGroups(harness.svg).length, 1);
    await harness.cleanup();
  });

  jsdomit("the promoted group carries the mark transform and its children the facet transforms", async () => {
    const harness = await mountPlot(facetedPlot());
    const [group] = tipGroups(harness.svg);
    assert.ok(group, "expected a tip group");
    // The mark transform: the half-pixel crispness offset the tip mark applies.
    assert.strictEqual(group.getAttribute("transform"), "translate(0.5,0.5)");

    const children = Array.from(group.children as ArrayLike<any>);
    assert.deepStrictEqual(
      children.map((child: any) => child.getAttribute("transform")),
      facetTransforms(harness)
    );
    for (const child of children) {
      for (const name of ["aria-label", "aria-description", "aria-hidden"]) {
        assert.strictEqual(child.getAttribute(name), null, `expected no ${name} on a facet child`);
      }
    }
    await harness.cleanup();
  });

  jsdomit("the static walker carries the facet markers of a plot faceted by fy alone", async () => {
    // The two mark walkers must agree on what marks a faceted index: upstream's
    // test is `index.fi != null` (pointer.js:111), and a plot faceted by fy
    // alone has no fx at all — testing fx there silently drops fx/fy/fi from
    // the empty index a pointer consumer renders at rest, so the mark cannot
    // tell which cell it is in.
    const seen: (number | null)[][] = [];
    const mark: any = dot(faceted, pointer({x: "x", y: "y", fy: "f"}));
    const renderJSX = mark.renderJSX.bind(mark);
    mark.renderJSX = (index: any, ...rest: any[]) => {
      seen.push([index.fi, index.fx, index.fy]);
      return renderJSX(index, ...rest);
    };

    buildStaticPlotSvg(computePlot({width: 400, height: 400, marks: [mark]}));

    // The trailing call is the walker's ARIA-promotion probe: upstream reads the
    // attributes it hoists off the first facet's DOM node, which the walker
    // cannot do when a facet is a <PointerMarkSlot> component, so once the
    // facets have rendered it renders the mark AT REST — no facet markers —
    // purely to read its root. The facet renders come first, and they are the
    // ones that must carry fi/fx/fy.
    assert.deepStrictEqual(seen, [
      [0, undefined, "one"],
      [1, undefined, "two"],
      [undefined, undefined, undefined]
    ]);
  });
});
