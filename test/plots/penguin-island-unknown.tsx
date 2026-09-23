import {Replot, BarY, RuleY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinIslandUnknown() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      color={{
        domain: ["Dream"],
        unknown: "#ccc"
      }}
    >
      <BarY data={penguins} {...groupX({y: "count", sort: "z"}, {x: "sex", fill: "island"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
