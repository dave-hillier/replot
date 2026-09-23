import {Replot, Density, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattlePrecipitationDensity() {
  const data = await d3.csv<any>("data/seattle-weather.csv", d3.autoType);
  return (
    <Replot>
      <Density data={data} x="temp_min" y="wind" weight="precipitation" />
      <Dot data={data} x="temp_min" y="wind" r="precipitation" fill="steelblue" fillOpacity={0.5} />
    </Replot>
  );
}
