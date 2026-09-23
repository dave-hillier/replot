// @ts-nocheck — JSDOM React tests for the <Replot> figure-mode contract.
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
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
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

function plotWith(props) {
  return (
    <Replot width={200} height={200} {...props}>
      <Dot data={data} x="x" y="y" />
    </Replot>
  );
}

describe("Plot figure-mode contract", () => {
  jsdomit("renders a <figure> with <h2>/<figcaption> when title and caption are set", async () => {
    const {container, cleanup} = await mount(plotWith({title: "My title", caption: "My caption"}));
    const figure = container.querySelector("figure");
    assert.ok(figure, "expected a <figure> wrapper");
    const h2 = figure.querySelector("h2");
    assert.ok(h2, "expected an <h2> for the title");
    assert.strictEqual(h2.textContent, "My title");
    const figcaption = figure.querySelector("figcaption");
    assert.ok(figcaption, "expected a <figcaption> for the caption");
    assert.strictEqual(figcaption.textContent, "My caption");
    assert.ok(figure.querySelector("svg"), "expected the <svg> inside the figure");
    await cleanup();
  });

  jsdomit("renders a subtitle <h3> when subtitle is set", async () => {
    const {container, cleanup} = await mount(plotWith({title: "T", subtitle: "Sub"}));
    const h3 = container.querySelector("figure h3");
    assert.ok(h3, "expected an <h3> for the subtitle");
    assert.strictEqual(h3.textContent, "Sub");
    await cleanup();
  });

  jsdomit("does NOT render a <figure> by default (no title/caption/legend)", async () => {
    const {container, cleanup} = await mount(plotWith({}));
    assert.strictEqual(container.querySelector("figure"), null, "expected no <figure>");
    assert.ok(container.querySelector("svg"), "expected a bare <svg>");
    await cleanup();
  });

  jsdomit('figure="never" suppresses the figure even with a title', async () => {
    const {container, cleanup} = await mount(plotWith({title: "T", figure: "never"}));
    assert.strictEqual(container.querySelector("figure"), null, 'figure="never" should suppress the <figure>');
    assert.strictEqual(container.querySelector("h2"), null, "title <h2> should not render outside a figure");
    assert.ok(container.querySelector("svg"), "expected a bare <svg>");
    await cleanup();
  });

  jsdomit('figure="always" forces a figure even without a title', async () => {
    const {container, cleanup} = await mount(plotWith({figure: "always"}));
    const figure = container.querySelector("figure");
    assert.ok(figure, 'figure="always" should force a <figure>');
    assert.ok(figure.querySelector("svg"), "expected the <svg> inside the figure");
    await cleanup();
  });

  jsdomit('figure={true} aliases "always"', async () => {
    const {container, cleanup} = await mount(plotWith({figure: true}));
    assert.ok(container.querySelector("figure"), "figure={true} should force a <figure>");
    await cleanup();
  });

  jsdomit('figure={false} aliases "never"', async () => {
    const {container, cleanup} = await mount(plotWith({title: "T", figure: false}));
    assert.strictEqual(container.querySelector("figure"), null, "figure={false} should suppress the <figure>");
    await cleanup();
  });
});
