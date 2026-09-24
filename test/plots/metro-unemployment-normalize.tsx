import {Replot, Line, RuleY, normalizeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentNormalize() {
  const data = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot
      y={{
        type: "log",
        label: "Change in unemployment (%)",
        grid: true,
        tickFormat: (x) => `${x.toPrecision(1)}×`
      }}
    >
      <Line data={data} {...normalizeY({x: "date", y: "unemployment", z: "division"})} />
      <RuleY data={[1]} />
    </Replot>
  );
}
