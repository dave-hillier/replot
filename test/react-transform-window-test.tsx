// @ts-nocheck — JSDOM React tests for the window transform wrapper components.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, LineX, LineY, windowX, windowY} from "../src/react/api.js";
import {WindowX, WindowY} from "../src/react/transforms/Window.js";

// A noisy series to smooth, mirroring the rolling-window usage in
// test/plots/sf-temperature-window.tsx.
const series = Array.from({length: 30}, (_, i) => ({
  step: i,
  value: Math.sin(i / 3) * 10 + (i % 5) - 2
}));

async function renderSvg(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  await act(async () => {});
  const svg = container.querySelector("svg");
  assert.ok(svg, "expected an <svg>");
  const markup = svg.outerHTML;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return markup;
}

// Each plot instance gets a unique generated class name; normalize it so the
// nested and spread renderings compare as equal strings.
function normalize(markup) {
  return markup.replace(/plot-[0-9a-f]+/g, "plot-x");
}

describe("window transform wrapper equivalence", () => {
  jsdomit("<WindowY> around <LineY> matches the spread windowY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <WindowY k={7} reduce="mean">
          <LineY data={series} x="step" y="value" />
        </WindowY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <LineY data={series} {...windowY({k: 7, reduce: "mean"}, {x: "step", y: "value"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<WindowX> around <LineX> matches the spread windowX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <WindowX k={5} reduce="max" anchor="start" strict>
          <LineX data={series} x="value" y="step" />
        </WindowX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <LineX
          data={series}
          {...windowX({k: 5, reduce: "max", anchor: "start", strict: true}, {x: "value", y: "step"})}
        />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});
