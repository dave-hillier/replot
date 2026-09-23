import {Replot, Geo, Frame} from "../../src/react/api.js";
import * as d3 from "d3";
import {mesh} from "topojson-client";

export async function projectionHeightAlbers() {
  const [conus, countymesh] = await d3
    .json<any>("data/us-counties-10m.json")
    .then((us) => [mesh(us, us.objects.states, (a, b) => a === b), mesh(us, us.objects.counties, (a, b) => a !== b)]);
  return (
    <Replot
      projection={{
        type: "albers-usa"
      }}
    >
      <Geo data={conus} strokeWidth={1.5} />
      <Geo data={countymesh} strokeOpacity={0.1} />
      <Frame stroke="red" strokeDasharray={4} />
    </Replot>
  );
}
