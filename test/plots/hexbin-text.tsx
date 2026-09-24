import {Replot, Frame, Hexgrid, Dot, Text, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hexbinText() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const xy = {fx: "sex", x: "culmen_depth_mm", y: "culmen_length_mm"};
  return (
    <Replot width={960} height={320} inset={14} color={{scheme: "orrd"}}>
      <Frame />
      <Hexgrid />
      <Dot data={penguins} {...hexbin({fill: "count"}, {...xy, stroke: "currentColor", strokeWidth: 0.5})} />
      <Text data={penguins} {...hexbin({text: "count"}, xy)} />
    </Replot>
  );
}
