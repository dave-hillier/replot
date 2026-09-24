import {Replot, Frame, Raster, DelaunayMesh, Dot} from "../../src/react/api.js";

export async function interpolateBarycentric4() {
  const I = [0, 1, 2, 3];
  const X = [297, 295, 80, 59];
  const Y = [269, 266, 275, 265];
  return (
    <Replot color={{scheme: "greys", domain: [-0.1, 8]}} x={{domain: [53, 314]}} y={{domain: [265, 276]}}>
      <Frame fill="red" />
      <Raster data={I} pixelSize={1} x={X} y={Y} fill={I} interpolate="barycentric" imageRendering="pixelated" />
      <DelaunayMesh data={I} x={X} y={Y} stroke="black" />
      <Dot data={I} x={X} y={Y} r={2} fill="black" />
    </Replot>
  );
}

export async function interpolateBarycentric4k() {
  const {x, y, v} = await fetch("data/4kpoints.json").then((d) => d.json());
  return (
    <Replot color={{scheme: "rdbu", range: [0.2, 0.8]}} x={{domain: [0.5, 580.5]}} y={{domain: [0, 350]}}>
      <Frame fill="black" />
      <Raster data={{length: x.length}} x={x} y={y} fill={v} interpolate="barycentric" imageRendering="pixelated" />
    </Replot>
  );
}
