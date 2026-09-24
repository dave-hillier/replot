import {Replot, DelaunayMesh, Hull} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmenDelaunaySpecies() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <DelaunayMesh
        data={data}
        x="culmen_depth_mm"
        y="culmen_length_mm"
        z="species"
        stroke="species"
        strokeOpacity={1}
      />
      <Hull data={data} x="culmen_depth_mm" y="culmen_length_mm" stroke="species" strokeWidth={3} />
    </Replot>
  );
}
