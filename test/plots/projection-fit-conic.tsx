import {Replot, Graticule, Geo, Sphere} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionFitConic() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot
      width={640}
      height={400}
      projection={{
        type: "conic-equal-area",
        parallels: [-42, -5],
        rotate: [60, 0]
      }}
    >
      <Graticule />
      <Geo data={land} fill="currentColor" />
      <Sphere />
    </Replot>
  );
}
