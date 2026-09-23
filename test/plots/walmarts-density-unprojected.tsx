import {Replot, Density, Geo} from "../../src/react/api.js";
import * as d3 from "d3";

export async function walmartsDensityUnprojected() {
  const walmarts = await d3.tsv<any>("data/walmarts.tsv", d3.autoType);
  return (
    <Replot
      width={960}
      height={600}
      grid={true}
      color={{
        scheme: "blues"
      }}
    >
      <Density data={walmarts} x="longitude" y="latitude" bandwidth={12} fill="density" />
      <Geo data={{type: "MultiPoint", coordinates: walmarts.map((d) => [d.longitude, d.latitude])}} />
    </Replot>
  );
}
