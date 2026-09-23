// @ts-nocheck — JSDOM tests for WHEN the plot drains the global warning
// counter. A warning raised while a mark renders must count towards the plot
// that raised it and must not be left in the counter for the next plot.
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, Dot} from "../src/react/index.js";
import {plot} from "../src/plot.js";
import {dot} from "../src/marks/dot.js";
import {warn} from "../src/warnings.js";

// A mark that warns while it renders, rather than while computePlot computes.
// Nothing in the ported marks warns this late today, so this stands in for the
// case the drain has to cover: a warning raised by a renderJSX (or by a user
// render transform composed into one).
const warns = () => {
  warn("Warning: raised while rendering");
  return <g aria-label="warns" />;
};

const data = [
  {x: 1, y: 2},
  {x: 2, y: 3}
];

// The ⚠️ indicator the plot draws after its marks, or null when it drew none.
function indicator(root) {
  const text = root.querySelector("text[font-family='initial']");
  return text == null ? null : text.querySelector("title")?.textContent ?? text.textContent;
}

async function mountReplot(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
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

describe("the warning drain", () => {
  jsdomit("counts a warning raised while the marks render", async () => {
    const {container, cleanup} = await mountReplot(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" />
        {warns}
      </Replot>
    );
    const svg = container.querySelector("svg");
    assert.match(
      String(indicator(svg)),
      /^1 warning\./,
      "expected the plot's own render-time warning to be counted once"
    );
    await cleanup();
  });

  jsdomit("does not leave a render-time warning for the next plot to claim", async () => {
    const first = await mountReplot(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" />
        {warns}
      </Replot>
    );
    const second = await mountReplot(
      <Replot width={200} height={200}>
        <Dot data={data} x="x" y="y" />
      </Replot>
    );
    assert.strictEqual(
      indicator(second.container.querySelector("svg")),
      null,
      "a plot that warned nothing must not inherit the previous plot's warnings"
    );
    await first.cleanup();
    await second.cleanup();
  });

  jsdomit("counts a warning raised while the imperative plot() renders", () => {
    const svg = plot({width: 200, height: 200, marks: [warns]});
    assert.match(
      String(indicator(svg)),
      /^1 warning\./,
      "expected plot()'s own render-time warning to be counted once"
    );
  });

  jsdomit("does not leave a render-time warning for the next plot() to claim", () => {
    plot({width: 200, height: 200, marks: [warns]});
    const svg = plot({width: 200, height: 200, marks: [dot(data, {x: "x", y: "y"})]});
    assert.strictEqual(
      indicator(svg),
      null,
      "a plot that warned nothing must not inherit the previous plot's warnings"
    );
  });
});
