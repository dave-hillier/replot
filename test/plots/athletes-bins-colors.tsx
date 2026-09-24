import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesBinsColors() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <RectY data={athletes} {...binX({fill: "x", y: "count"}, {x: "weight"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
