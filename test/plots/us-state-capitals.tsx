import {Replot, Geo, Dot, Text} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature, mesh} from "topojson-client";

export async function usStateCapitals() {
  const [[states, statemesh], capitals] = await Promise.all([
    d3
      .json<any>("data/us-counties-10m.json")
      .then((us) => [feature(us, us.objects.states), mesh(us, us.objects.states, (a, b) => a !== b)]),
    d3.csv<any>("data/us-state-capitals.csv", d3.autoType)
  ]);
  return (
    <Replot width={960} height={600} projection="albers-usa">
      <Geo data={states} fill="#ccc" />
      <Geo data={statemesh} stroke="white" />
      <Dot data={capitals} x="longitude" y="latitude" fill="currentColor" />
      <Text
        data={capitals}
        x="longitude"
        y="latitude"
        frameAnchor="bottom"
        text={(d) => `${d.capital}\n${d.state}`}
        dy={-6}
      />
    </Replot>
  );
}
