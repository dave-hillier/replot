import {Replot, Raster, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

// Test for floating point precision issue in interpolateBarycentric.
export async function rasterPrecision() {
  const data = d3.range(4).map((i) => {
    const x = i % 2;
    const y = Math.floor(i / 2);
    return [49.4 + 100 * (x + y), 150.4 + 100 * (x - y)];
  });
  return (
    <Replot x={{type: "identity"}} y={{type: "identity"}} color={{scheme: "Sinebow"}}>
      <Raster data={data} fill={(d, i) => i} interpolate="barycentric" />
      <Dot data={data} fill={(d, i) => i} stroke="white" />
    </Replot>
  );
}

export async function rasterMixedOpacity() {
  return (
    <Replot>
      <Raster
        width={4}
        height={10}
        imageRendering="pixelated"
        fill={(x: number, y: number) => (x < 2 ? d3.schemeObservable10[y | 0] : `rgba(128, 128, 128, ${y / 10})`)}
      />
    </Replot>
  );
}

export async function rasterFacet() {
  const points = d3.range(0, 2 * Math.PI, Math.PI / 10).map((d) => [Math.cos(d), Math.sin(d)]);
  return (
    <Replot aspectRatio={1} inset={100} color={{scheme: "Sinebow"}}>
      <Raster data={points} fill="0" fx={(d, i) => i % 2} interpolate="barycentric" />
      <Dot data={points} fx={(d, i) => i % 2} fill="0" stroke="white" />
    </Replot>
  );
}
