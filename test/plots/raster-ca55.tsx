import {Replot, Raster, Contour} from "../../src/react/api.js";
import * as d3 from "d3";

async function plotCa55(children) {
  const ca55 = await d3.csv<any>("data/ca55-south.csv", d3.autoType);
  const domain = {type: "MultiPoint", coordinates: ca55.map((d) => [d.GRID_EAST, d.GRID_NORTH])} as const;
  return (
    <Replot width={640} height={484} projection={{type: "reflect-y", inset: 3, domain}} color={{type: "diverging"}}>
      {children(ca55)}
    </Replot>
  );
}

async function rasterCa55(options) {
  return plotCa55((ca55) => [<Raster data={ca55} x="GRID_EAST" y="GRID_NORTH" fill="MAG_IGRF90" {...options} />]);
}

export async function rasterCa55None() {
  return rasterCa55({pixelSize: 3, imageRendering: "pixelated"});
}

export async function rasterCa55Barycentric() {
  return rasterCa55({interpolate: "barycentric"});
}

export async function rasterCa55RandomWalk() {
  return rasterCa55({interpolate: "random-walk"});
}

export async function rasterCa55Nearest() {
  return rasterCa55({interpolate: "nearest"});
}

export async function rasterCa55Color() {
  const ca55 = await d3.csv<any>("data/ca55-south.csv", d3.autoType);
  const domain = {type: "MultiPoint", coordinates: ca55.map((d) => [d.GRID_EAST, d.GRID_NORTH])} as const;
  return (
    <Replot width={640} height={484} projection={{type: "reflect-y", inset: 3, domain}}>
      <Raster
        data={ca55}
        x="GRID_EAST"
        y="GRID_NORTH"
        interpolate="random-walk"
        fill={(d) => d3.hcl(d.MAG_IGRF90, 120, 80).formatHex()}
      />
    </Replot>
  );
}

export async function contourCa55() {
  return plotCa55((ca55) => [
    <Contour data={ca55} x="GRID_EAST" y="GRID_NORTH" fill="MAG_IGRF90" stroke="currentColor" blur={3} />
  ]);
}
