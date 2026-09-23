import * as Plot from "replot";
import assert from "assert";
import it from "../jsdom.js";

it("vector(undefined, {}) has the expected defaults", () => {
  const vector = Plot.vector(undefined);
  assert.strictEqual(vector.data, undefined);
  assert.strictEqual(vector.transform, undefined);
  assert.strictEqual(vector.r, 3.5);
  assert.strictEqual(vector.length, 12);
  assert.strictEqual(vector.rotate, 0);
  assert.strictEqual(vector.anchor, "middle");
  assert.strictEqual(vector.fill, "none");
  assert.strictEqual(vector.fillOpacity, undefined);
  assert.strictEqual(vector.stroke, "currentColor");
  assert.strictEqual(vector.strokeWidth, 1.5);
  assert.strictEqual(vector.strokeLinejoin, "round");
  assert.strictEqual(vector.strokeLinecap, "round");
});

// Upstream always emits rotate(…) when the rotate channel is present
// (vector.js:106-114), even for a zero angle; replot dropped the whole rotate
// clause on a falsy value, so a zero-angle vector rendered without it.
it("vector(data, {rotate}) emits rotate(0) for a zero rotate channel value", () => {
  const svg = Plot.plot({
    marks: [Plot.vector([{x: 1, y: 1, angle: 0}], {x: "x", y: "y", rotate: "angle"})]
  });
  const path = svg.querySelector('[aria-label="vector"] path');
  assert.match(path.getAttribute("transform"), / rotate\(0\)/);
});

// The anchor translate is emitted whenever the anchor is not start, again
// regardless of the value — upstream emits translate(0,0) for a zero length.
it("vector(data, {length: 0}) emits the anchor translate for a zero length", () => {
  const svg = Plot.plot({
    marks: [Plot.vector([{x: 1, y: 1}], {x: "x", y: "y", rotate: 30, length: 0})]
  });
  const path = svg.querySelector('[aria-label="vector"] path');
  assert.match(path.getAttribute("transform"), / rotate\(30\) translate\(0,0\)$/);
});

it("vector(data, {anchor: 'start'}) omits the anchor translate", () => {
  const svg = Plot.plot({
    marks: [Plot.vector([{x: 1, y: 1}], {x: "x", y: "y", rotate: 30, length: 0, anchor: "start"})]
  });
  const path = svg.querySelector('[aria-label="vector"] path');
  assert.match(path.getAttribute("transform"), / rotate\(30\)$/);
});

it("vector(data, {rotate: 0}) omits rotate when there is no rotate channel", () => {
  const svg = Plot.plot({
    marks: [Plot.vector([{x: 1, y: 1}], {x: "x", y: "y"})]
  });
  const path = svg.querySelector('[aria-label="vector"] path');
  assert.doesNotMatch(path.getAttribute("transform"), /rotate/);
});
