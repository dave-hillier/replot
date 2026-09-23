import {Replot, BoxX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function morleyBoxplot() {
  const morley = await d3.csv<any>("data/morley.csv", d3.autoType);
  return (
    <Replot x={{grid: true, inset: 6}}>
      <BoxX data={morley} x="Speed" y="Expt" />
    </Replot>
  );
}
