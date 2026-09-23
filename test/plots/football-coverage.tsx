import {Replot, Frame, Dot, stackX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function footballCoverage() {
  const football = await d3.csv<any>("data/football-coverage.csv", d3.autoType);
  return (
    <Replot
      x={{axis: null}}
      y={{grid: true, domain: [0, 0.5], tickFormat: "%"}}
      facet={{data: football, x: "coverage"}}
    >
      <Frame />
      <Dot data={football} {...stackX({offset: "center", y: (d) => +d.value.toFixed(2), fill: "black"})} />
    </Replot>
  );
}
