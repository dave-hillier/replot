import {Replot, LineY, BarY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

async function getYearlyUnemployment() {
  return d3
    .rollups(
      await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType),
      (D) => d3.median(D, (d) => d.unemployed),
      (d) => d.date.getUTCFullYear(),
      (d) => d.industry
    )
    .flatMap(([year, industries]) => industries.map(([industry, unemployed]) => ({year, industry, unemployed})));
}

export async function yearFormat() {
  const data = await getYearlyUnemployment();
  return (
    <Replot>
      <LineY data={data} x="year" y="unemployed" stroke="industry" marker={true} tip={true} />
      <RuleY data={[0]} />
    </Replot>
  );
}

export async function yearFormatOrdinal() {
  const data = await getYearlyUnemployment();
  return (
    <Replot>
      <BarY data={data} x="year" y="unemployed" fill="industry" tip={true} />
      <RuleY data={[0]} />
    </Replot>
  );
}
