import {Replot, BarY, RuleY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinSpeciesIslandSex() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      x={{
        tickFormat: (d) => (d === null ? "N/A" : d)
      }}
      y={{
        grid: true
      }}
      facet={{
        data: penguins,
        x: "species"
      }}
    >
      <BarY data={penguins} {...groupX({y: "count"}, {x: "sex", fill: "island"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
