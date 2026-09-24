import {Replot, AreaY, AxisFy, AxisX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function trafficHorizon() {
  const data = d3.sort(await d3.csv<any>("data/traffic.csv", d3.autoType), (d) => d.date);
  const bands = 5; // just a hint; not guaranteed
  const max = d3.max(data, (d) => d.vehicles);
  const step = d3.tickStep(0, max, bands);
  const ticks = d3.ticks(0, max, bands);
  return (
    <Replot
      width={960}
      height={1100}
      margin={0}
      marginTop={30}
      y={{
        axis: null,
        domain: [0, step]
      }}
      color={{
        type: "ordinal",
        scheme: "blues",
        tickFormat: (
          (f) => (t) =>
            `≥${f(t)}`
        )(d3.format(",")),
        legend: true
      }}
      fy={{
        domain: data.map((d) => d.location) // respect input order
      }}
    >
      {ticks.map((t) => (
        <AreaY data={data} x="date" y={(d) => d.vehicles - t} fy="location" fill={t} clip={true} />
      ))}
      <AxisFy frameAnchor="left" label={null} />
      <AxisX anchor="top" filter={(d, i) => i > 0} />
    </Replot>
  );
}
