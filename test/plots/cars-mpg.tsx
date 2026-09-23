import {Replot, Line, Dot, groupX, binY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function carsMpg() {
  const data = await d3.csv<any>("data/cars.csv", d3.autoType);
  return (
    <Replot
      x={{
        type: "point"
      }}
      y={{
        grid: true,
        zero: true
      }}
      color={{
        type: "ordinal"
      }}
    >
      <Line
        data={data}
        {...groupX(
          {y: "mean", sort: "x"},
          {
            x: "year",
            y: "economy (mpg)",
            stroke: "cylinders",
            curve: "basis"
          }
        )}
      />
      <Dot
        data={data}
        {...binY(
          {r: "count"},
          {
            x: "year",
            y: "economy (mpg)",
            stroke: "cylinders",
            thresholds: 20
          }
        )}
      />
    </Replot>
  );
}
