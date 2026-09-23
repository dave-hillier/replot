import {Replot, BarY, TickY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function downloadsOrdinal() {
  const downloads = (await d3.csv<any>("data/downloads.csv", d3.autoType)).filter(
    (d) => d.date.getUTCFullYear() === 2019 && d.date.getUTCMonth() <= 1 && d.downloads > 0
  );
  return (
    <Replot x={{interval: "day"}}>
      <BarY data={downloads} x="date" y="downloads" fill="#ccc" />
      <TickY data={downloads} x="date" y="downloads" />
      <RuleY data={[0]} />
    </Replot>
  );
}
