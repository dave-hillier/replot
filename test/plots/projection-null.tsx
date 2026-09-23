import {Replot, Geo, Graticule} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionNull() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot projection={null}>
      <Geo data={land} />
      <Graticule />
    </Replot>
  );
}
