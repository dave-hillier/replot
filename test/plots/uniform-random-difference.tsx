import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function uniformRandomDifference() {
  const random = d3.randomLcg(42);
  return (
    <Replot
      x={{
        label: "Difference of two uniform random variables",
        labelAnchor: "center"
      }}
      y={{
        grid: true,
        percent: true
      }}
    >
      <RectY data={{length: 10000}} {...binX({y: "proportion"}, {x: () => random() - random()})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
