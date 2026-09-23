import {Replot, BoxX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function boxplot() {
  return (
    <Replot>
      <BoxX data={[0, 3, 4.4, 4.5, 4.6, 5, 7]} />
    </Replot>
  );
}

export async function boxplotFacetInterval() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      fy={{
        grid: true,
        tickFormat: String, // for debugging
        interval: 0.1,
        reverse: true
      }}
    >
      <BoxX data={olympians.filter((d) => d.height)} x="weight" fy="height" />
    </Replot>
  );
}

export async function boxplotFacetNegativeInterval() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      fy={{
        grid: true,
        tickFormat: String, // for debugging
        interval: -10, // 0.1
        reverse: true
      }}
    >
      <BoxX data={olympians.filter((d) => d.height)} x="weight" fy="height" />
    </Replot>
  );
}
