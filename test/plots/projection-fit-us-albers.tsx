import {Replot, Geo} from "../../src/react/api.js";
import * as d3 from "d3";
import {mesh} from "topojson-client";

export async function projectionFitUsAlbers() {
  const [conus, countymesh] = await d3
    .json<any>("data/us-counties-10m.json")
    .then((us) => [
      mesh(us, filter48(us.objects.states), (a, b) => a === b),
      mesh(us, filter48(us.objects.counties), (a, b) => a !== b)
    ]);
  return (
    <Replot
      width={960}
      height={600}
      projection={{
        type: "conic-equal-area",
        rotate: [96, 0],
        parallels: [29.5, 45.5],
        domain: conus
      }}
    >
      <Geo data={conus} strokeWidth={1.5} />
      <Geo data={countymesh} strokeOpacity={0.1} />
    </Replot>
  );
}

// Removes Alaska, Hawaii, Puerto Rico, and U.S. territories.
function filter48({geometries}) {
  return {
    type: "GeometryCollection",
    geometries: geometries.filter(
      ({id}) => id.slice(0, 2) !== "02" && id.slice(0, 2) !== "15" && id.slice(0, 2) <= "56"
    )
  };
}
