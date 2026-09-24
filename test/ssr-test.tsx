// Server rendering (#147). There is no document in this process — mocha runs
// these files in Node, and test/jsdom.js installs a jsdom global only around
// the tests it wraps — so renderToString here is a genuine server render:
// nothing commits, and no effect ever runs.
//
// That is the whole difficulty the plot has to solve, and the reason it
// returned `<div class="plot-host"></div>` before this: marks register from
// layout effects and <Replot> computes from a layout effect of its own, so a
// render with no effects renders an empty container. The fix moves both into
// the render phase, where they can only be taken in one order — the marks
// register while they render, and the plot is computed and rendered AFTER them
// (see useMark and ServerPlot). These tests pin what that produces, and what a
// server render cannot do.
import assert from "assert";
import {renderToString} from "react-dom/server";
import {Dot, Legend, Replot, RuleY, ScaleY} from "../src/react/api.js";
import {consumeWarnings} from "../src/warnings.js";

const data = [
  {x: 0, y: 1, c: "a"},
  {x: 10, y: 10, c: "b"},
  {x: 20, y: 1000, c: "c"}
];

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The serialized y-axis tick labels. A tick assertion has to name the axis it
 * means: the x axis of a plot whose data starts at zero ticks at zero whatever
 * the y scale does. */
function yAxisTicks(markup: string): string {
  const from = markup.indexOf('aria-label="y-axis tick label"');
  if (from < 0) return "";
  const to = markup.indexOf('aria-label="y-axis label"');
  return markup.slice(from, to < 0 ? undefined : to);
}

describe("server rendering", () => {
  it("renders the plot, not an empty host", () => {
    const markup = renderToString(
      <Replot width={400} height={200}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    // The registrations come first, and they have to: a parent's render body
    // runs before its children's, so the subtree that registers the marks can
    // only register before the plot computed from them, never after (see
    // ServerPlot). The div is display: none, so the order costs the page
    // nothing.
    assert.match(
      markup,
      /^<div style="display:none"><\/div><svg class="replot-d6a7b5"/,
      "the plot's own <svg> shell should follow the registrations"
    );
    assert.ok(!markup.includes("plot-host"), "the empty host is what a server render replaces");
    assert.strictEqual(count(markup, 'aria-label="dot"'), 1);
    assert.strictEqual(count(markup, "<circle"), data.length);
    // The inferred axes are part of the plot, and they are computed from the
    // same pass (nothing else could have supplied their ticks).
    assert.strictEqual(count(markup, 'aria-label="x-axis tick"'), 1);
  });

  it("registers the marks in tree order", () => {
    const dot = <Dot data={data} x="x" y="y" />;
    const rule = <RuleY y={10} />;
    const forwards = renderToString(
      <Replot width={400} height={200}>
        {dot}
        {rule}
      </Replot>
    );
    // Marks draw in the order they are written, not in the order they happen
    // to register: the two orders are the same on a server render, which is
    // what makes the render-phase registration sound (see ServerPlot).
    assert.ok(
      forwards.indexOf('aria-label="dot"') < forwards.indexOf('aria-label="rule"'),
      "the first mark written should draw first"
    );
    const backwards = renderToString(
      <Replot width={400} height={200}>
        {rule}
        {dot}
      </Replot>
    );
    assert.ok(
      backwards.indexOf('aria-label="rule"') < backwards.indexOf('aria-label="dot"'),
      "and reversing the children should reverse the output"
    );
  });

  it("merges scale components and explicit scale props into the pass", () => {
    const component = renderToString(
      <Replot width={400} height={200}>
        <ScaleY type="log" label="Price" />
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    // The label comes from the <ScaleY> element's registration, so it can only
    // be there if a scale component registers during render too.
    assert.ok(component.includes(">↑ Price<"), "the scale component's label should reach the axis");
    // A log scale ticks at powers of ten; a linear one over this data ticks at
    // hundreds. Same plot, same data, so the difference is the scale's type.
    assert.ok(yAxisTicks(component).includes(">1<"), "a log y scale should tick at 1");
    assert.ok(yAxisTicks(component).includes(">10<"), "and at 10");
    const linear = renderToString(
      <Replot width={400} height={200}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.ok(!yAxisTicks(linear).includes(">10<"), "the same plot without the scale component ticks at neither");
    // An explicit object prop is the other way to declare a scale, and it
    // takes the same path into the pass.
    const explicit = renderToString(
      <Replot width={400} height={200} y={{label: "Explicit"}}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.ok(explicit.includes(">↑ Explicit<"));
  });

  it("resolves auto legends and the figure around them", () => {
    const markup = renderToString(
      <Replot title="Colours" color={{legend: true}}>
        <Dot data={data} x="x" y="y" stroke="c" />
      </Replot>
    );
    // The figure exists because the legend and the title do — which is only
    // known once the plot has been computed, so a server render that resolved
    // nothing would emit the bare plot instead.
    assert.ok(markup.includes('<figure style="max-width:initial">'), "the figure should wrap the plot");
    assert.ok(markup.includes(">Colours<"));
    // An auto legend is appended bare, with no .plot-legend wrapper: upstream's
    // createLegends appends its svgs straight to the figure, and legend
    // resolution is what decides whether one exists at all.
    assert.ok(markup.includes("swatches-wrap"), "the colour scale's legend should be rendered");
    for (const value of ["a", "b", "c"]) assert.ok(markup.includes(`>${value}<`), `missing swatch ${value}`);
  });

  it("renders an explicit legend from its registration", () => {
    // The colour scale is declared as a plot option with no legend requested,
    // so the ONLY legend in the output is the registered one: the <Legend>
    // element renders nothing where it sits, and the figure slot it registers
    // with is what shows it.
    const markup = renderToString(
      <Replot color={{domain: ["a", "b", "c"]}}>
        <Legend scale="color" legend="ramp" label="Legend label" />
        <Dot data={data} x="x" y="y" fill="c" />
      </Replot>
    );
    assert.strictEqual(count(markup, 'class="plot-legend"'), 1);
    assert.ok(markup.includes(">Legend label<"), "the label comes from the legend's own props");
  });

  it("paints a ramp legend with a gradient, having no canvas to paint it with", () => {
    // The imperative ramp legend is a 256x1 canvas rendered into a data URL, and
    // a server render has no canvas to render one with. The interpolator is
    // emitted as a gradient instead, so the legend is complete in the markup
    // rather than an empty frame where the ramp should be.
    const markup = renderToString(
      <Replot color={{domain: [0, 100]}}>
        <Legend scale="color" legend="ramp" />
        <Dot data={data} x="x" y="y" fill="c" />
      </Replot>
    );
    assert.ok(markup.includes("<linearGradient"), "the ramp should be a gradient");
    assert.ok(markup.includes('fill="url(#plot-ramp-'), "and the ramp body should reference it");
    assert.ok(markup.includes("<stop "), "the gradient should be sampled into stops");
    assert.ok(!markup.includes("data:image/png"), "there is no canvas to produce a data URL with");
  });

  it("renders a pointer consumer at rest", () => {
    // A tip is a pointer consumer, so <Replot> routes it through the pointer
    // store, which has no selection at rest and renders the mark itself inside
    // the tip's group. Nothing can be hovered in markup, so the store's server
    // snapshot is what this path reads.
    const markup = renderToString(
      <Replot width={400} height={200}>
        <Dot data={data} x="x" y="y" tip />
      </Replot>
    );
    assert.match(markup, /<svg class="replot-d6a7b5"/, "the plot should still render");
    assert.strictEqual(count(markup, 'aria-label="tip"'), 1, "the pointer consumer's group is rendered");
    assert.strictEqual(count(markup, 'aria-label="dot"'), 1);
    assert.strictEqual(count(markup, "<circle"), data.length, "at rest the slot renders the whole mark");
  });

  it("leaves no warning for the next plot to claim", () => {
    // The ⚠️ indicator drains the global counter after the render phase; on a
    // server render no effect runs, so the drain happens in this render (see
    // WarningIndicator). Consuming anything below means a later plot in the
    // same process would claim a warning this one raised.
    renderToString(
      <Replot aspectRatio={1} width={400}>
        <Dot data={[]} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(consumeWarnings(), 0, "a server render should drain the warnings it raised");
  });

  it("fails loudly on a render option, which needs a DOM", () => {
    // A render transform is arbitrary imperative code over real elements, so
    // there is nothing to substitute for them: the server render says so
    // rather than silently dropping the transform from the plot.
    assert.throws(
      () =>
        renderToString(
          <Replot width={400} height={200}>
            <Dot
              data={data}
              x="x"
              y="y"
              render={(index: any, scales: any, values: any, dimensions: any, context: any, next: any) =>
                next(index, scales, values, dimensions, context)
              }
            />
          </Replot>
        ),
      /render option needs a DOM/
    );
  });
});
