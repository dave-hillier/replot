import {Replot, Raster, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

async function rasterPenguins(options) {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Raster data={penguins} x="body_mass_g" y="flipper_length_mm" fill="island" {...options} />
      <Dot data={penguins} x="body_mass_g" y="flipper_length_mm" fill="island" stroke="white" />
    </Replot>
  );
}

export async function rasterPenguinsBarycentric() {
  return rasterPenguins({interpolate: "barycentric"});
}

export async function rasterPenguinsBarycentricBlur() {
  return rasterPenguins({interpolate: "barycentric", blur: 7});
}

export async function rasterPenguinsRandomWalk() {
  return rasterPenguins({interpolate: "random-walk"});
}

export async function rasterPenguinsBlur() {
  return rasterPenguins({interpolate: "random-walk", blur: 7});
}
