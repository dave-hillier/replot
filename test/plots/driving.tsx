import {Replot, Line, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function driving() {
  const driving = await d3.csv<any>("data/driving.csv", d3.autoType);
  return (
    <Replot
      inset={10}
      grid={true}
      x={{
        label: "Miles driven (per person-year)"
      }}
      y={{
        label: "Cost of gasoline ($ per gallon)"
      }}
    >
      <Line data={driving} x="miles" y="gas" curve="catmull-rom" markerMid="arrow" />
      <Text data={driving} filter={(d) => d.year % 5 === 0} x="miles" y="gas" text={(d) => `${d.year}`} dy={-12} />
    </Replot>
  );
}
