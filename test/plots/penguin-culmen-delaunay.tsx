import {Replot, DelaunayLink} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmenDelaunay() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <DelaunayLink data={data} x="culmen_depth_mm" y="culmen_length_mm" stroke="culmen_length_mm" />
    </Replot>
  );
}
