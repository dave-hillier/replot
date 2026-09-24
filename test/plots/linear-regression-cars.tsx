import {Replot, Dot, LinearRegressionY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function linearRegressionCars() {
  const cars = await d3.csv<any>("data/cars.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={cars} x="weight (lb)" y="economy (mpg)" r={2} />
      <LinearRegressionY data={cars} x="weight (lb)" y="economy (mpg)" ci={0.99} />
    </Replot>
  );
}
