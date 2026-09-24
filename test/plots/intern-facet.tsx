import {Replot, Dot, BoxX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function internFacetDate() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot grid={true} fy={{interval: d3.utcYear.every(10)}}>
      <Dot data={athletes} x="weight" y="height" fy="date_of_birth" />
    </Replot>
  );
}

export async function internFacetNaN() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot fy={{transform: (d) => (d ? Math.floor(d * 10) / 10 : NaN)}}>
      <BoxX data={athletes} x="weight" y="sex" fy="height" stroke="sex" r={1} />
    </Replot>
  );
}
