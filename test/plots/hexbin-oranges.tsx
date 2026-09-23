import {Replot, Frame, Circle, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hexbinOranges() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot inset={10} color={{scheme: "oranges"}}>
      <Frame />
      <Circle data={penguins} {...hexbin({fill: "count"}, {x: "culmen_depth_mm", y: "culmen_length_mm"})} />
    </Replot>
  );
}
