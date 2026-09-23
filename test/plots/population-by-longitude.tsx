import {Replot, Geo, Graticule, Dot, Frame, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function populationByLongitude() {
  const world = await d3.json<any>("data/countries-110m.json");
  const land = feature(world, world.objects.land);
  const cities = await d3.csv<any>("data/cities-10k.csv", d3.autoType);
  return (
    <Replot style={{overflow: "visible"}} projection={{type: "equirectangular", rotate: [-10, 0]}} r={{range: [0, 5]}}>
      <Geo data={land} fill="#f0f0f0" />
      <Graticule />
      <Dot
        data={d3.sort(cities, (d) => -d.population).slice(0, 5000)}
        {...dodgeY({x: "longitude", y: "latitude", r: "population", fill: "currentColor", anchor: "middle"})}
      />
      <Frame />
    </Replot>
  );
}
