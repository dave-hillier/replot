import assert from "assert";
import {warns} from "./assert.js";
import it from "./jsdom.js";
import * as Plot from "../src/replot.js";

describe("aspectRatio with empty data", () => {
  // Upstream computes a NaN height here and writes it to the <svg>
  // (height="NaN", viewBox="0 0 640 NaN"). Replot falls back to the default
  // height, which is a deliberate divergence — and a warned one, so a plot
  // that is not the shape the aspectRatio asks for says why.
  it("falls back to a finite default height, with a warning", () => {
    const svg = warns(
      () =>
        Plot.plot({
          aspectRatio: 1,
          marks: [Plot.rectY([], {x: "a", y: "b"})]
        }),
      /aspect ratio is undefined/
    );
    const height = Number(svg.getAttribute("height"));
    assert.ok(Number.isFinite(height) && height > 0, `expected finite height, got ${svg.getAttribute("height")}`);
    assert.ok(!(svg.getAttribute("viewBox") ?? "").includes("NaN"));
  });

  it("still honors aspectRatio with non-empty data", () => {
    const tall = Plot.plot({
      aspectRatio: 0.5,
      marks: [
        Plot.dot(
          [
            {a: 0, b: 0},
            {a: 10, b: 10}
          ],
          {x: "a", y: "b"}
        )
      ]
    });
    const square = Plot.plot({
      aspectRatio: 1,
      marks: [
        Plot.dot(
          [
            {a: 0, b: 0},
            {a: 10, b: 10}
          ],
          {x: "a", y: "b"}
        )
      ]
    });
    assert.ok(Number(tall.getAttribute("height")) > Number(square.getAttribute("height")));
  });
});
