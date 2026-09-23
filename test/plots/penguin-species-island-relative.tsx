import {Replot, BarY, RuleY, groupZ} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinSpeciesIslandRelative() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      y={{
        percent: true
      }}
      fx={{
        tickSize: 6
      }}
      facet={{
        data: penguins,
        x: "species"
      }}
    >
      <BarY data={penguins} {...groupZ({y: "proportion-facet", sort: "z"}, {fill: "island"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
