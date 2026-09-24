import * as Plot from "@dave-hillier/replot";
import assert from "assert";
import it from "../jsdom.js";

it("linearRegressionY titles the confidence band as well as the line", () => {
  // Upstream applies the grouped channel styles — title included — to both the
  // band path and the line path, so the two carry the same title.
  const data = [
    {x: 1, y: 1, t: "one"},
    {x: 2, y: 3, t: "two"},
    {x: 3, y: 2, t: "three"}
  ];
  const svg = Plot.linearRegressionY(data, {x: "x", y: "y", title: "t"}).plot();
  const paths = [...svg.querySelector('[aria-label="linear-regression"]').querySelectorAll("path")];
  assert.strictEqual(paths.length, 2, "expected a confidence band and a line");
  for (const path of paths) {
    assert.strictEqual(path.querySelector("title")?.textContent, "one");
  }
});
