import {Replot, Graticule, Geo, Sphere} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionClipAngle() {
  const world = await d3.json<any>("data/countries-50m.json");
  const domain = feature(world, world.objects.land);
  return (
    <Replot
      width={600}
      height={600}
      projection={{type: "azimuthal-equidistant", clip: 30, rotate: [0, 89.9], domain: {type: "Sphere"}}}
    >
      <Graticule />
      <Geo data={domain} fill="currentColor" />
      <Sphere />
    </Replot>
  );
}
