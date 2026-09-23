import {Replot, Text, RuleX, stackX2} from "../../src/react/api.js";
import * as d3 from "d3";

export async function caltrain() {
  const caltrain = await d3.csv<any>("data/caltrain.csv");
  return (
    <Replot
      width={240}
      axis={null}
      y={{
        domain: d3.range(3, 26).map(String)
      }}
      color={{
        domain: "NLB",
        range: ["currentColor", "peru", "brown"],
        legend: true
      }}
    >
      <Text data={[[1, "3"]]} text={["Northbound"]} textAnchor="start" />
      <Text data={[[-1, "3"]]} text={["Southbound"]} textAnchor="end" />
      <Text
        data={new Set(caltrain.map((d) => d.hours))}
        x={0}
        y={(d) => d}
        text={(d) => `${((d - 1) % 12) + 1}${d % 24 >= 12 ? "p" : "a"}`}
      />
      <Text
        data={caltrain}
        {...stackX2({
          filter: (d) => d.orientation === "N",
          x: 1,
          y: "hours",
          text: (d) => d.minutes.padStart(2, "0"),
          fill: "type",
          textAnchor: "start"
        })}
      />
      <Text
        data={caltrain}
        {...stackX2({
          filter: (d) => d.orientation === "S",
          x: -1,
          y: "hours",
          text: (d) => d.minutes.padStart(2, "0"),
          fill: "type",
          textAnchor: "end"
        })}
      />
      <RuleX data={[-0.5, 0.5]} />
    </Replot>
  );
}
