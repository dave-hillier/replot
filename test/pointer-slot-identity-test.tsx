// What a pointer slot IS, and what it keeps when the plot recomputes.
//
// A pointer consumer's selection does not live in the mark: <PointerMarkSlot>
// holds a registration record created once per slot instance and deliberately
// kept across re-registration, because the registration effect re-runs on every
// recompute (mark.filter reallocates the index). What the record keeps is the
// SLOT, not a claim about the data — the selection it holds is an index into
// channel arrays the recompute has just thrown away. So the store does not try
// to validate it. It re-runs the hit test at the last pointer position against
// the new plot, exactly as a pointermove would, and whatever is under the
// pointer now becomes the selection.
//
// That collapses the questions this file used to ask one at a time:
//
//   1. rows rebuilt, reordered, filtered, grouped or derived in render all
//      behave the same, because none of them move the pointer, and none of
//      them are asked to prove an identity they do not have;
//   2. a slot handed to a different mark by a reused fiber — React's unkeyed
//      siblings have no stable identity, so no key scheme can prevent it —
//      re-resolves against that mark's own data, at a place the pointer is
//      nowhere near, and shows nothing;
//   3. and a plot that stops showing a datum stops reporting it, because the
//      re-resolution dispatches its result like any other search.
//
// All of it is answered here through the DOM, plus the slot-order arithmetic
// the store sorts on. The realistic application shapes — controlled plots,
// transforms, filters, empty data — are in pointer-application-test.tsx.
import assert from "assert";
import {createElement, useState} from "react";
import {Dot, Replot} from "../src/react/index.js";
import {renderMarksWith} from "../src/react/Replot.js";
import jsdomit from "./jsdom.js";
import {click, hover, mountPlot, tipGroups, tipTexts} from "./pointer-harness.js";

const three = [
  {x: 10, y: 10},
  {x: 50, y: 50},
  {x: 90, y: 90}
];

/** The `transform` of every rendered tip group, so a NaN placement is visible. */
function tipTransforms(svg: any): (string | null)[] {
  return tipGroups(svg).map((group: any) => group.getAttribute("transform"));
}

describe("pointer slot identity", () => {
  jsdomit("shows nothing when the data under the pointer are gone", async () => {
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    const atRest = tipTransforms(harness.svg);

    await hover(harness, ...lastDotCentre(harness.svg));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    // Index 2 of the old data; the new mark draws one datum, so it names
    // nothing. A slot that simply kept rendering [2] put the tip at
    // translate(NaN,NaN) with no lines, and no gesture could dismiss it — the
    // selection was not stale, merely meaningless. Re-resolved, the search at
    // the unmoved pointer finds no datum within its radius and the tip goes.
    await harness.rerender(
      <Replot width={400} height={300}>
        <Dot data={three.slice(0, 1)} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(tipTransforms(harness.svg), atRest); // and not translate(NaN,NaN)
  });

  jsdomit("shows nothing when the mark's filter rejects the datum under the pointer", async () => {
    // The same failure by the other route: the data keep their length, but the
    // selected datum's y channel goes undefined, so mark.filter drops it from
    // the index (mark.js:105-111) and the retained 2 names a filtered-out datum.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    const atRest = tipTransforms(harness.svg);
    await hover(harness, ...lastDotCentre(harness.svg));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    const holed = [three[0], three[1], {x: 90, y: undefined}];
    await harness.rerender(
      <Replot width={400} height={300}>
        <Dot data={holed} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(tipTransforms(harness.svg), atRest); // and not translate(NaN,NaN)
  });

  jsdomit("re-resolves a pinned tip at the place it was pinned", async () => {
    // A pin is a pin on a PLACE. The user pinned what was under the pointer,
    // and only the record that claimed the pointerdown carries sticky in its
    // own selection, so the re-resolution has to hand the pin back to it —
    // and hand it back over whatever the recompute has put under that point.
    // Here the plot rescales when the last datum goes, so the middle dot moves
    // under the pinned point and the pinned tip shows it: what is pinned is
    // still what is drawn there, which is the only claim the store can honour
    // once the datum's identity is gone.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    const [x, y] = lastDotCentre(harness.svg);
    await hover(harness, x, y);
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    await harness.rerender(
      <Replot width={400} height={300}>
        <Dot data={three.slice(0, 2)} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);

    // …and the pin is still a pin, held by that same slot: a pointerdown
    // dismisses it, and the plot answers the pointer again afterwards.
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 10"]]);
  });

  jsdomit("releases the sticky modality when nothing is left under the pin", async () => {
    // The pin cannot outlive its own selection. Only the claiming record
    // carries sticky, so a pin over nothing would make the plot sticky with
    // nothing to show — and move(), leave() and down() all return early on
    // sticky, so no gesture could ever recover it.
    const harness = await mountPlot(
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    const [x, y] = lastDotCentre(harness.svg);
    await hover(harness, x, y);
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    await harness.rerender(
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={[]} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), []);

    // The plot still responds to the pointer.
    await harness.rerender(
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 10"]]);
  });

  jsdomit("keeps a retained selection across a recompute of the same data", async () => {
    // The other half of the rule, and the reason the record survives
    // re-registration at all: a recompute that leaves the mark looking at the
    // same data must not blank the tip. Changing the dot radius bumps the mark
    // stamp, so every mark instance, index, channel and anchor is rebuilt —
    // everything except the data reference the selection was made against.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    await hover(harness, ...lastDotCentre(harness.svg));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    await harness.rerender(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" r={7} tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);
  });

  jsdomit("keeps the selection when the data array is rebuilt with fresh rows", async () => {
    // Fresh ROW OBJECTS, not merely a fresh array — `rows.map(d => ({...d}))`,
    // rows assembled from two sources, and every grouping transform, which
    // synthesises its group rows on each recompute. A rule over the datum's
    // identity cleared the tip here, which made a tip unusable on any grouped
    // or binned mark in a plot whose parent re-renders. Nothing about identity
    // is asked now: the pointer has not moved, a datum is drawn under it, and
    // that is the datum shown.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={three} x="x" y="y" tip />
      </Replot>
    );
    await hover(harness, ...lastDotCentre(harness.svg));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    await harness.rerender(
      <Replot width={400} height={300}>
        <Dot data={three.map((d) => ({...d}))} x="x" y="y" tip />
      </Replot>
    );
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 90"]]);

    // And it is a live selection, not a frozen one: the pointer still moves it.
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 10"]]);
  });

  jsdomit("does not hand one mark's pinned selection to another when a mark is dropped", async () => {
    // Two dots, each with its own inferred tip. The right-hand dot is 320px
    // from the left-hand one, well outside the 40px maxRadius, so its tip can
    // never be selected by a hover on the left.
    const left = [{x: 10, y: 50}];
    const right = [{x: 90, y: 50}];
    const both = (leftTip: boolean) => (
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={left} x="x" y="y" tip={leftTip} />
        <Dot data={right} x="x" y="y" tip />
      </Replot>
    );
    const harness = await mountPlot(both(true));
    assert.strictEqual(tipGroups(harness.svg).length, 2);

    const [x, y] = dotCentre(harness.svg, 0);
    await hover(harness, x, y);
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 50"]]);
    await click(harness, {x, y}); // pin it
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 50"]]);

    // Drop the left tip. Keyed by position, the surviving tip's slot would be
    // the fiber the pinned one occupied, inheriting its registration record,
    // its selection and its sticky flag: a tip that has never been selectable
    // from here comes up already pinned, on index 0 of whichever data it now
    // indexes.
    await harness.rerender(both(false));
    assert.strictEqual(tipGroups(harness.svg).length, 1);
    assert.deepStrictEqual(tipTexts(harness.svg), []);
  });

  jsdomit("un-wedges the plot when the record holding the pin departs for good", async () => {
    // The pin's flag lives in the CLAIMANT's own selection, and a record that
    // unmounts takes no revalidation with it: nothing on the way out inspects
    // it. If the plot's sticky modality were a flag of its own it would stay
    // raised with no owner, and move(), leave() and down() would all return
    // early forever — move and leave on sticky, down because the claimant is
    // gone from `regs` and whoever is now first is not pointing.
    const left = [{x: 10, y: 50}];
    const right = [{x: 90, y: 50}];
    const both = (leftTip: boolean) => (
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={left} x="x" y="y" tip={leftTip} />
        <Dot data={right} x="x" y="y" tip />
      </Replot>
    );
    const harness = await mountPlot(both(true));
    const [x, y] = dotCentre(harness.svg, 0);
    await hover(harness, x, y);
    await click(harness, {x, y}); // pin the left tip
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 50"]]);

    await harness.rerender(both(false)); // the pinning slot is gone for good

    // The surviving tip must still answer the pointer.
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 50"]]);
  });

  jsdomit("does not hand a pinned selection to the sibling that reuses its fiber", async () => {
    // React assigns useId at MOUNT and stores it in the fiber's hook state, so
    // it names a POSITION that survives, not a component. Two unkeyed sibling
    // <Dot>s, first removed: reconcileSingleElement matches the surviving
    // element against the first existing child by key (both null) and type, so
    // the second component renders on the FIRST one's fiber and inherits its
    // useId — and with it the mark key, the pointer slot's fiber and the
    // registration record holding the pin. No key scheme can prevent that;
    // only a validity rule on the retained selection can.
    const left = [{x: 10, y: 50}];
    const right = [{x: 90, y: 50}];
    const harness = await mountPlot(
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={left} x="x" y="y" tip />
        <Dot data={right} x="x" y="y" tip />
      </Replot>
    );
    const [x, y] = dotCentre(harness.svg, 0);
    await hover(harness, x, y);
    await click(harness, {x, y}); // pin the left tip
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 10", "y 50"]]);

    await harness.rerender(
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={right} x="x" y="y" tip />
      </Replot>
    );

    // The survivor has never been hovered: it must render no tip at all, and
    // the plot must not be stuck in the departed slot's sticky modality.
    assert.strictEqual(tipGroups(harness.svg).length, 1);
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 90", "y 50"]]);
  });

  jsdomit("follows the datum when an earlier one is removed under it", async () => {
    // The index is a list of DATA indices, so removing an element before the
    // selected one leaves the retained index a member of the new index array
    // while every datum from there on has shifted down by one: membership
    // alone re-points the tip at a neighbour, with the pointer motionless over
    // the dot it chose. Re-resolving asks where the pointer is, so the index
    // shifts with the data and the tip stays on the datum it was on.
    const four = [
      {x: 10, y: 50},
      {x: 30, y: 50},
      {x: 50, y: 50},
      {x: 70, y: 50}
    ];
    const of = (data: {x: number; y: number}[]) => (
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}}>
        <Dot data={data} x="x" y="y" tip />
      </Replot>
    );
    const harness = await mountPlot(of(four));
    await hover(harness, ...dotCentre(harness.svg, 2));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);

    await harness.rerender(of(four.slice(1)));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);
  });

  jsdomit("keeps the live selection in a controlled plot that rebuilds its data array", async () => {
    // The rule tests the DATUM, never the array reference, and this is why. A
    // parent whose state is driven by onValue re-renders on every selection,
    // and the ordinary React idiom rebuilds the mark's data array in the middle
    // of that render (`rows.map(…)`, `[...rows]`, a filter recomputed in JSX).
    // A reference test therefore dropped the very selection that caused the
    // render, and the tip never appeared at all: not a corner case, but the
    // controlled plot a React port exists to serve.
    const reported: unknown[] = [];
    function Controlled() {
      const [value, setValue] = useState<unknown>(null);
      return (
        <Replot
          width={400}
          height={300}
          x={{domain: [0, 100]}}
          y={{domain: [0, 100]}}
          onValue={(v) => {
            reported.push(v);
            setValue(v);
          }}
        >
          {/* A fresh array of the SAME rows, rebuilt on every parent render. */}
          <Dot data={three.map((d) => d)} x="x" y="y" tip fill={value == null ? "black" : "red"} />
        </Replot>
      );
    }
    const harness = await mountPlot(<Controlled />);

    // All three datums, so this cannot pass by the tip merely surviving once.
    for (const [k, lines] of [
      [0, ["x 10", "y 10"]],
      [1, ["x 50", "y 50"]],
      [2, ["x 90", "y 90"]]
    ] as [number, string[]][]) {
      await hover(harness, ...dotCentre(harness.svg, k));
      assert.deepStrictEqual(tipTexts(harness.svg), [lines], `expected a tip on dot ${k}`);
    }
    assert.deepStrictEqual(reported, [three[0], three[1], three[2]]);
  });

  jsdomit("stops REPORTING the datum it stops showing", async () => {
    // Ceasing to show a datum is not only a rendering change. The record stops
    // drawing it, so the plot has to stop reporting it: `svg.value` (and
    // `figure.value`, and the bubbling input event) must follow the tip, and
    // the last onValue call must be followed by a null. Leaving the value
    // behind also poisoned the store's duplicate-value guard, which then
    // swallowed a later genuine re-selection of that very datum.
    const reported: unknown[] = [];
    const of = (data: {x: number; y: number}[]) => (
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="x" y="y" tip />
      </Replot>
    );
    const harness = await mountPlot(of(three));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);
    assert.deepStrictEqual(reported, [three[1]]);
    assert.strictEqual((harness.svg as any).value, three[1]);

    await harness.rerender(of([three[0]]));
    assert.deepStrictEqual(tipTexts(harness.svg), [], "the tip goes");
    assert.deepStrictEqual(reported, [three[1], null], "and the reported value goes with it");
    assert.strictEqual((harness.svg as any).value, null);

    // …and the guard is not poisoned: the same datum reports again when it
    // comes back under the motionless pointer.
    await harness.rerender(of(three));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);
    assert.deepStrictEqual(reported, [three[1], null, three[1]]);
  });

  jsdomit("goes on reporting an equal row it has replaced with a fresh object", async () => {
    // The one thing the design gives up, asserted so it is visible rather than
    // folklore. A recompute that rebuilds the rows leaves the selection on the
    // same INDEX, so nothing has changed as far as the store is concerned and
    // nothing is reported — while the tip now draws a freshly minted, equal
    // object. `svg.value` therefore holds a row that is deep-equal to the one
    // on screen but not identical to it.
    //
    // The alternative is worse: reporting on the datum's identity makes a
    // controlled plot re-render, which rebuilds the rows, which changes the
    // identity again — an unbounded loop on exactly the shape this design
    // exists to serve.
    const reported: unknown[] = [];
    const of = (data: {x: number; y: number}[]) => (
      <Replot width={400} height={300} x={{domain: [0, 100]}} y={{domain: [0, 100]}} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="x" y="y" tip />
      </Replot>
    );
    const harness = await mountPlot(of(three));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.strictEqual((harness.svg as any).value, three[1]);

    const rebuilt = three.map((d) => ({...d}));
    await harness.rerender(of(rebuilt));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]], "the tip is drawn from the new row");
    assert.deepStrictEqual(reported, [three[1]], "and nothing further is reported");
    assert.notStrictEqual((harness.svg as any).value, rebuilt[1]);
    assert.deepStrictEqual((harness.svg as any).value, rebuilt[1]);

    // The next real change reports normally: the stale identity is not sticky.
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(reported, [three[1], rebuilt[0]]);
  });

  jsdomit("does not hand a pin to a sibling mark that SHARES its data array", async () => {
    // The case no rule over the data could close, and the sharpest evidence
    // that the data were the wrong thing to ask about.
    //
    // Two unkeyed sibling marks over the SAME array: remove the first and the
    // survivor renders on its fiber, inheriting its registration record and its
    // pin (see the fiber-reuse case above). Every clause of the old rule passed
    // — the index still contained the selection, and the datum at that index
    // was the same OBJECT, because the two marks share the array — so the pin
    // rode across onto a mark the pointer had never been over. Visible harm,
    // not a redundant tip: the two marks place the same datum differently (y
    // versus z).
    //
    // Re-resolution closes it while knowing nothing about either mark. The
    // survivor is searched where the pointer actually is, and it draws nothing
    // there. (A survivor that did draw a datum at that very point would keep
    // the pin — and would be showing what the pointer is over.)
    const shared = [
      {x: 10, y: 50, z: 90},
      {x: 50, y: 50, z: 10}
    ];
    const bounds = {x: {domain: [0, 100]}, y: {domain: [0, 100]}} as const;
    const harness = await mountPlot(
      <Replot width={400} height={300} {...bounds}>
        <Dot data={shared} x="x" y="y" tip />
        <Dot data={shared} x="x" y="z" tip />
      </Replot>
    );
    const [x, y] = dotCentre(harness.svg, 1);
    await hover(harness, x, y);
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "y 50"]]);

    await harness.rerender(
      <Replot width={400} height={300} {...bounds}>
        <Dot data={shared} x="x" y="z" tip />
      </Replot>
    );
    // The survivor draws {x: 50, z: 10} nowhere near the pinned point, so its
    // search misses and the pin is released with the selection it held.
    assert.deepStrictEqual(tipTexts(harness.svg), []);

    // And the plot is not wedged: it answers the pointer again.
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["x 50", "z 10"]]);
  });

  it("gives every slot of a heavily faceted plot a distinct order", () => {
    // The store sorts registrations by `order` and reads regs[0] for both the
    // pool contagion and the pointerdown claimant, so two slots sharing an
    // order put those back in the hands of effect-firing order. A fixed stride
    // of 1000 is exceeded by a 32-by-32 facet grid.
    const facetCount = 32 * 32;
    const orders = ordersOf(2, facetCount);
    assert.strictEqual(orders.length, 2 * facetCount);
    assert.strictEqual(new Set(orders).size, orders.length, "slot orders must be unique");
    assert.deepStrictEqual(
      orders,
      [...orders].sort((a, b) => a - b),
      "and increasing in document order"
    );
  });
});

/** Runs the shared mark walker over *markCount* marks across *facetCount* facets. */
function ordersOf(markCount: number, facetCount: number): number[] {
  const facets = Array.from({length: facetCount}, (_, i) => ({i, x: i, y: null, empty: false}));
  const marks = Array.from({length: markCount}, () => ({filter: (index: any) => index}));
  const stateByMark = new Map(marks.map((mark) => [mark, {channels: {}, values: {}, facets: [[0]]}]));
  const orders: number[] = [];
  renderMarksWith(
    {
      marks,
      stateByMark,
      facetStateByMark: new Map(),
      scales: {},
      superdimensions: {},
      subdimensions: {},
      context: {},
      facets,
      facetDomains: {},
      facetTranslate: undefined
    },
    (mark, index, values, dims, scales, context, key, order) => {
      orders.push(order);
      return createElement("g", {key});
    }
  );
  return orders;
}

/** The centre of the *k*th rendered circle, in SVG user space. */
function dotCentre(svg: any, k: number): [number, number] {
  const circles = Array.from(svg.querySelectorAll('g[aria-label="dot"] circle') as ArrayLike<any>);
  const circle = circles[k];
  assert.ok(circle, `expected at least ${k + 1} circle(s)`);
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

function lastDotCentre(svg: any): [number, number] {
  return dotCentre(svg, svg.querySelectorAll('g[aria-label="dot"] circle').length - 1);
}
