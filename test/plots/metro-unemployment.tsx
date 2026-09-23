import {Replot, Line, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemployment() {
  const data = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot>
      <Line data={data} x="date" y="unemployment" z="division" />
      <RuleY data={[0]} />
    </Replot>
  );
}
