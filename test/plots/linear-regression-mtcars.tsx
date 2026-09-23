import {Replot, Dot, LinearRegressionY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function linearRegressionMtcars() {
  const mtcars = await d3.csv<any>("data/mtcars.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={mtcars} x="wt" y="hp" r={2} />
      <LinearRegressionY data={mtcars} x="wt" y="hp" stroke={null} ci={0.8} />
      <LinearRegressionY data={mtcars} x="wt" y="hp" />
    </Replot>
  );
}
