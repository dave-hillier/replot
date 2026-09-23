import {Replot, Frame, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function beckerBarley() {
  const barley = await d3.csv<any>("data/barley.csv", d3.autoType);
  return (
    <Replot
      marginLeft={110}
      height={800}
      grid
      x={{nice: true}}
      y={{inset: 5}}
      color={{type: "categorical"}}
      facet={{data: barley, y: "site", marginRight: 90}}
    >
      <Frame />
      <Dot
        data={barley}
        x="yield"
        y="variety"
        stroke="year"
        sort={{fy: "x", y: "x", reduce: "median", reverse: true}}
      />
    </Replot>
  );
}
