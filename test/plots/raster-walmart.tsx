import {Replot, Raster, Geo} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature, mesh} from "topojson-client";

async function rasterWalmart(options) {
  const [walmarts, [outline, statemesh]] = await Promise.all([
    d3.tsv<any>("data/walmarts.tsv", d3.autoType),
    d3
      .json<any>("data/us-counties-10m.json")
      .then((us) => [feature(us, us.objects.nation.geometries[0]), mesh(us, us.objects.states, (a, b) => a !== b)])
  ]);
  return (
    <Replot projection="albers" color={{scheme: "spectral"}}>
      <Raster data={walmarts} x="longitude" y="latitude" {...options} clip={outline} />
      <Geo data={statemesh} />
    </Replot>
  );
}

export async function rasterWalmartBarycentric() {
  return rasterWalmart({interpolate: "barycentric", fill: "date"});
}

export async function rasterWalmartBarycentricOpacity() {
  return rasterWalmart({interpolate: "barycentric", fillOpacity: "date"});
}

export async function rasterWalmartRandomWalk() {
  return rasterWalmart({interpolate: "random-walk", fill: "date"});
}

export async function rasterWalmartWalkOpacity() {
  return rasterWalmart({interpolate: "random-walk", fillOpacity: "date"});
}
