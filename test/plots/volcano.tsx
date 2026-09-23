import {Replot, Raster, Contour, Frame, identity} from "../../src/react/api.js";
import * as d3 from "d3";

export async function volcano() {
  const volcano = await d3.json<any>("data/volcano.json");
  return (
    <Replot>
      <Raster data={volcano.values} width={volcano.width} height={volcano.height} />
      <Frame />
    </Replot>
  );
}

export async function volcanoTerrain() {
  const volcano = await d3.json<any>("data/volcano.json");
  return (
    <Replot
      color={{
        interpolate: d3.piecewise(d3.interpolateHsl, [
          d3.hsl(120, 1, 0.65 / 2),
          d3.hsl(60, 1, 0.9 / 2),
          d3.hsl(0, 0.4, 0.95)
        ])
      }}
    >
      <Raster data={volcano.values} width={volcano.width} height={volcano.height} />
      <Contour data={volcano.values} width={volcano.width} height={volcano.height} stroke="white" />
      <Frame />
    </Replot>
  );
}

export async function volcanoContour() {
  const volcano = await d3.json<any>("data/volcano.json");
  return (
    <Replot>
      <Contour
        data={volcano.values}
        width={volcano.width}
        height={volcano.height}
        fill={identity}
        stroke="currentColor"
      />
      <Frame />
    </Replot>
  );
}
