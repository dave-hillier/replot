import {Replot, BarX, TextX, RuleX, stackX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function wealthBritainBar() {
  const data = await d3.csv<any>("data/wealth-britain.csv", d3.autoType);
  return (
    <Replot>
      <BarX data={data} {...stackX({x: "wealth", fill: "age"})} />
      <TextX data={data} {...stackX({x: "wealth", text: "age"})} />
      <RuleX data={[0, 100]} />
    </Replot>
  );
}
