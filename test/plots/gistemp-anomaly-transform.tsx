import {Replot, RuleY, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function gistempAnomalyTransform() {
  const data = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  const transform = (c) => (c * 9) / 5; // convert (relative) Celsius to Fahrenheit
  return (
    <Replot
      y={{label: "Temperature anomaly (°F)", tickFormat: "+f", transform, grid: true}}
      color={{scheme: "BuRd", domain: [-1, 1], transform}}
    >
      <RuleY data={[0]} />
      <Dot data={data} x="Date" y="Anomaly" stroke="Anomaly" />
    </Replot>
  );
}
