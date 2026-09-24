import {Replot, Geo, Graticule, Sphere} from "../../src/react/api.js";
import * as d3 from "d3";
import {geoArmadillo} from "d3-geo-projection";
import {feature} from "topojson-client";

export async function armadillo() {
  const world = await d3.json<any>("data/countries-50m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot
      width={960}
      height={548}
      margin={1}
      projection={({width, height}) => geoArmadillo().precision(0.2).fitSize([width, height], {type: "Sphere"})}
    >
      <Geo data={land} clip="sphere" fill="currentColor" />
      <Graticule clip={{type: "Sphere"}} />
      <Sphere />
    </Replot>
  );
}
