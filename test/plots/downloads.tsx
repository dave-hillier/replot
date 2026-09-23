import {Replot, AreaY, RuleY, LineY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function downloads() {
  const downloads = (await d3.csv<any>("data/downloads.csv", d3.autoType)).filter((d) => d.downloads > 0);
  return (
    <Replot>
      <AreaY data={downloads} x="date" interval="day" y="downloads" curve="step" fill="#ccc" />
      <RuleY data={[0]} />
      <LineY data={downloads} x="date" interval="day" y="downloads" curve="step" strokeWidth={1} />
    </Replot>
  );
}
