// @ts-nocheck — JSDOM React equivalence tests for the stack-variant wrappers.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {Replot, AreaY, BarX, BarY} from "../src/react/api.js";
import {StackX, StackX1, StackX2, StackY1, StackY2} from "../src/react/transforms/Stack.js";
import {stackX, stackX1, stackX2, stackY1, stackY2} from "../src/transforms/stack.js";

const sales = [
  {date: "Mon", fruit: "apples", units: 30},
  {date: "Mon", fruit: "oranges", units: 20},
  {date: "Tue", fruit: "apples", units: 10},
  {date: "Tue", fruit: "oranges", units: 40},
  {date: "Wed", fruit: "apples", units: 25},
  {date: "Wed", fruit: "oranges", units: 15}
];

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

describe("stack variant wrapper equivalence", () => {
  jsdomit("<StackX> around <BarX> matches the spread stackX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackX offset="normalize" order="sum" reverse>
          <BarX data={sales} y="date" x="units" fill="fruit" />
        </StackX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarX
          data={sales}
          {...stackX({offset: "normalize", order: "sum", reverse: true}, {y: "date", x: "units", fill: "fruit"})}
        />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<StackX1> around <BarX> matches the spread stackX1 form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackX1 order="appearance">
          <BarX data={sales} y="date" x="units" fill="fruit" />
        </StackX1>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarX data={sales} {...stackX1({order: "appearance"}, {y: "date", x: "units", fill: "fruit"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<StackX2> around <BarX> matches the spread stackX2 form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackX2>
          <BarX data={sales} y="date" x="units" fill="fruit" />
        </StackX2>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarX data={sales} {...stackX2({y: "date", x: "units", fill: "fruit"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<StackY1> around <AreaY> matches the spread stackY1 form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackY1 order="inside-out" reverse>
          <AreaY data={sales} x="date" y="units" fill="fruit" />
        </StackY1>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <AreaY
          data={sales}
          {...stackY1({order: "inside-out", reverse: true}, {x: "date", y: "units", fill: "fruit"})}
        />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<StackY2> around <BarY> matches the spread stackY2 form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackY2 offset="expand">
          <BarY data={sales} x="date" y="units" fill="fruit" />
        </StackY2>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={sales} {...stackY2({offset: "expand"}, {x: "date", y: "units", fill: "fruit"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});
