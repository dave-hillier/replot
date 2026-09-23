import * as Plot from "replot";
import assert from "assert";
import it from "../jsdom.js";

it("hexgrid applies its channel styles to the grid path", () => {
  // The grid is a single path, so its channels are read at index 0, as upstream
  // does with .datum(0). A channel — rather than a constant style, which lives
  // on the mark's group — has to reach the path itself.
  const svg = Plot.hexgrid({title: "hex grid", stroke: () => "red", href: "https://example.com"}).plot();
  const path = svg.querySelector('[aria-label="hexgrid"]').querySelector("path");
  assert.strictEqual(path.getAttribute("stroke"), "red");
  assert.strictEqual(path.querySelector("title")?.textContent, "hex grid");
  assert.strictEqual(path.parentNode.tagName, "a");
  assert.strictEqual(path.parentNode.getAttribute("href"), "https://example.com");
});
