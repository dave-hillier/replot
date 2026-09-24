import {Replot, Geo, Graticule, Line, Sphere} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function beagle() {
  const world = await d3.json<any>("data/countries-50m.json");
  // note: this returns strings; we should clean it up to make a better example,
  // but we keep it to help test the projection’s robustness
  const beagle = await d3.text("data/beagle.csv").then(d3.csvParseRows);
  const land = feature(world, world.objects.land);
  return (
    <Replot width={960} height={480} projection={{type: "equal-earth", rotate: [-10, 0]}}>
      <Geo data={land} fill="currentColor" />
      <Graticule />
      <Line data={beagle} stroke={(d, i) => i} z={null} />
      <Sphere />
    </Replot>
  );
}
