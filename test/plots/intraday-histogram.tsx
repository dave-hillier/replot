import {Replot, RectY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function intradayHistogram() {
  const timestamps = await d3.csv<any>("data/timestamps.csv", d3.autoType);
  return (
    <Replot>
      <RectY data={timestamps} {...binX({y: "count"}, {x: (d) => d.timestamp.getUTCHours(), interval: 1})} />
    </Replot>
  );
}
