import {Replot, AreaY, LineY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function overlappingArea() {
  const industries = await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType);
  return (
    <Replot>
      <AreaY data={industries} x="date" y2="unemployed" z="industry" fillOpacity={0.1} />
      <LineY data={industries} x="date" y="unemployed" z="industry" strokeWidth={1} />
    </Replot>
  );
}
