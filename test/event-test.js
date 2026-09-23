import * as Plot from "replot";
import * as assert from "assert";
import {JSDOM} from "jsdom";

// plot() is a static render; see its JSDoc in src/plot.ts. It has no React
// root, so no reconciler can re-render a mark in response to a pointer event
// and no commit owns a listener’s lifetime. These cases are the contract for
// that, and each is what would fail if plot() grew a live pointer path again.
// Interaction belongs to the React entry point, replot/react and its onValue
// prop.

// The pointer events upstream Plot listens for on the plot’s svg; see
// src/interactions/pointer.js.
const POINTER_EVENTS = ["pointerenter", "pointermove", "pointerdown", "pointerleave"];

// Three points on a diagonal, so the middle of the frame has a datum near it.
const dots = [
  {x: 0, y: 0},
  {x: 50, y: 50},
  {x: 100, y: 100}
];

/** A plot with a pointer consumer: a dot mark whose tip is inferred. */
function plotWithTip(window) {
  return Plot.plot({document: window.document, marks: [Plot.dot(dots, {x: "x", y: "y", tip: true})]});
}

/** Records every listener type the window’s event targets are asked for. */
function recordListeners(window) {
  const added = [];
  const {addEventListener} = window.EventTarget.prototype;
  window.EventTarget.prototype.addEventListener = function (type, ...rest) {
    added.push(String(type));
    return addEventListener.call(this, type, ...rest);
  };
  return {
    added,
    restore() {
      window.EventTarget.prototype.addEventListener = addEventListener;
    }
  };
}

/** A synthetic pointer event, as an upstream listener would receive it. */
function pointerEvent(window, type) {
  const event = new window.Event(type, {bubbles: true});
  event.pointerType = "mouse";
  event.buttons = 0;
  return event;
}

it("plot() attaches no pointer listeners", () => {
  const {window} = new JSDOM("");
  const {added, restore} = recordListeners(window);
  let plot;
  try {
    // Prove the spy records a listener that really is added, so that the empty
    // result below proves something. Then clear it.
    window.document.addEventListener("pointermove", () => {});
    assert.deepStrictEqual(added, ["pointermove"], "the listener spy must record what is added");
    added.length = 0;

    plot = plotWithTip(window);
  } finally {
    restore();
  }
  assert.strictEqual(plot.ownerDocument, window.document);
  assert.deepStrictEqual(
    added.filter((type) => POINTER_EVENTS.includes(type)),
    [],
    "plot() must attach no pointer listeners"
  );
  // Stronger, and true today: the static path builds nodes but never registers
  // on them, so nothing at all listens to the window plot() rendered into.
  assert.deepStrictEqual(added, [], "plot() must attach no listeners at all");
});

it("plot() dispatches no input event and never holds a value", () => {
  const {window} = new JSDOM("");
  const plot = plotWithTip(window);
  const inputs = [];
  plot.addEventListener("input", (event) => inputs.push(event));
  for (const type of POINTER_EVENTS) plot.dispatchEvent(pointerEvent(window, type));
  assert.deepStrictEqual(inputs, [], "plot() must never dispatch an input event");
  assert.strictEqual("value" in plot, false, "plot() must never hold a value");
  assert.strictEqual(plot.value, undefined);

  // Same on the figure, which is the root when the plot has one, and so the
  // element a viewof would read.
  const {window: figureWindow} = new JSDOM("");
  const figure = Plot.plot({document: figureWindow.document, title: "title", marks: [Plot.dot(dots, {tip: true})]});
  assert.strictEqual(figure.tagName, "FIGURE");
  assert.strictEqual("value" in figure, false);
});

it("plot() renders pointer consumers with nothing selected", () => {
  const {window} = new JSDOM("");
  const plot = Plot.plot({
    document: window.document,
    marks: [Plot.dot(dots, {x: "x", y: "y", tip: true}), Plot.crosshair(dots, {x: "x", y: "y"})]
  });
  // The marks themselves render, so this is a plot that drew something and the
  // empty pointer consumers below are not simply a failed render.
  assert.strictEqual(plot.querySelectorAll('g[aria-label="dot"] circle').length, dots.length);
  // The inferred tip and the crosshair’s rule and text are all pointer
  // consumers, so each is drawn at rest: the mark’s root element is present,
  // with no datum inside it.
  const tip = plot.querySelector('g[aria-label="tip"]');
  assert.ok(tip, "expected the inferred tip mark to render");
  assert.strictEqual(tip.children.length, 0);
  const crosshair = [...plot.querySelectorAll('g[aria-label^="crosshair"]')];
  assert.ok(crosshair.length > 0, "expected the crosshair’s rule and text groups");
  for (const group of crosshair) assert.strictEqual(group.children.length, 0);
});
