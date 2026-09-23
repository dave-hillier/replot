import {Replot, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattleTemperatureBand() {
  const data = await d3.csv<any>("data/seattle-weather.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        label: "Temperature (°F)",
        transform: (f) => (f * 9) / 5 + 32 // convert from Celsius
      }}
      color={{
        type: "linear",
        scheme: "BuRd"
      }}
    >
      <RuleX data={data} x="date" y1="temp_min" y2="temp_max" stroke="temp_min" />
    </Replot>
  );
}
