// @ts-nocheck — JSDOM React tests for scale components (<ScaleY>, <ScaleColor>, …).
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, Dot, ScaleY, ScaleColor} from "../src/react/api.js";

const data = [
  {x: 1, y: 2, v: 10},
  {x: 2, y: 30, v: 20},
  {x: 3, y: 400, v: 30}
];

async function mount(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  await act(async () => {});
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function svgMarkup(container) {
  const svg = container.querySelector("svg");
  assert.ok(svg, "expected an <svg>");
  return svg.outerHTML;
}

describe("scale components register plot-level scale options", () => {
  jsdomit("<ScaleY grid type=log> renders byte-identical SVG to the object form", async () => {
    const componentForm = await mount(
      <Replot width={200} height={200}>
        <ScaleY grid type="log" />
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    const objectForm = await mount(
      <Replot width={200} height={200} y={{grid: true, type: "log"}}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(svgMarkup(componentForm.container), svgMarkup(objectForm.container));
    await componentForm.cleanup();
    await objectForm.cleanup();
  });

  jsdomit("<ScaleColor scheme> renders byte-identical SVG to the object form", async () => {
    const componentForm = await mount(
      <Replot width={200} height={200}>
        <ScaleColor scheme="warm" />
        <Dot data={data} x="x" y="y" fill="v" />
      </Replot>
    );
    const objectForm = await mount(
      <Replot width={200} height={200} color={{scheme: "warm"}}>
        <Dot data={data} x="x" y="y" fill="v" />
      </Replot>
    );
    assert.strictEqual(svgMarkup(componentForm.container), svgMarkup(objectForm.container));
    await componentForm.cleanup();
    await objectForm.cleanup();
  });

  jsdomit("updates the plot when a scale-component prop changes", async () => {
    let setType;
    function Harness() {
      const [type, set] = useState("linear");
      setType = set;
      return (
        <Replot width={200} height={200}>
          <ScaleY type={type} />
          <Dot data={data} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setType("log"));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when the scale type changes");
    const logForm = await mount(
      <Replot width={200} height={200} y={{type: "log"}}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(after, svgMarkup(logForm.container));
    await cleanup();
    await logForm.cleanup();
  });

  jsdomit("updates the plot when a scale component unmounts", async () => {
    let setShow;
    function Harness() {
      const [show, set] = useState(true);
      setShow = set;
      return (
        <Replot width={200} height={200}>
          {show ? <ScaleY type="log" /> : null}
          <Dot data={data} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    const before = svgMarkup(container);
    await act(async () => setShow(false));
    await act(async () => {});
    const after = svgMarkup(container);
    assert.notStrictEqual(after, before, "expected the SVG to change when the scale component unmounts");
    const plainForm = await mount(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(after, svgMarkup(plainForm.container));
    await cleanup();
    await plainForm.cleanup();
  });

  jsdomit("explicit <Replot> scale props win over scale components on conflict", async () => {
    // The Plot-level y={{type: "log"}} wins over the component's
    // type="linear"; the component's grid supplements on the
    // non-conflicting key.
    const mixed = await mount(
      <Replot width={200} height={200} y={{type: "log"}}>
        <ScaleY type="linear" grid />
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    const expected = await mount(
      <Replot width={200} height={200} y={{type: "log", grid: true}}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(svgMarkup(mixed.container), svgMarkup(expected.container));
    await mixed.cleanup();
    await expected.cleanup();
  });
});
