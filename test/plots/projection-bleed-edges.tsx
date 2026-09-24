import {Replot, Geo, Graticule} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionBleedEdges() {
  const world = await d3.json<any>("data/countries-50m.json");
  const domain = feature(world, world.objects.land);
  const width = 600;
  return (
    <Replot
      width={width}
      height={width}
      projection={{
        type: "azimuthal-equal-area",
        rotate: [45, -90],
        domain: {type: "Sphere"},
        clip: 31,
        inset: -width * (Math.SQRT1_2 - 0.5) // extend to corners instead of edges
      }}
    >
      <Geo data={domain} fill="#ccc" stroke="currentColor" />
      <Graticule />
    </Replot>
  );
}
