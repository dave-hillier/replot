import {Replot, Dot, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function carsDodge() {
  const cars = await d3.csv<any>("data/cars.csv", d3.autoType);
  return (
    <Replot height={200} x={{line: true}}>
      <Dot data={cars} {...dodgeY({x: "weight (lb)", sort: "weight (lb)"})} />
    </Replot>
  );
}
