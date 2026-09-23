import {Replot, Line, RuleY, map, window as win} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentSlope() {
  const bls = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true
      }}
      color={{
        scheme: "buylrd",
        domain: [-0.5, 0.5]
      }}
    >
      <Line
        data={bls}
        {...map(
          {stroke: win({k: 2, reduce: "difference"})},
          {x: "date", y: "unemployment", z: "division", stroke: "unemployment"}
        )}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
