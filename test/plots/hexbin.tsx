import {Replot, Hexgrid, Frame, Dot, hexbin as hexbinTransform} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hexbin() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Hexgrid />
      <Frame />
      <Dot data={penguins} {...hexbinTransform({r: "count"}, {x: "culmen_depth_mm", y: "culmen_length_mm"})} />
    </Replot>
  );
}

export async function hexbinFillX() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Hexgrid />
      <Frame />
      <Dot
        data={penguins}
        {...hexbinTransform({r: "count", fill: "x"}, {x: "culmen_depth_mm", y: "culmen_length_mm"})}
      />
    </Replot>
  );
}
