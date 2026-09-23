import {Replot, RuleY, RuleX, Rect, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplMonthly() {
  const data = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const bin = {x: "Date", y: "Volume", thresholds: 40};
  return (
    <Replot
      y={{
        transform: (d) => d / 1e6,
        label: "Daily trade volume (millions)",
        round: true
      }}
    >
      <RuleY data={[0]} />
      <RuleX data={data} {...binX({y1: "min", y2: "max"}, {...bin, stroke: "#999"})} />
      <Rect data={data} {...binX({y1: "p25", y2: "p75"}, {...bin, fill: "#bbb"})} />
      <RuleY data={data} {...binX({y: "p50"}, {...bin, strokeWidth: 2})} />
    </Replot>
  );
}
