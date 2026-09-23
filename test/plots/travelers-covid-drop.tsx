import {Replot, LineY, windowY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function travelersCovidDrop() {
  const travelers = await d3.csv<any>("data/travelers.csv", d3.autoType);
  return (
    <Replot
      width={960}
      y={{
        grid: true,
        zero: true,
        label: "Drop in passenger throughput (2020 vs. 2019)",
        labelArrow: "down",
        tickFormat: "%"
      }}
    >
      <LineY data={travelers} x="date" y={(d) => d.current / d.previous - 1} strokeWidth={0.25} curve="step" />
      <LineY
        data={travelers}
        {...windowY({x: "date", y: (d) => d.current / d.previous - 1, k: 7, strict: true, stroke: "steelblue"})}
      />
    </Replot>
  );
}
