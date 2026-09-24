import {Replot, Graticule, Geo, Text, Frame, geoCentroid, centroid} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function countryCentroids() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  const countries = feature(world, world.objects.countries);
  return (
    <Replot projection="mercator">
      <Graticule />
      <Geo data={land} fill="#ddd" />
      <Geo data={countries} stroke="#fff" />
      <Text data={countries} {...geoCentroid({fill: "red", text: "id"})} />
      <Text data={countries} {...centroid({fill: "blue", text: "id"})} />
      <Frame />
    </Replot>
  );
}
