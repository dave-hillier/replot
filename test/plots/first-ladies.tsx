import {Replot, BarX, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function firstLadies() {
  const data = await d3.csv<any>("data/first-ladies.csv", d3.autoType);
  const now = new Date("2021-07-19");
  return (
    <Replot
      width={960}
      marginRight={120}
      x={{
        axis: "top"
      }}
      y={{
        axis: null
      }}
    >
      <BarX data={data} x1="birth" x2={(d) => d.death ?? now} y="name" fill="#ccc" />
      <BarX data={data} x1="tenure_start" x2={(d) => d.tenure_end ?? now} y="name" sort={{y: "x1", reduce: "min"}} />
      <Text data={data} x={(d) => d.death ?? now} y="name" text="name" textAnchor="start" dx={5} />
    </Replot>
  );
}
