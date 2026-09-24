import {plot, axisX, axisY, rect, bin} from "../../src/replot.js";
import {setOffset} from "../../src/style.js";
import * as d3 from "d3";

export async function offsets() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const wrap = document.createElement("div");
  for (const off of [0, 0.5]) {
    setOffset(off);
    const color = off ? "blue" : "red";
    const svg = plot({
      style: "position: absolute; top: 70px;",
      grid: color,
      height: 300,
      marks: [
        axisX({fill: color, stroke: color}),
        axisY({fill: color, stroke: color}),
        rect(
          penguins,
          bin({fillOpacity: "count"}, {x: "culmen_depth_mm", y: "culmen_length_mm", fill: color, thresholds: 50})
        )
      ]
    });
    wrap.appendChild(svg as Node);
  }
  return wrap;
}
