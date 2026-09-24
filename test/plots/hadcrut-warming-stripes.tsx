import {Replot, BarX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hadcrutWarmingStripes() {
  const hadcrut = (await d3.text("data/hadcrut-annual.txt"))
    .trim() // trim trailing newline
    .split(/\n/g) // split into lines
    .map((line) => line.split(/\s+/g)) // split each line into fields
    .map(([year, anomaly]) => ({
      // extract the year and median anomaly
      year: new Date(Date.UTC(+year, 0, 1)),
      anomaly: +anomaly
    }));
  return (
    <Replot x={{round: true}} color={{scheme: "BuRd", symmetric: false}}>
      <BarX data={hadcrut} x1="year" x2={(d) => d3.utcYear.offset(d.year)} fill="anomaly" />
    </Replot>
  );
}
