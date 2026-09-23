import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinMassSexSpecies() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      x={{
        round: true,
        label: "Body mass (g)"
      }}
      facet={{
        data,
        x: "sex",
        y: "species",
        marginRight: 70
      }}
    >
      <RectY data={data} {...binX({y: "count"}, {x: "body_mass_g"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
