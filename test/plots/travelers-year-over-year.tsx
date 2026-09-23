import {Replot, RuleY, Line, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function travelersYearOverYear() {
  const data = await d3.csv<any>("data/travelers.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        nice: true,
        label: "Travelers per day (millions)",
        transform: (d) => d / 1e6
      }}
    >
      <RuleY data={[0]} />
      <Line data={data} x="date" y="previous" stroke="#bab0ab" />
      <Line data={data} x="date" y="current" />
      <Text data={data.slice(0, 1)} x="date" y="previous" text={["2019"]} fill="#bab0ab" dy={-8} />
      <Text data={data.slice(0, 1)} x="date" y="current" text={["2020"]} dy={8} />
    </Replot>
  );
}
