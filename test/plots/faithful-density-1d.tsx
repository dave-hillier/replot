import {Replot, Density, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function faithfulDensity1d() {
  const faithful = await d3.tsv<any>("data/faithful.tsv", d3.autoType);
  return (
    <Replot height={100} inset={20}>
      <Density data={faithful} x="waiting" stroke="steelblue" strokeWidth={0.25} bandwidth={10} />
      <Density data={faithful} x="waiting" stroke="steelblue" thresholds={4} bandwidth={10} />
      <Dot data={faithful} x="waiting" fill="currentColor" r={1.5} />
    </Replot>
  );
}
