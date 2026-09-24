import {Replot, AreaY, LineY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function availability() {
  const data = await d3.csv<any>("data/availability.csv", d3.autoType);
  const sum = (d) => (d.length ? d3.sum(d) : NaN); // force gaps
  return (
    <Replot height={180}>
      <AreaY data={data} x="date" y="value" interval="day" reduce={sum} curve="step" fill="#f2f2fe" />
      <LineY data={data} x="date" y="value" interval="day" reduce={sum} curve="step" />
      <RuleY data={[0]} />
    </Replot>
  );
}
