import {Replot, Geo, Spike, geoCentroid} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature, mesh} from "topojson-client";

export async function usCountySpikes() {
  const [[nation, counties, statemesh], population] = await Promise.all([
    d3
      .json<any>("data/us-counties-10m.json")
      .then((us) => [
        feature(us, us.objects.nation),
        feature(us, us.objects.counties),
        mesh(us, us.objects.states, (a, b) => a !== b)
      ]),
    d3
      .csv("data/us-county-population.csv")
      .then((data) => new Map(data.map(({state, county, population}) => [state + county, +population])))
  ]);
  return (
    <Replot
      width={960}
      height={600}
      projection="albers-usa"
      length={{
        range: [0, 200]
      }}
    >
      <Geo data={nation} fill="#e0e0e0" />
      <Geo data={statemesh} stroke="white" />
      <Spike data={counties.features} {...geoCentroid({stroke: "red", length: (d) => population.get(d.id)})} />
    </Replot>
  );
}
