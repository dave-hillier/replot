import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinMassSpecies() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      x={{
        round: true,
        label: "Body mass (g)"
      }}
      y={{
        grid: true
      }}
    >
      <RectY
        data={data}
        {...binX({y: "count"}, {x: "body_mass_g", fill: "species", title: (d) => `${d.species} ${d.sex}`})}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
