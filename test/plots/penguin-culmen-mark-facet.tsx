import {Replot, Frame, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmenMarkFacet() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={600} facet={{marginRight: 80}}>
      <Frame />
      <Dot
        data={data}
        fx="sex"
        fy="species"
        facet="exclude"
        x="culmen_depth_mm"
        y="culmen_length_mm"
        r={2}
        fill="#ddd"
      />
      <Dot data={data} fx="sex" fy="species" x="culmen_depth_mm" y="culmen_length_mm" />
    </Replot>
  );
}
