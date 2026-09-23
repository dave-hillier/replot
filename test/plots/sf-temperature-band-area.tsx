import {Replot, AreaY, Line, windowY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function sfTemperatureBandArea() {
  const temperatures = await d3.csv<any>("data/sf-temperatures.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        label: "Daily temperature range (°F)"
      }}
      width={960}
    >
      <AreaY
        data={temperatures}
        {...windowY({k: 7, strict: true, x: "date", y1: "low", y2: "high", curve: "step", fill: "#ccc"})}
      />
      <Line
        data={temperatures}
        {...windowY({k: 7, strict: true, x: "date", y: (d) => (d.low + d.high) / 2, curve: "step"})}
      />
    </Replot>
  );
}
