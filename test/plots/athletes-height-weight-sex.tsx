import {Replot, Rect, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesHeightWeightSex() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      round={true}
      grid={true}
      height={640}
      y={{
        ticks: 10
      }}
    >
      <Rect data={athletes} {...bin({fillOpacity: "count"}, {x: "weight", y: "height", fill: "sex", thresholds: 50})} />
    </Replot>
  );
}
