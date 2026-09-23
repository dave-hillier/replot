import {Replot, AreaY, RuleY, stackY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function industryUnemploymentShare() {
  const data = await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType);
  return (
    <Replot y={{grid: true, tickFormat: "%"}}>
      <AreaY
        data={data}
        {...stackY({
          x: "date",
          y: "unemployed",
          fill: "industry",
          offset: "normalize",
          title: "industry"
        })}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
