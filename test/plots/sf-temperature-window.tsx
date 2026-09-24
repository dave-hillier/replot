import {Replot, LineY, windowY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function sfTemperatureWindow() {
  const sftemp = await d3.csv<any>("data/sf-temperatures.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        label: "Temperature (°F)"
      }}
    >
      <LineY data={sftemp} x="date" y="low" strokeOpacity={0.3} />
      <LineY data={sftemp} {...windowY({k: 28, reduce: "min"}, {x: "date", y: "low", stroke: "blue"})} />
      <LineY data={sftemp} {...windowY({k: 28, reduce: "max"}, {x: "date", y: "low", stroke: "red"})} />
      <LineY data={sftemp} {...windowY({k: 28, reduce: "median"}, {x: "date", y: "low"})} />
    </Replot>
  );
}
