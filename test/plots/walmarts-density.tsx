import {Replot, Density, Dot, Geo} from "../../src/react/api.js";
import * as d3 from "d3";
import {mesh} from "topojson-client";

export async function walmartsDensity() {
  const [walmarts, statemesh] = await Promise.all([
    d3.tsv<any>("data/walmarts.tsv", d3.autoType),
    d3.json<any>("data/us-counties-10m.json").then((us) =>
      mesh(us, {
        type: "GeometryCollection",
        geometries: us.objects.states.geometries.filter((d) => d.id !== "02" && d.id !== "15")
      })
    )
  ]);
  return (
    <Replot
      width={960}
      height={600}
      projection="albers-usa"
      color={{
        scheme: "blues"
      }}
    >
      <Density data={walmarts} x="longitude" y="latitude" bandwidth={12} fill="density" />
      <Dot data={walmarts} x="longitude" y="latitude" r={1} fill="currentColor" />
      <Geo data={statemesh} strokeOpacity={0.3} />
    </Replot>
  );
}
