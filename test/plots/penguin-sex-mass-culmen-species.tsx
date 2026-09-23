import {Replot, Frame, Dot, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinSexMassCulmenSpecies() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      inset={10}
      height={320}
      grid
      x={{
        ticks: 10,
        tickFormat: "~s"
      }}
      y={{
        ticks: 10
      }}
      facet={{
        data,
        x: "sex"
      }}
    >
      <Frame />
      <Dot
        data={data}
        {...bin(
          {
            r: "count",
            sort: "count",
            reverse: true
          },
          {
            x: "body_mass_g",
            y: "culmen_length_mm",
            stroke: "species",
            fill: "species",
            fillOpacity: 0.2
          }
        )}
      />
    </Replot>
  );
}
