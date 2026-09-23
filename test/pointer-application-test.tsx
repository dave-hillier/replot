// The pointer interaction under the shapes real applications actually have.
//
// Every regression this file exists to catch hid in the gap between a store
// unit test and an application: a rule that was obviously right over a
// hand-built record turned out to be unusable the moment a parent re-rendered,
// a transform synthesised its rows, or the data went empty. So none of these
// drive the store. They mount a plot the way an app would — a controlled plot
// whose onValue is its state, a grouped bar chart, rows derived in render, a
// filter that removes what is hovered — and assert what the user sees and what
// the plot reports.
//
// What they collectively pin is one invariant: WHAT THE PLOT SHOWS AND WHAT IT
// REPORTS CANNOT DISAGREE. The pointer has not moved, so the plot goes on
// showing whatever is under it; and whenever that changes, or stops existing,
// the report changes with it.
import assert from "assert";
import {useState} from "react";
import {BarY, Dot, GroupX, Replot} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {click, hover, mountPlot, tipGroups, tipTexts, type PointerHarness} from "./pointer-harness.js";

const rows = [
  {name: "a", value: 10, group: "x"},
  {name: "b", value: 50, group: "y"},
  {name: "c", value: 90, group: "y"}
];

const bounds = {x: {domain: [0, 100]}, y: {domain: [0, 100]}} as const;

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

describe("pointer in an application", () => {
  jsdomit("keeps the tip alive in a controlled plot whose rows are rebuilt on every render", async () => {
    // THE CONTROLLED PLOT, and the shape that broke every previous rule. The
    // parent's state is the pointer value, so every selection re-renders the
    // parent; the parent derives its rows in render, so every selection also
    // rebuilds the mark's data array AND its row objects. A rule over the array
    // reference dropped the selection that caused the render; a rule over the
    // datum's identity did the same. The tip never appeared at all.
    const reported: unknown[] = [];
    let renders = 0;
    function Controlled() {
      const [, setValue] = useState<any>(null);
      renders++;
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
          {/* Rows derived in render: new objects, new array, every time. */}
          <Dot data={rows.map((d) => ({...d, x: d.value, y: d.value}))} x="x" y="y" tip />
        </Replot>
      );
    }
    const harness = await mountPlot(<Controlled />);
    const settled = renders;

    // Every datum, so this cannot pass by the tip merely surviving once.
    for (const [k, lines] of [
      [0, ["x 10", "y 10"]],
      [1, ["x 50", "y 50"]],
      [2, ["x 90", "y 90"]]
    ] as [number, string[]][]) {
      await hover(harness, ...dotCentre(harness.svg, k));
      assert.deepStrictEqual(tipTexts(harness.svg), [lines], `expected a tip on dot ${k}`);
    }

    assert.deepStrictEqual(
      reported.map((d: any) => d?.name),
      ["a", "b", "c"]
    );
    // …and it CONVERGES. Re-resolving after the render the report caused finds
    // the same datum, so nothing further is reported and nothing further is
    // rendered: three hovers, three parent renders. A rule that reported on the
    // rebuilt row's identity would not stop here.
    assert.strictEqual(renders - settled, 3);
  });

  jsdomit("shows a tip on a grouped mark in a controlled plot", async () => {
    // groupX synthesises its rows: the datum behind a bar is a group object
    // built during the recompute, so it is a different object every time the
    // plot recomputes — and in a controlled plot it recomputes on every
    // selection. Asking whether the retained datum was still the same object
    // therefore blanked the tip on every grouped or binned mark the moment the
    // parent was driven by onValue.
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
    const harness = await mountPlot(<Controlled />);

    await hover(harness, ...barCentre(harness.svg, 1)); // group "y", two rows
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 2", "group y"]]);
    assert.strictEqual(reported.length, 1);

    // The report re-rendered the parent, which recomputed the plot and rebuilt
    // the group rows underneath the motionless pointer. The tip is still there,
    // and the plot has not reported a second time.
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 2", "group y"]]);
    assert.strictEqual(reported.length, 1);

    await hover(harness, ...barCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["Frequency 1", "group x"]]);
  });

  jsdomit("moves the tip to whatever the parent's filter leaves under the pointer", async () => {
    // A filter recomputed in JSX — the commonest reason a mark's data change
    // without the pointer moving. The selected datum is removed outright, and
    // the neighbour that takes its place is what the pointer is now over, so
    // that is what the tip shows and what the plot reports. The alternative,
    // blanking, leaves a plot that looks broken: the dot is under the cursor
    // and there is no tip on it.
    const reported: unknown[] = [];
    const of = (hidden: string) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={rows.filter((d) => d.name !== hidden)} x="value" y="value" tip />
      </Replot>
    );
    const harness = await mountPlot(of(""));
    assert.deepStrictEqual(dotXs(harness.svg).length, 3);

    await hover(harness, ...dotCentre(harness.svg, 1)); // {name: "b"}
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1]]);

    // Remove the FIRST row: every later index shifts down by one, so the
    // retained index 1 now names {name: "c"} while the pointer is still over
    // {name: "b"}. Membership alone would have silently changed datum here.
    await harness.rerender(of("a"));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1]], "the datum did not change, so nothing was reported");

    // Now remove the hovered row itself. Nothing else is within range of the
    // pointer, so the plot shows nothing and says so.
    await harness.rerender(of("b"));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);
  });

  jsdomit("clears and re-reports when the data go empty and come back", async () => {
    // GAP: a slot whose index is empty used to skip its registration
    // altogether, so the store never heard from it, nothing re-resolved, and
    // the plot went on reporting the row it had stopped drawing — with its
    // duplicate-value guard left holding that row, so the SAME row could not be
    // reported again when the data came back. An empty index registers; it is
    // simply a search that always misses.
    const reported: unknown[] = [];
    const of = (data: typeof rows) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="value" y="value" tip />
      </Replot>
    );
    const harness = await mountPlot(of(rows));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(of([]));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);

    // Back again, with no pointer event of any kind: the same row is under the
    // same point, and it reports — which it could not do while the guard was
    // poisoned.
    await harness.rerender(of(rows));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 50"]]);
    assert.deepStrictEqual(reported, [rows[1], null, rows[1]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);
  });

  jsdomit("reports the clearing value when the mark showing the tip is removed", async () => {
    // GAP: a slot that UNMOUNTS never re-registers, so there was nothing to
    // re-resolve and nothing dispatched at all — the tip vanished with its mark
    // while svg.value, onValue and the guard all went on holding its datum.
    const reported: unknown[] = [];
    const of = (withDots: boolean) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        {withDots ? <Dot data={rows} x="value" y="value" tip /> : null}
      </Replot>
    );
    const harness = await mountPlot(of(true));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(reported, [rows[1]]);
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(of(false));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual((harness.svg as any).value, null);
  });

  jsdomit("reports the clearing value onto the root the same commit created", async () => {
    // GAP: the clearing report is made from a layout effect, and until it was
    // moved to <Replot>'s own — the last one to run in the commit — it went
    // through the figure holder BEFORE that commit had filled it. A commit that
    // both drops the hovered mark and changes the plot's root element (a title
    // appearing turns the bare <svg> into a <figure>) therefore reported into
    // nothing: `value` stayed on the old root, holding a datum the plot no
    // longer drew, and the guard stayed poisoned with it.
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
    const harness = await mountPlot(of(true));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.strictEqual((harness.svg as any).value, rows[1]);

    await harness.rerender(of(false));
    const figure = harness.container.querySelector("figure");
    assert.ok(figure, "expected the plot to have grown a <figure> root");
    assert.deepStrictEqual(reported, [rows[1], null]);
    assert.strictEqual(figure.value, null, "the clearing value lands on the root this commit made");
  });

  jsdomit("keeps a pinned tip through an unrelated re-render", async () => {
    // A pin is the user's deliberate act, and an unrelated re-render — a
    // sibling's state, a colour, a legend, anything that recomputes the plot
    // without touching what is under the pin — must leave it exactly where it
    // is. It is the same mechanism as everything else here: the plot is
    // re-resolved at the point the pin was taken, and the pin is handed back to
    // the record that claimed it.
    const of = (fill: string) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={rows} x="value" y="value" fill={fill} tip />
      </Replot>
    );
    const harness = await mountPlot(of("black"));
    const [x, y] = dotCentre(harness.svg, 2);
    await hover(harness, x, y);
    await click(harness, {x, y});
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);

    await harness.rerender(of("red"));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);

    // Still pinned: a pointermove elsewhere does not move it…
    await hover(harness, ...dotCentre(harness.svg, 0));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]]);
    // …and a pointerdown on empty space still dismisses it.
    await click(harness, {x: 5, y: 5});
    assert.deepStrictEqual(tipTexts(harness.svg), []);
  });

  jsdomit("shows the tip on rows assembled from two sources", async () => {
    // Rows built in render from more than one source have no identity to
    // appeal to at all: there is no original row object anywhere, and the
    // array cannot be memoised without memoising both sources. This is the
    // ordinary shape of a dashboard mark, and it must behave like any other.
    const measures = [10, 50, 90];
    const of = (labels: string[]) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={measures.map((v, i) => ({v, label: labels[i]}))} x="v" y="v" title="label" tip />
      </Replot>
    );
    const harness = await mountPlot(of(["a", "b", "c"]));
    await hover(harness, ...dotCentre(harness.svg, 1));
    assert.deepStrictEqual(tipTexts(harness.svg), [["b"]]);

    // One source changes; the rows are rebuilt from scratch, and the tip
    // follows the point rather than the vanished object.
    await harness.rerender(of(["a", "B!", "c"]));
    assert.deepStrictEqual(tipTexts(harness.svg), [["B!"]]);
  });

  jsdomit("does not conjure a tip on a plot the pointer has never touched", async () => {
    // The other half of remembering a position: before there is one, a
    // recompute must select nothing. A live-updating chart that nobody is
    // pointing at must not start reporting values, and a plot must not come up
    // with a tip already showing.
    const reported: unknown[] = [];
    const of = (data: typeof rows) => (
      <Replot width={400} height={300} {...bounds} onValue={(v) => reported.push(v)}>
        <Dot data={data} x="value" y="value" tip />
      </Replot>
    );
    const harness: PointerHarness = await mountPlot(of(rows));
    assert.deepStrictEqual(tipTexts(harness.svg), []);

    await harness.rerender(of(rows.slice(0, 2)));
    await harness.rerender(of(rows));
    assert.deepStrictEqual(tipTexts(harness.svg), []);
    assert.deepStrictEqual(reported, []);
    assert.strictEqual((harness.svg as any).value, undefined);
  });

  jsdomit("still arbitrates between pooled consumers when it re-resolves", async () => {
    // Two marks, each with its own inferred tip, drawn on top of one another.
    // A mark's inferred tip pools, so exactly one tip may show: the
    // re-resolution has to run the whole arbitration — every registration in
    // one pass, then the pool's winner — and not merely ask each record for its
    // own nearest, which would show two tips stacked on the same datum.
    const of = (fill: string) => (
      <Replot width={400} height={300} {...bounds}>
        <Dot data={rows.map((d) => ({...d}))} x="value" y="value" fill={fill} tip />
        <Dot data={rows.map((d) => ({...d}))} x="value" y="value" r={2} tip />
      </Replot>
    );
    const harness = await mountPlot(of("black"));
    assert.strictEqual(tipGroups(harness.svg).length, 2, "two tip slots");
    await hover(harness, ...dotCentre(harness.svg, 2));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]], "one of the two shows");

    await harness.rerender(of("red"));
    assert.deepStrictEqual(tipTexts(harness.svg), [["value 90"]], "and still exactly one");
  });
});
