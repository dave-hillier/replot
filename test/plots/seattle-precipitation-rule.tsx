import {Replot, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattlePrecipitationRule() {
  const data = await d3.csv<any>("data/seattle-weather.csv", d3.autoType);
  return (
    <Replot>
      <RuleX data={data} x="date" strokeOpacity="precipitation" />
    </Replot>
  );
}
