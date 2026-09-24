import {Replot, RuleX, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function usPresidentialForecast2016() {
  const data = await d3.csv<any>("data/us-presidential-forecast-2016-histogram.csv", d3.autoType);
  return (
    <Replot
      x={{
        label: "Electoral votes for Hillary Clinton"
      }}
      y={{
        ticks: 5,
        percent: true
      }}
      color={{
        type: "threshold",
        domain: [270]
      }}
    >
      <RuleX
        data={data}
        x="dem_electoral_votes"
        y="probability"
        shapeRendering="crispEdges"
        stroke="dem_electoral_votes"
        strokeWidth={1.5}
      />
      <RuleY data={[0]} />
      <RuleX data={[270]} />
    </Replot>
  );
}
