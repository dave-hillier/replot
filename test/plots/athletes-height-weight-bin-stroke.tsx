import {Replot, Rect, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesHeightWeightBinStroke() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      round={true}
      grid={true}
      height={640}
      y={{
        ticks: 10
      }}
      color={{
        scheme: "YlGnBu"
      }}
    >
      <Rect data={athletes} {...bin({fill: "count"}, {x: "weight", y: "height", thresholds: 50})} />
      <Rect
        data={athletes}
        {...bin({filter: (d) => d.length > 20}, {x: "weight", y: "height", stroke: "grey", inset: 0, thresholds: 50})}
      />
    </Replot>
  );
}
