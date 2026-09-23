import {Replot, Arrow, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroInequalityChange() {
  const data = await d3.csv<any>("data/metros.csv", d3.autoType);
  return (
    <Replot
      grid={true}
      inset={10}
      x={{
        type: "log",
        label: "Population"
      }}
      y={{
        label: "Inequality"
      }}
      color={{
        scheme: "BuRd",
        symmetric: false
      }}
    >
      <Arrow
        data={data}
        x1="POP_1980"
        y1="R90_10_1980"
        x2="POP_2015"
        y2="R90_10_2015"
        bend={true}
        stroke={(d) => d.R90_10_2015 - d.R90_10_1980}
      />
      <Text
        data={data}
        x="POP_2015"
        y="R90_10_2015"
        filter="highlight"
        text="nyt_display"
        fill="currentColor"
        stroke="white"
        dy={-8}
      />
    </Replot>
  );
}
