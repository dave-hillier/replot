import {Replot, BarX, Frame, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesSportWeight() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot marginLeft={100} grid color={{scheme: "YlGnBu", zero: true}}>
      <BarX data={athletes} {...binX({fill: "proportion-facet"}, {x: "weight", fy: "sport", thresholds: 60})} />
      <Frame anchor="bottom" facetAnchor="bottom" />
    </Replot>
  );
}
