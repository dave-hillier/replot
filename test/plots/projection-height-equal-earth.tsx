import {Replot, Geo, Graticule, Sphere, Frame} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionHeightEqualEarth() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  return (
    <Replot facet={{data: [0, 1], x: [0, 1]}} projection="equal-earth">
      <Geo data={land} fill="currentColor" />
      <Graticule />
      <Sphere />
      <Frame stroke="red" strokeDasharray={4} />
    </Replot>
  );
}
