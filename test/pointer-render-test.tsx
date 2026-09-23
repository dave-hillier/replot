// A user `render` option composed under pointer(), and the pointer-events
// default applied to what it returns.
//
// pointer() composes the user's render transform INSIDE its own closure
// (src/interactions/pointer.js's composeRender), and the React path never runs
// that closure — it reimplements the interaction — so the user's transform is
// recovered from the `render.userRender` tag pointer.js leaves behind. These
// cases are what pins that it runs at all, and that it runs with the pointer's
// own selection rather than the mark's whole index.
import assert from "assert";
import {Dot, Replot, pointer} from "../src/react/index.js";
import jsdomit from "./jsdom.js";
import {click, hover, mountPlot, type PointerHarness} from "./pointer-harness.js";

const dots = [
  {x: 10, y: 10},
  {x: 50, y: 70},
  {x: 90, y: 30}
];

const SVG_NS = "http://www.w3.org/2000/svg";

/** The dot mark groups, in document (mark) order. */
function dotGroups(harness: PointerHarness): any[] {
  return Array.from(harness.svg.querySelectorAll('g[aria-label="dot"]'));
}

/** The centre of a rendered circle, in SVG user space. */
function centreOf(circle: any): [number, number] {
  return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
}

describe("pointer render transform", () => {
  jsdomit("runs the user's render transform over the pointer selection", async () => {
    // Upstream's pointerRenderCompose test plot: the transform calls next() and
    // recolours the result, so the rendered group is blue and not red — at rest
    // as well as on hover, because the composed render runs for the empty
    // index too.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot
          data={dots}
          {...pointer({
            x: "x",
            y: "y",
            r: 8,
            fill: "red",
            render(index: any, scales: any, values: any, dimensions: any, context: any, next: any) {
              const node = next(index, scales, values, dimensions, context);
              node.setAttribute("fill", "blue");
              return node;
            }
          })}
        />
        <Dot data={dots} x="x" y="y" />
      </Replot>
    );
    const [pointed, plain] = dotGroups(harness);
    assert.strictEqual(pointed.getAttribute("fill"), "blue", "the transform runs at rest");
    assert.strictEqual(pointed.querySelectorAll("circle").length, 0, "nothing is focused yet");

    const circles = Array.from(plain.querySelectorAll("circle"));
    await hover(harness, ...centreOf(circles[1]));
    const hovered = dotGroups(harness)[0];
    assert.strictEqual(hovered.getAttribute("fill"), "blue");
    const focused = Array.from(hovered.querySelectorAll("circle")) as any[];
    assert.strictEqual(focused.length, 1, "exactly the focused datum is drawn");
    assert.deepStrictEqual(centreOf(focused[0]), centreOf(circles[1]));
    await harness.cleanup();
  });

  jsdomit("defaults pointer-events on the transform's own output root", async () => {
    // The transform wraps next()'s output, so the element the slot renders is
    // the wrapper. Upstream defaults pointer-events from context.pointerSticky
    // for everything rendered under a pointer render (style.js:396); Replot
    // applies it after the transform, which covers the output root.
    const harness = await mountPlot(
      <Replot width={400} height={300}>
        <Dot
          data={dots}
          {...pointer({
            x: "x",
            y: "y",
            render(index: any, scales: any, values: any, dimensions: any, context: any, next: any) {
              const wrapper = context.document.createElementNS(SVG_NS, "g");
              wrapper.setAttribute("class", "wrapper");
              wrapper.appendChild(next(index, scales, values, dimensions, context));
              return wrapper;
            }
          })}
        />
        <Dot data={dots} x="x" y="y" />
      </Replot>
    );
    const wrapper = () => harness.svg.querySelector("g.wrapper");
    assert.ok(wrapper(), "the transform's wrapper is rendered");
    assert.strictEqual(wrapper().getAttribute("pointer-events"), "none");

    const circles = Array.from(harness.svg.querySelectorAll('g[aria-label="dot"] circle')) as any[];
    const [cx, cy] = centreOf(circles[1]);
    await hover(harness, cx, cy);
    assert.strictEqual(wrapper().getAttribute("pointer-events"), "none", "still inert while merely hovered");

    // Pinned: the mark becomes interactive so its contents can be selected.
    await click(harness, {x: cx, y: cy});
    assert.strictEqual(wrapper().getAttribute("pointer-events"), null);
    await harness.cleanup();
  });
});
