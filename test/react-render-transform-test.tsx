// @ts-nocheck — JSDOM React tests for the imperative `render` option on the
// JSX path. The interesting part is the DOM the transform's `next` hands back:
// it is built by jsxToDom in src/react/renderTransform.ts, which serializes
// React elements to SVG-namespaced nodes without going through
// renderToStaticMarkup (see issue #140).
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, Dot} from "../src/react/api.js";

const data = [
  {x: 1, y: 2},
  {x: 2, y: 3},
  {x: 3, y: 1}
];

async function mount(node) {
  const container = globalThis.document.createElement("div");
  globalThis.document.body.appendChild(container);
  let root;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    }
  };
}

// Renders a plot whose dot mark carries a render transform, and hands the
// transform's `next()` output to the assertions.
async function withNextOutput(assertions, markProps = {}) {
  let produced = null;
  const render = (index, scales, values, dimensions, context, next) => {
    produced = next(index, scales, values, dimensions, context);
    return produced;
  };
  const {container, cleanup} = await mount(
    <Replot width={200} height={200}>
      <Dot data={data} x="x" y="y" render={render} {...markProps} />
    </Replot>
  );
  assert.ok(produced, "expected the render transform to receive DOM from next()");
  try {
    assertions(produced, container);
  } finally {
    await cleanup();
  }
}

jsdomit("next() returns SVG-namespaced element nodes", async () => {
  await withNextOutput((produced) => {
    const element = produced.nodeType === 11 ? produced.firstChild : produced;
    assert.strictEqual(element.namespaceURI, "http://www.w3.org/2000/svg");
    assert.ok(element.querySelector("circle") ?? element.tagName === "circle", "expected circles in the output");
  });
});

jsdomit("camelCase React props are serialized as hyphenated SVG attributes", async () => {
  await withNextOutput(
    (produced) => {
      const holder = globalThis.document.createElementNS("http://www.w3.org/2000/svg", "svg");
      holder.appendChild(produced.cloneNode(true));
      const painted = holder.querySelector("[stroke-width]") ?? holder.querySelector("g");
      assert.ok(painted, "expected a rendered element");
      // The React prop is strokeWidth; the DOM attribute must be stroke-width,
      // and must not appear in its camelCase spelling.
      assert.strictEqual(holder.innerHTML.includes("strokeWidth"), false, "camelCase leaked into the DOM");
    },
    {strokeWidth: 3, stroke: "red"}
  );
});

jsdomit("className becomes class, and text children survive", async () => {
  await withNextOutput(
    (produced) => {
      const holder = globalThis.document.createElementNS("http://www.w3.org/2000/svg", "svg");
      holder.appendChild(produced.cloneNode(true));
      assert.strictEqual(holder.innerHTML.includes("className"), false, "className leaked into the DOM");
      const titled = holder.querySelector("title");
      if (titled) assert.ok(titled.textContent.length > 0, "expected title text to survive");
    },
    {title: (d) => `point ${d.x}`}
  );
});

jsdomit("the rendered plot still contains the transform's output", async () => {
  await withNextOutput((produced, container) => {
    const svg = container.querySelector("svg");
    assert.ok(svg, "expected the plot to render");
    assert.ok(svg.querySelectorAll("circle").length >= data.length, "expected the dots to reach the document");
  });
});
