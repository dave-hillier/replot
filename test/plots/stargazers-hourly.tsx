import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function stargazersHourly() {
  const stargazers = await d3.csv<any>("data/stargazers.csv", d3.autoType);
  return (
    <Replot
      x={{
        label: "New stargazers per hour",
        tickFormat: (d) => (d > 10 ? "" : d === 10 ? "10+" : d)
      }}
      y={{
        grid: true
      }}
    >
      <RectY
        data={stargazers}
        {...binX({y: "count", interval: 1}, binX({x: (d) => Math.min(10, d.length), thresholds: "hour"}, {x: "date"}))}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
