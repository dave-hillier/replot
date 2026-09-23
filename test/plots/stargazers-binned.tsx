import {Replot, RectY, RuleY, binX, groupZ} from "../../src/react/api.js";
import * as d3 from "d3";

export async function stargazersBinned() {
  const stargazers = await d3.csv<any>("data/stargazers.csv", d3.autoType);
  const format = d3.utcFormat("%Y-%m-%d");
  return (
    <Replot
      y={{
        grid: true,
        label: "Stargazers added per week"
      }}
    >
      <RectY
        data={stargazers}
        {...binX(
          {y: "count", title: (d, {x1, x2}) => `${format(x1)} to ${format(x2)}\n${d.length}`},
          {x: "date", thresholds: "week"}
        )}
      />
      <RuleY
        data={stargazers}
        {...groupZ({y: "median"}, binX({y: "count", x: null}, {x: "date", stroke: "red", thresholds: "week"}))}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
