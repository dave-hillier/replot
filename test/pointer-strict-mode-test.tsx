// The pointer interaction under StrictMode.
//
// StrictMode mounts every component, runs its effects, tears them down and
// mounts them again — React 19 does all three inside the one commit — so every
// layout effect in the pointer path runs setup → cleanup → setup before any
// event can be delivered. Two of those effects are load-bearing: each slot
// registers the record the store hit-tests against, and <Replot>'s own effect
// points the figure holder at the root element this commit produced and then
// settles the store, which is what reports the winner. Neither was written for
// a second pass, and a second pass that leaves a stale record, a duplicated
// registration or a half-cleared guard behind would show up only here.
//
// Each case is the pointer-application test of the same name — same data, same
// gesture, same assertions — with <StrictMode> around the plot. The assertions
// are deliberately identical: the point of the file is that StrictMode changes
// nothing, so a StrictMode-specific expectation would defeat it. If one of
// these fails while its twin in pointer-application-test.tsx passes, the bug is
// in the ordering, not in the pointer rules.
//
// In particular nothing here asserts a render COUNT. StrictMode double-invokes
// every render, so the convergence assertion the twin makes ("three hovers,
// three parent renders") would be counting to six for a reason that has nothing
// to do with the invariant. Convergence is still covered: a plot that reported
// on every render would never settle, and React would fail the test outright
// with "Maximum update depth exceeded".
import assert from "assert";
import {StrictMode, useLayoutEffect, useState, type ReactElement} from "react";
import {BarY, Dot, GroupX, Replot} from "../src/react/api.js";
import jsdomit from "./jsdom.js";
import {click, hover, mountPlot, tipGroups, tipTexts} from "./pointer-harness.js";

const rows = [
  {name: "a", value: 10, group: "x"},
  {name: "b", value: 50, group: "y"},
  {name: "c", value: 90, group: "y"}
];

const bounds = {x: {domain: [0, 100]}, y: {domain: [0, 100]}} as const;

/** The plot, with StrictMode around it — the only thing this file adds. */
function strict(element: ReactElement): ReactElement {
  return <StrictMode>{element}</StrictMode>;
}

/** The centre of the *k*th rendered dot, in SVG user space. */
function dotCentre(svg: any, k: number): [number, number] {
  const circles = Array.from(svg.querySelectorAll('g[aria-label="dot"] circle') as ArrayLike<any>);
  const circle = circles[k];
  assert.ok(circle, `expected at least ${k + 1} circle(s)`);
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

/** The centre of the *k*th rendered bar, in SVG user space. */
function barCentre(svg: any, k: number): [number, number] {
  const rects = Array.from(svg.querySelectorAll('g[aria-label="bar"] rect') as ArrayLike<any>);
  const rect = rects[k];
  assert.ok(rect, `expected at least ${k + 1} bar(s)`);
  const n = (name: string) => Number(rect.getAttribute(name));
  return [n("x") + n("width") / 2, n("y") + n("height") / 2];
}

/** The `x` of every rendered dot, so a test can say the plot really did change. */
function dotXs(svg: any): number[] {
  return Array.from(svg.querySelectorAll('g[aria-label="dot"] circle') as ArrayLike<any>).map((c: any) =>
    Number(c.getAttribute("cx"))
  );
}

describe("pointer in an application, under StrictMode", () => {
  jsdomit("really is running under StrictMode double mounting", async () => {
    // The premise of the whole file, asserted rather than assumed. React only
    // tears an effect down and mounts it again in a development build, so with
    // a production React every case below would silently become a second copy
    // of pointer-application-test.tsx and cover nothing new. This checks the
    // mechanism the rest of the file leans on, not the plot: a probe component
    // mounted inside the same <StrictMode>, alongside the plot, running the
    // same layout-effect lifecycle the pointer path uses.
    let setups = 0;
    let teardowns = 0;
    function Probe() {
      useLayoutEffect(() => {
        setups++;
        return () => {
          teardowns++;
        };
      }, []);
      return null;
    }
    await mountPlot(
      <StrictMode>
        <Probe />
        <Replot width={400} height={300} {...bounds}>
          <Dot data={rows} x="value" y="value" tip />
        </Replot>
      </StrictMode>
    );
    assert.strictEqual(setups, 2, "StrictMode mounted the layout effect twice in one commit");
    assert.strictEqual(teardowns, 1, "…having torn it down between the two");
  });

  jsdomit("reports nothing for a plot the pointer has never touched", async () => {
    // The mount itself is the assertion. StrictMode runs the slots'
    // registration, the figure-holder assignment and the settle pass twice in
    // one commit; a settle that reported on the bare fact of a registration
    // would call onValue before the pointer had been anywhere.
    const reported: unknown[] = [];
    const of = (data: typeof rows) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="value" y="value" tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of(rows)));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, []);
    assert.strictEqual((harness.svg as any).value, undefined);

    await harness.rerender(strict(of(rows.slice(0, 2))));
    await harness.rerender(strict(of(rows)));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, []);
  });

  jsdomit("keeps the tip alive in a controlled plot whose rows are rebuilt on every render", async () => {
    // The controlled plot: the parent's state IS the pointer value, and the
    // rows are derived in render, so every selection rebuilds the mark's data
    // array and every row object. Under StrictMode each of those renders
    // happens twice, and the rebuilt rows reach the slots twice.
    const reported: unknown[] = [];
    function Controlled() {
      const [, setValue] = useState<any>(null);
      return (
        <Replot
          width={400}
          height={300}
          {...bounds}
          onValue={(v) => {
            reported.push(v);
            setValue(v);
          }}
        >
          <Dot data={rows.map((d) => ({...d, x: d.value, y: d.value}))} x="x" y="y" tip />
        </Replot>
      );
    }
    const harness = await mountPlot(strict(<Controlled />));

    for (const [k, lines] of [
      [0, ["x 10", "y 10"]],
      [1, ["x 50", "y 50"]],
      [2, ["x 90", "y 90"]]
    ] as [number, string[]][]) {
      await hover(harness, ...dotCentre(harness.svg, k));
      assert.deepStrictEqual(tipTexts(harness.svg), [lines], `expected a tip on dot ${k}`);
    }

    // One report per hover still: a registration that survived the remount and
    // re-resolved cleanly must not add a second, and the parent's two renders
    // per update must not either.
    assert.deepStrictEqual(
      reported.map((d: any) => d?.name),
      ["a", "b", "c"]
    );
  });

  jsdomit("shows a tip on a grouped mark in a controlled plot", async () => {
    // groupX synthesises its rows, so the datum behind a bar is rebuilt on
    // every recompute — and under StrictMode the plot recomputes twice per
    // update before the tip is read.
    const reported: unknown[] = [];
    function Controlled() {
      const [value, setValue] = useState<any>(null);
      return (
        <Replot
          width={400}
          height={300}
          onValue={(v) => {
            reported.push(v);
            setValue(v);
          }}
        >
          <GroupX y="count">
            <BarY data={rows} x="group" fill={value == null ? "black" : "red"} tip />
          </GroupX>
        </Replot>
      );
    }
    const harness = await mountPlot(strict(<Controlled />));

    await hover(harness, ...barCentre(harness.svg, 1)); // group "y", two rows
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 2", "group y"]]);
    assert.strictEqual(reported.length, 1);
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 2", "group y"]]);
    assert.strictEqual(reported.length, 1);

    await hover(harness, ...barCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 1", "group x"]]);
  });

  jsdomit("moves the tip to whatever the parent's filter leaves under the pointer", async () => {
    const reported: unknown[] = [];
    const of = (hidden: string) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={rows.filter((d) => d.name !== hidden)} x="value" y="value" tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of("")));
    assert.deepStrictEqual(dotXs(harness.svg).length, 3);

    await hover(harness, ...dotCentre(harness.svg, 1)); // {name: "b"}
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1]]);

    // Remove the FIRST row: every later index shifts down by one, so the
    // retained index 1 now names {name: "c"} while the pointer is still over
    // {name: "b"}. Membership alone would have silently changed datum here.
    await harness.rerender(strict(of("a")));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1]], "the datum did not change, so nothing was reported");

    // Now remove the hovered row itself. Nothing else is within range of the
    // pointer, so the plot shows nothing and says so.
    await harness.rerender(strict(of("b")));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);
  });

  jsdomit("clears and re-reports when the data go empty and come back", async () => {
    // The empty index registers: under StrictMode that registration is
    // unmounted and remounted, so the record the store holds after the remount
    // has to be the same one it hit-tests against.
    const reported: unknown[] = [];
    const of = (data: typeof rows) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="value" y="value" tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of(rows)));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(strict(of([])));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);

    await harness.rerender(strict(of(rows)));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1], null, rows[1]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);
  });

  jsdomit("reports the clearing value when the mark showing the tip is removed", async () => {
    const reported: unknown[] = [];
    const of = (withDots: boolean) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        {withDots ? <Dot data={rows} x="value" y="value" tip /> : null}
      </Replot>
    );
    const harness = await mountPlot(strict(of(true)));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(reported, [rows[1]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(strict(of(false)));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);
  });

  jsdomit("reports the clearing value onto the root the same commit created", async () => {
    // The sharpest case for StrictMode. The clearing report is made from
    // <Replot>'s last layout effect, through the figure holder that the effect
    // before it has just filled — and StrictMode re-runs both, plus the root's
    // own effects, in one commit. A second pass that fills the holder with the
    // element the FIRST pass produced would report into a detached node.
    const reported: unknown[] = [];
    const of = (withDots: boolean) => (
      <Replot
        width={400}
        height={300}
        {...bounds}
        title={withDots ? undefined : "Nothing to see"}
        onValue={(v) => reported.push(v)}
      >
        {withDots ? <Dot data={rows} x="value" y="value" tip /> : null}
      </Replot>
    );
    const harness = await mountPlot(strict(of(true)));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(strict(of(false)));
    const figure = harness.container.querySelector("figure");
    assert.ok(figure, "expected the plot to have grown a <figure> root");
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual(figure.value, null, "the clearing value lands on the root this commit made");
  });

  jsdomit("keeps a pinned tip through an unrelated re-render", async () => {
    const of = (fill: string) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={rows} x="value" y="value" fill={fill} tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of("black")));
    const [x, y] = dotCentre(harness.svg, 2);
    await hover(harness, x, y);
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);

    await harness.rerender(strict(of("red")));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);

    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);
    await click(harness, {x: 5, y: 5});
    assert.deepStrictEqual(tipTexts(harness.svg), []);
  });

  jsdomit("shows the tip on rows assembled from two sources", async () => {
    const measures = [10, 50, 90];
    const of = (labels: string[]) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={measures.map((v, i) => ({v, label: labels[i]}))} x="v" y="v" title="label" tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of(["a", "b", "c"])));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["b"]]);

    await harness.rerender(strict(of(["a", "B!", "c"])));
    assert.deepStrictEqual(tipTexts(harness.svg), [["B!"]]);
  });

  jsdomit("still arbitrates between pooled consumers when it re-resolves", async () => {
    const of = (fill: string) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={rows.map((d) => ({...d}))} x="value" y="value" fill={fill} tip />
        <Dot data={rows.map((d) => ({...d}))} x="value" y="value" r={2} tip />
      </Replot>
    );
    const harness = await mountPlot(strict(of("black")));
    assert.strictEqual(tipGroups(harness.svg).length, 2, "two tip slots");
    await hover(harness, ...dotCentre(harness.svg, 2));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]], "one of the two shows");

    await harness.rerender(strict(of("red")));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]], "and still exactly one");
  });
});
