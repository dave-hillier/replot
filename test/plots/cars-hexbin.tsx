import {Replot, Hexagon, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function carsHexbin() {
  const cars = await d3.csv<any>("data/cars.csv", d3.autoType);
  return (
    <Replot
      color={{
        scheme: "reds",
        nice: true,
        legend: true
      }}
    >
      <Hexagon
        data={cars}
        {...hexbin({r: "count", fill: "mean"}, {x: "displacement (cc)", y: "economy (mpg)", fill: "weight (lb)"})}
      />
    </Replot>
  );
}
