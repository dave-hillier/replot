// Sticky modality: a pointerdown pins the current selection, a second one
// releases it, and a click INSIDE a pinned mark does neither — which is what
// makes a pinned tip's text selectable.
//
// The other half of the modality is the pointer-events default: while a
// pointer-driven mark is showing but not pinned it must not intercept the very
// events that drive it (upstream style.js defaults pointer-events from
// context.pointerSticky), and when it is pinned it must.
import assert from "assert";
import {Crosshair, Dot, Replot} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {click, hover, leave, mountPlot, tipGroups, tipTexts, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10},
  {x: 50, y: 70},
  {x: 90, y: 30}
];

function circles(harness: PointerHarness, k = 0): any[] {
  const group = harness.svg.querySelectorAll('g[aria-label="dot"]')[k];
  assert.ok(group, `expected at least ${k + 1} dot mark(s)`);
  return Array.from(group.querySelectorAll("circle"));
}

function centreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

/** Mounts a dot plot with a tip and hovers its second datum. */
async function hovered(): Promise<{harness: PointerHarness; at: [number, number]}> {
  const harness = await mountPlot(
    <Replot width={400} height={300}>
      <Dot data={dots} x="x" y="y" tip />
    </Replot>
  );
  const at = centreOf(circles(harness)[1]);
  await hover(harness, ...at);
  assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]], "expected the hover to select before pinning");
  return {harness, at};
}

describe("pointer sticky", () => {
  jsdomit("a pointerdown pins the selection and restores pointer events", async () => {
    const {harness, at} = await hovered();
    assert.strictEqual(tipGroups(harness.svg)[0].getAttribute("pointer-events"), "none");

    await click(harness, {x: at[0], y: at[1]});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]]);
    assert.strictEqual(
      tipGroups(harness.svg)[0].getAttribute("pointer-events"),
      null,
      "a pinned tip must accept pointer events so its text can be selected"
    );
    await harness.cleanup();
  });

  jsdomit("a pinned selection survives a pointermove elsewhere", async () => {
    const {harness, at} = await hovered();
    await click(harness, {x: at[0], y: at[1]});
    await hover(harness, 120, 250);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]]);
    await harness.cleanup();
  });

  jsdomit("a pointerdown inside the pinned mark does not dismiss it", async () => {
    const {harness, at} = await hovered();
    await click(harness, {x: at[0], y: at[1]});

    // The tip's own <path>, with the event bubbling up to the svg as a real one
    // would. Upstream tests every currently-rendered pointer root for
    // containment (pointer.js:193) and stays pinned when one contains the
    // target; without that test, selecting the tip's text dismisses the tip.
    const path = tipGroups(harness.svg)[0].querySelector("path");
    assert.ok(path, "expected the pinned tip to have rendered a path");
    await click(harness, {x: at[0], y: at[1], target: path});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]]);
    await harness.cleanup();
  });

  jsdomit("a pointerdown on empty space dismisses the pin and clears every pointer mark", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <Crosshair data={dots} x="x" y="y" />
      </Replot>
    );
    const at = centreOf(circles(harness)[1]);
    await hover(harness, ...at);
    await click(harness, {x: at[0], y: at[1]});
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="crosshair rule"] line').length, 2);

    // Nothing under the pointer and nothing containing the target: the pin is
    // released and every pointer mark is cleared, not just the claiming one.
    await click(harness, {x: 120, y: 250});
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="crosshair rule"] line').length, 0);
    assert.strictEqual(harness.svg.querySelectorAll('g[aria-label="crosshair text"] text').length, 0);
    await harness.cleanup();
  });

  jsdomit("a pointerleave does not clear a pinned selection", async () => {
    const {harness, at} = await hovered();
    await click(harness, {x: at[0], y: at[1]});
    await leave(harness);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]]);
    await harness.cleanup();
  });

  jsdomit("a hovered but unpinned pointer consumer does not intercept pointer events", async () => {
    const {harness} = await hovered();
    assert.strictEqual(tipGroups(harness.svg)[0].getAttribute("pointer-events"), "none");
    await harness.cleanup();
  });

  jsdomit("a pointerdown pins nothing when the first-registered pointer mark is not pointing", async () => {
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
    const at = centreOf(circles(harness, 1)[1]);
    await hover(harness, ...at);
    // Only that the right-hand tip is showing: which OTHER tips are showing is
    // the multi-consumer file's business, not this one's.
    assert.ok(
      tipTexts(harness.svg).some((lines) => lines.join() === "x 90,y 90"),
      "expected the hovered mark's own tip to be showing before the click"
    );

    // Upstream's handledEvents WeakSet means the FIRST-registered pointer mark
    // claims the pointerdown, and its own selection decides: the left tip has
    // nothing in range, so the click toggles nothing at all and the right tip
    // is still an ordinary hover.
    await click(harness, {x: at[0], y: at[1]});
    // The centre of the frame: more than maxRadius from all four datums, which
    // sit at (40,270) and (82.5,238.75) on the left and (337.5,51.25) and
    // (380,20) on the right. Had the click pinned, this move would change
    // nothing and the right-hand tip would still be showing.
    await hover(harness, 210, 145);
    assert.deepStrictEqual(tipTexts(harness.svg), [], "expected the selection not to have been pinned");
    await harness.cleanup();
  });

  jsdomit("a pointerdown still unpins when a consumer has mounted ahead of the pin holder", async () => {
    // Upstream gives the pointerdown to the first-registered handler and lets
    // its own focused index decide (the test above), but it also guarantees —
    // without ever having to say so — that the first handler IS the pin holder
    // whenever there is a pin: its listeners are fixed for the life of a
    // render, so nothing can register in front of it mid-pin, a pin can only be
    // taken while it was pointing, and pointermove returns early while sticky.
    //
    // React's registry has no such guarantee. Toggling a <Crosshair> on (or
    // giving an earlier mark a tip) puts a record with no selection at the head
    // of the registry while the tip's pin is still held, and reading
    // first-registered literally would then wedge the plot for good: the
    // pointerdown returns at "the claimant is not pointing", the modality stays
    // sticky because the pin holder is still registered, and move() and leave()
    // both return early on sticky. No gesture could ever recover it.
    const view = (withCrosshair: boolean) => (
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" tip />
        {withCrosshair ? <Crosshair data={dots} x="x" y="y" /> : null}
      </Replot>
    );
    const harness = await mountPlot(view(false));
    const at = centreOf(circles(harness)[1]);
    await hover(harness, ...at);
    await click(harness, {x: at[0], y: at[1]});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]], "expected the click to pin");

    await harness.rerender(view(true));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 70"]], "the pin survives the crosshair mounting");

    // The gesture that must always work: a pointerdown while pinned unpins.
    await click(harness, {x: at[0], y: at[1]});
    assert.deepStrictEqual(tipTexts(harness.svg), [], "expected the second click to unpin");

    // …and the plot answers the pointer again, which is what "unwedged" means.
    await hover(harness, ...centreOf(circles(harness)[2]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 30"]]);
    await harness.cleanup();
  });
});
