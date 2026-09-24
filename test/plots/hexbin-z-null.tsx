import {Replot, Hexgrid, Frame, Circle, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hexbinZNull() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot inset={10}>
      <Hexgrid />
      <Frame />
      <Circle
        data={penguins}
        {...hexbin(
          {r: "count", stroke: "mode", fill: "mode"},
          {x: "culmen_depth_mm", y: "culmen_length_mm", z: null, fill: "island", stroke: "species"}
        )}
      />
    </Replot>
  );
}
