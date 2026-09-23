import {Replot, RuleX, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplChangeVolume() {
  const data = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot
      x={{
        label: "Daily change (%)",
        tickFormat: "+f"
      }}
      y={{
        label: "Volume (log₁₀)",
        transform: Math.log10
      }}
      grid={true}
    >
      <RuleX data={[0]} />
      <Dot data={data} x={(d) => ((d.Close - d.Open) / d.Open) * 100} y="Volume" r="Volume" />
    </Replot>
  );
}
