import {Replot, Dot, LinearRegressionY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function linearRegressionPenguins() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot grid={true}>
      <Dot data={penguins} x="culmen_length_mm" y="culmen_depth_mm" fill="species" />
      <LinearRegressionY data={penguins} x="culmen_length_mm" y="culmen_depth_mm" stroke="species" />
      <LinearRegressionY data={penguins} x="culmen_length_mm" y="culmen_depth_mm" />
    </Replot>
  );
}
