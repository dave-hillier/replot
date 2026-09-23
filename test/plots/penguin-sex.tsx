import {Replot, BarY, RuleY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinSex() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <BarY data={penguins} {...groupX({y: "count"}, {x: "sex"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
