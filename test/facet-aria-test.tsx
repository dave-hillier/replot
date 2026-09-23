// A faceted mark announces itself ONCE. Upstream hoists aria-label,
// aria-description, aria-hidden and the mark transform off the per-facet nodes
// onto a single shared <g> per mark, then writes each facet's cell transform
// onto the children in the vacated transform's place (plot.js:313-325:
// "Promote ARIA attributes and mark transform to avoid repetition on each
// facet"). The promotion is not pointer-specific — it is what every faceted
// mark looks like — so a screen reader hears "dot" once for a mark drawn in
// two facets, not once per facet, and the mark's own transform is not repeated
// either.
import assert from "assert";
import {Dot, Replot} from "../src/react/api.js";
import jsdomit from "./jsdom.js";
import {mountPlot} from "./pointer-harness.js";

// Two facets, so the promotion is observable as a structure: in a 400x400 plot
// faceted by fy the "one" cell is at translate(0,0) and the "two" cell at
// translate(0,184).
const faceted = [
  {x: 10, y: 10, f: "one"},
  {x: 50, y: 10, f: "one"},
  {x: 50, y: 90, f: "two"},
  {x: 90, y: 90, f: "two"}
];

describe("faceted mark ARIA promotion", () => {
  jsdomit("announces a faceted non-pointer mark once, on one shared group", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={400}>
        <Dot data={faceted} x="x" y="y" fy="f" ariaDescription="one dot per row" ariaHidden="false" />
      </Replot>
    );
    // The dot mark labels itself "dot" (its mark-level aria-label; a user
    // ariaLabel is a per-datum channel, not this constant).
    const groups = Array.from(harness.svg.querySelectorAll('g[aria-label="dot"]') as ArrayLike<any>);

    // The whole point: one group for the mark, however many facets it spans.
    assert.strictEqual(groups.length, 1, "expected exactly one aria-labelled group for the mark");

    // The shared group carries the ARIA attributes and the mark's OWN transform
    // (the half-pixel crispness offset the dot mark applies), not the facet
    // translate — the facets translate their children instead.
    const [group] = groups;
    assert.strictEqual(group.getAttribute("transform"), "translate(0.5,0.5)");
    assert.strictEqual(group.getAttribute("aria-description"), "one dot per row");
    assert.strictEqual(group.getAttribute("aria-hidden"), "false");

    // One child per facet, each at its cell, with the hoisted attributes gone.
    const children = Array.from(group.children as ArrayLike<any>);
    assert.deepStrictEqual(
      children.map((child: any) => child.getAttribute("transform")),
      ["translate(0,0)", "translate(0,184)"]
    );
    for (const child of children) {
      for (const name of ["aria-label", "aria-description", "aria-hidden"]) {
        assert.strictEqual(child.getAttribute(name), null, `expected no ${name} on a facet child`);
      }
    }

    await harness.cleanup();
  });

  // A faceted mark whose facets draw nothing must not leave an empty shared
  // group behind: upstream builds the group lazily, on the first facet that
  // renders a node.
  jsdomit("leaves no shared group behind when every facet is empty", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={400}>
        <Dot data={[]} x="x" y="y" fy="f" />
      </Replot>
    );
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="dot"]').length, 0);
    await harness.cleanup();
  });
});
