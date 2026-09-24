import {Replot, Dot} from "../../src/react/api.js";
import * as d3 from "d3";
import {remap} from "../transforms/remap.js";

export async function carsJitter() {
  const random = d3.randomNormal.source(d3.randomLcg(42))(0, 7);
  const data = await d3.csv<any>("data/cars.csv", d3.autoType);
  return (
    <Replot
      height={350}
      nice={true}
      y={{
        type: "band",
        grid: true,
        reverse: true
      }}
      color={{
        legend: true
      }}
    >
      <Dot
        data={data}
        {...remap(
          {y: (d) => d + random()},
          {x: "weight (lb)", y: "cylinders", fill: "power (hp)", stroke: "white", strokeWidth: 0.5}
        )}
      />
    </Replot>
  );
}
