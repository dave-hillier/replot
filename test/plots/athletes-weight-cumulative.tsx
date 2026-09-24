import {Replot, RectY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesWeightCumulative() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot marginLeft={44}>
      <RectY data={athletes} {...binX({y: "count"}, {x: "weight", cumulative: true})} />
    </Replot>
  );
}
