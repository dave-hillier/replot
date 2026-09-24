import {Replot, RectY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplVolumeRect() {
  const AAPL = (await d3.csv<any>("data/aapl.csv", d3.autoType)).slice(-40);
  return (
    <Replot
      y={{
        grid: true,
        transform: (d) => d / 1e6,
        label: "Daily trade volume (millions)"
      }}
    >
      <RectY data={AAPL} x="Date" interval="day" y="Volume" fill="#ccc" />
      <RuleY data={AAPL} x="Date" interval="day" y="Volume" />
      <RuleY data={[0]} />
    </Replot>
  );
}
