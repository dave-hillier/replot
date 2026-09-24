import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function stargazersHourlyGroup() {
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
        {...binX(
          {y: "count", interval: 1},
          binX(
            {x: (d) => Math.min(10, d.length), title: "first", thresholds: "hour", sort: "z"},
            {x: "date", fill: (d) => d.date.getUTCDay(), title: (d) => "SMTWTFS"[d.date.getUTCDay()]}
          )
        )}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
