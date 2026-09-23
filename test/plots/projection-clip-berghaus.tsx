import {Replot, Graticule, Geo, Sphere} from "../../src/react/api.js";
import * as d3 from "d3";
import {geoBerghaus} from "d3-geo-projection";
import {feature} from "topojson-client";

export async function projectionClipBerghaus() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot width={600} height={600} projection={{type: geoBerghaus, domain: {type: "Sphere"}}}>
      <Graticule clip="sphere" />
      <Geo data={land} fill="currentColor" clip="sphere" />
      <Sphere />
    </Replot>
  );
}
