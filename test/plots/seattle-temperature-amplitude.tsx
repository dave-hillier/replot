import {Replot, RuleY, Dot, Text, selectMaxY, formatMonth} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattleTemperatureAmplitude() {
  const data = await d3.csv<any>("data/seattle-weather.csv", d3.autoType);
  const delta = (d) => d.temp_max - d.temp_min;
  return (
    <Replot
      x={{label: "Daily low temperature (°F)", nice: true}}
      y={{label: "Daily temperature variation (Δ°F)", zero: true}}
      aspectRatio={1}
      color={{
        type: "cyclical",
        legend: true,
        tickFormat: formatMonth()
      }}
    >
      <RuleY data={[0]} />
      <Dot data={data} fill={(d) => d.date.getUTCMonth()} x="temp_min" y={delta} />
      <Dot data={data} {...selectMaxY({x: "temp_min", y: delta, r: 5})} />
      <Text data={data} {...selectMaxY({x: "temp_min", y: delta, text: "date", lineAnchor: "bottom", dy: -10})} />
    </Replot>
  );
}
