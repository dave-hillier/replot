import {Replot, Frame, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmen() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      height={600}
      grid={true}
      facet={{
        data: penguins,
        x: "sex",
        y: "species",
        marginRight: 80
      }}
    >
      <Frame />
      <Dot data={penguins} facet="exclude" x="culmen_depth_mm" y="culmen_length_mm" r={2} fill="#ddd" />
      <Dot data={penguins} x="culmen_depth_mm" y="culmen_length_mm" />
    </Replot>
  );
}
