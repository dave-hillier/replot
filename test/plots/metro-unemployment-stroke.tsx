import {Replot, Line, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentStroke() {
  const data = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot
      color={{
        scheme: "blues",
        range: [0.4, 1]
      }}
    >
      <Line data={data} x="date" y="unemployment" stroke="division" />
      <RuleY data={[0]} />
    </Replot>
  );
}
