import {Replot, Geo, Dot, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";
import {mesh} from "topojson-client";

export async function walmarts() {
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
        legend: true,
        label: "First year opened",
        scheme: "spectral"
      }}
      r={{
        range: [0, 20]
      }}
    >
      <Geo data={statemesh} strokeOpacity={0.25} />
      <Dot
        data={walmarts}
        {...hexbin(
          {r: "count", fill: "min", title: "min"},
          {x: "longitude", y: "latitude", fill: "date", stroke: "white", title: "date"}
        )}
      />
    </Replot>
  );
}
