import {Replot, Cell, group} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattleTemperatureCell() {
  const seattle = await d3.csv<any>("data/seattle-weather.csv", d3.autoType);
  return (
    <Replot
      height={300}
      padding={0}
      y={{
        tickFormat: (i) => "JFMAMJJASOND"[i]
      }}
    >
      <Cell
        data={seattle}
        {...group(
          {fill: "max"},
          {
            x: (d) => d.date.getUTCDate(),
            y: (d) => d.date.getUTCMonth(),
            fill: "temp_max",
            inset: 0.5
          }
        )}
      />
    </Replot>
  );
}
