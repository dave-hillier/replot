import {Replot, RuleY, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function gistempAnomaly() {
  const data = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  return (
    <Replot y={{label: "Temperature anomaly (°C)", tickFormat: "+f", grid: true}} color={{scheme: "BuRd"}}>
      <RuleY data={[0]} />
      <Dot data={data} x="Date" y="Anomaly" stroke="Anomaly" />
    </Replot>
  );
}
