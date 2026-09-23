import {Replot, RuleX, RuleY, Dot, Text, normalizeX, groupY, selectMinX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function usPopulationStateAgeDots() {
  const states = await d3.csv<any>("data/us-population-state-age.csv", d3.autoType);
  const ages = states.columns.slice(1);
  const stateage = ages.flatMap((age) => states.map((d) => ({state: d.name, age, population: d[age]})));
  const position = normalizeX("sum", {z: "state", x: "population", y: "state"});
  return (
    <Replot
      height={660}
      grid={true}
      x={{
        axis: "top",
        label: "Percent (%)",
        percent: true
      }}
      y={{
        axis: null
      }}
      color={{
        scheme: "spectral",
        domain: ages
      }}
    >
      <RuleX data={[0]} />
      <RuleY data={stateage} {...groupY({x1: "min", x2: "max"}, position)} />
      <Dot data={stateage} {...position} fill="age" />
      <Text
        data={stateage}
        {...selectMinX({
          ...position,
          textAnchor: "end",
          dx: -6,
          text: "state",
          sort: {y: "-x", reduce: "min"}
        })}
      />
    </Replot>
  );
}
