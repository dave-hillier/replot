// The re-render SCOPE of a pointer move. These are the guard against a future
// edit quietly reinstating a whole-plot fanout on every mouse movement.
//
// A pointer move must reach exactly the pointer consumers whose selection
// changed, and nothing else: not the ordinary marks (a scatterplot of ten
// thousand dots must not be rebuilt because a tip moved), not the pointer
// consumers whose selection is unchanged, and not the registration effect,
// which describes where a mark's data are and has no reason to run again until
// the plot is recomputed.
//
// Scope is measured by counting invocations, because that is the only thing a
// test can see from outside: a mark instance's renderJSX is wrapped in a
// counter, and the composed pointer render's pointerK tag — the one property
// the registration path reads per registration — is turned into a counting
// accessor.
import assert from "assert";
import {Dot, Replot, pointer, useMark} from "../src/react/index.js";
import {dot} from "../src/marks/dot.js";
import {tip} from "../src/marks/tip.js";
import jsdomit from "./jsdom.js";
import {hover, mountPlot, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10},
  {x: 50, y: 70},
  {x: 90, y: 30}
];

// Far outside the plot's data range, so a pointer mark over it is never
// selected and never has a reason to re-render.
const elsewhere = [{x: 200, y: 200}];

interface Spy {
  renders: number;
  registrations: number;
}

function createSpy(): Spy {
  return {renders: 0, registrations: 0};
}

/** Wraps a built mark so that every renderJSX and every pointerK read is counted. */
function watch(mark: any, spy: Spy): any {
  const renderJSX = mark.renderJSX.bind(mark);
  mark.renderJSX = (...args: unknown[]) => (spy.renders++, renderJSX(...args));
  const pointerK = mark.render?.pointerK;
  if (pointerK !== undefined) {
    // pointerKOf(mark) is what the React registration reads to recover the
    // kx/ky/maxRadius trapped in the pointer closure, and it is read once per
    // registration — so counting reads counts registrations.
    Object.defineProperty(mark.render, "pointerK", {
      get: () => (spy.registrations++, pointerK),
      configurable: true
    });
  }
  return mark;
}

/** A Dot whose mark instance is instrumented; `spy` never reaches the mark options. */
function SpyDot({data, spy, ...options}: {data: unknown; spy: Spy; [option: string]: unknown}) {
  useMark({name: "spy-dot", data, options, create: (d: any, o: any) => watch(dot(d, o), spy)});
  return null;
}

/** As SpyDot, for a tip — a second pointer consumer with its own aria-label. */
function SpyTip({data, spy, ...options}: {data: unknown; spy: Spy; [option: string]: unknown}) {
  useMark({name: "spy-tip", data, options, create: (d: any, o: any) => watch(tip(d, o), spy)});
  return null;
}

function centreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

/** The centres of the *k*th dot mark's circles. */
function centres(harness: PointerHarness, k = 0): [number, number][] {
  const group = harness.svg.querySelectorAll('g[aria-label="dot"]')[k];
  assert.ok(group, `expected at least ${k + 1} dot mark(s)`);
  return Array.from(group.querySelectorAll("circle")).map(centreOf);
}

describe("pointer re-render scope", () => {
  jsdomit("a pointer move does not re-render a mark that is not a pointer consumer", async () => {
    const spy = createSpy();
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <SpyDot data={dots} spy={spy} x="x" y="y" />
        <Dot data={dots} x="x" y="y" tip />
      </Replot>
    );
    const [, second] = centres(harness);
    const drawn = spy.renders;
    assert.ok(drawn > 0, "expected the plain dot mark to have rendered");

    await hover(harness, ...second);
    assert.strictEqual(spy.renders, drawn, "a plain mark must not re-render because the pointer moved");

    await hover(harness, 120, 250);
    assert.strictEqual(spy.renders, drawn, "…nor because the selection was cleared");
    await harness.cleanup();
  });

  jsdomit("the registration runs per plot computation, not per pointer move", async () => {
    const spy = createSpy();
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <SpyDot data={dots} spy={spy} {...pointer({x: "x", y: "y", r: 8, fill: "red"})} />
      </Replot>
    );
    const registered = spy.registrations;
    assert.ok(registered > 0, "expected the pointer mark to have registered its own kx/ky/maxRadius");

    const [first, second] = centres(harness);
    await hover(harness, ...second);
    await hover(harness, ...first);
    assert.strictEqual(spy.registrations, registered, "a pointer move must not re-register the mark");
    await harness.cleanup();
  });

  jsdomit("hovering the same datum twice re-renders the pointer consumer once", async () => {
    const spy = createSpy();
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <SpyDot data={dots} spy={spy} {...pointer({x: "x", y: "y", r: 8, fill: "red"})} />
      </Replot>
    );
    const [, second] = centres(harness);
    const drawn = spy.renders;

    // Two different points that resolve to the same datum: the selection has
    // not changed, so the snapshot is the identical object and the consumer
    // must not re-render a second time.
    await hover(harness, second[0] + 4, second[1]);
    await hover(harness, second[0] - 4, second[1] + 4);
    assert.strictEqual(spy.renders, drawn + 1);
    await harness.cleanup();
  });

  jsdomit("moving between datums re-renders only the consumer whose selection changed", async () => {
    const changing = createSpy();
    const unchanging = createSpy();
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot data={dots} x="x" y="y" />
        <SpyDot data={dots} spy={changing} {...pointer({x: "x", y: "y", r: 8, fill: "red"})} />
        <SpyTip data={elsewhere} spy={unchanging} {...pointer({x: "x", y: "y"})} />
      </Replot>
    );
    const [first, second] = centres(harness);
    const before = {changing: changing.renders, unchanging: unchanging.renders};

    await hover(harness, ...first);
    await hover(harness, ...second);

    // The second consumer's only datum is far outside the frame's data range,
    // so its selection is null before and after both moves: an unchanged
    // selection keeps the identical snapshot object and must not reach React.
    assert.strictEqual(
      unchanging.renders,
      before.unchanging,
      "a pointer mark with nothing in range must not re-render at all"
    );
    assert.strictEqual(changing.renders, before.changing + 2, "expected one re-render per selection change");
    await harness.cleanup();
  });
});
