import {Replot, AreaY, Line, windowY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function sfTemperatureBand() {
  const temperatures = await d3.csv<any>("data/sf-temperatures.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        label: "Daily temperature range (°F)"
      }}
      width={960}
    >
      <AreaY data={temperatures} x="date" y1="low" y2="high" curve="step" fill="#ccc" />
      <Line
        data={temperatures}
        {...windowY({x: "date", y: "low", k: 7, strict: true, curve: "step", stroke: "blue"})}
      />
      <Line
        data={temperatures}
        {...windowY({x: "date", y: "high", k: 7, strict: true, curve: "step", stroke: "red"})}
      />
    </Replot>
  );
}
