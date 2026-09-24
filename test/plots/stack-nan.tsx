import {Replot, AreaY, LineY, stackY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function stackNaN() {
  const industries = await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType);
  for (const [i, [, D]] of d3.groups(industries, (d) => d.industry).entries()) {
    const lo = Date.UTC(2000 + i, 0, 1, 8);
    const hi = Date.UTC(2002 + i, 0, 1, 8);
    for (const d of D) {
      if (d.date >= lo && d.date < hi) {
        d.unemployed = NaN;
      }
    }
  }
  return (
    <Replot y={{grid: true, label: "Unemployed (thousands)", transform: (d: number) => d / 1000}}>
      <AreaY data={industries} x="date" y="unemployed" fill="industry" fillOpacity={0.5} />
      <LineY data={industries} {...stackY({x: "date", y: "unemployed", stroke: "industry"})} />
    </Replot>
  );
}
