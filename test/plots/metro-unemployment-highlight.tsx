import {Replot, RuleY, Line} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentHighlight() {
  const bls = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  const highlight = (d) => /, MI /.test(d.division);
  return (
    <Replot
      y={{
        grid: true,
        label: "Unemployment (%)"
      }}
      color={{
        domain: [false, true],
        range: ["#ccc", "red"]
      }}
    >
      <RuleY data={[0]} />
      <Line data={bls} x="date" y="unemployment" z="division" sort={highlight} stroke={highlight} />
    </Replot>
  );
}
