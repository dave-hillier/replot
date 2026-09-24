import {Replot, AreaY, Text, stackY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function wealthBritainProportionPlot() {
  const wide = await d3.csv<any>("data/wealth-britain.csv", d3.autoType);
  const columns = wide.columns.slice(1);
  const data = columns.flatMap((type) => wide.map((d) => ({age: d.age, type, value: d[type]})));
  const stack = (options) => stackY({}, {x: "type", y: "value", z: "age", ...options});
  return (
    <Replot
      x={{
        domain: columns,
        axis: "top",
        label: null,
        tickFormat: (d) => `Share of ${d}`,
        tickSize: 0,
        padding: 0 // see margins
      }}
      y={{
        axis: null,
        reverse: true
      }}
      color={{
        scheme: "prgn",
        reverse: true
      }}
      marginLeft={50}
      marginRight={60}
    >
      <AreaY
        data={data}
        {...stack({
          curve: "bump-x",
          fill: "age",
          stroke: "white"
        })}
      />
      <Text
        data={data}
        {...stack({
          filter: (d) => d.type === "population",
          text: (d) => `${d.value}%`,
          textAnchor: "end",
          dx: -6
        })}
      />
      <Text
        data={data}
        {...stack({
          filter: (d) => d.type === "wealth",
          text: (d) => `${d.value}%`,
          textAnchor: "start",
          dx: +6
        })}
      />
      <Text
        data={data}
        {...stack({
          filter: (d) => d.type === "population",
          text: "age",
          textAnchor: "start",
          fill: "white",
          fontWeight: "bold",
          dx: +8
        })}
      />
    </Replot>
  );
}
