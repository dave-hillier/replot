import {Replot, Graticule, Geo, Frame, Dot, Text} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function projectionFitAntarctica() {
  const world = await d3.json<any>("data/countries-50m.json");
  const domain = feature(
    world,
    world.objects.countries.geometries.find((d) => d.properties.name === "Antarctica")
  );
  return (
    <Replot
      width={600}
      height={600}
      inset={30}
      style="overflow: visible;"
      projection={{
        type: "azimuthal-equidistant",
        rotate: [0, 90],
        domain
      }}
    >
      <Graticule />
      <Geo data={domain} fill="currentColor" />
      <Frame />
      {/* Since we’re using the default clip: "frame" for the projection, these
      marks should not be rendered; the projected point is outside the frame. */}
      <Dot data={{length: 1}} x={-90} y={-63} />
      <Text data={{length: 1}} x={-90} y={-63} text={["Do not render"]} />
    </Replot>
  );
}
