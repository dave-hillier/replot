import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplVolume() {
  const data = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot
      x={{
        round: true,
        label: "Trade volume (log₁₀)"
      }}
      y={{
        grid: true,
        percent: true
      }}
    >
      <RectY data={data} {...binX({y: "proportion"}, {x: (d) => Math.log10(d.Volume)})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
