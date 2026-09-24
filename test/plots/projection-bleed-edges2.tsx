import {Replot, Graticule, Geo, Frame} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionBleedEdges2() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot
      width={600}
      height={600}
      facet={{x: [1, 2], data: [1, 2]}}
      projection={{
        type: "azimuthal-equidistant",
        rotate: [90, -90],
        domain: d3.geoCircle().center([0, 90]).radius(85)(),
        clip: "frame",
        inset: -185
      }}
    >
      <Graticule />
      <Geo data={land} fill="#ccc" stroke="currentColor" />
      <Frame stroke="white" />
    </Replot>
  );
}
