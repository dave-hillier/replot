import {Replot, LineY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentIndex() {
  const data = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot>
      <LineY data={data} y="unemployment" />
    </Replot>
  );
}
