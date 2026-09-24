import {Replot, AreaY, LineY, RuleY, stackY, stackY2} from "../../src/react/api.js";
import * as d3 from "d3";
import type * as PlotType from "@dave-hillier/replot";

export async function musicRevenue() {
  const riaa = await d3.csv<any>("data/riaa-us-revenue.csv", d3.autoType);
  const stack: PlotType.AreaYOptions = {
    x: "year",
    y: "revenue",
    z: "format",
    order: "-appearance"
  };
  return (
    <Replot
      y={{
        grid: true,
        label: "Annual revenue (billions, adj.)",
        transform: (d) => d / 1000
      }}
    >
      <AreaY data={riaa} {...stackY({...stack, fill: "group", title: (d) => `${d.format}\n${d.group}`})} />
      <LineY data={riaa} {...stackY2({...stack, stroke: "white", strokeWidth: 1})} />
      <RuleY data={[0]} />
    </Replot>
  );
}

export async function musicRevenueCustomOrder() {
  const riaa = await d3.csv<any>("data/riaa-us-revenue.csv", d3.autoType);
  return (
    <Replot
      y={{
        grid: true,
        label: "Annual revenue (billions, adj.)",
        transform: (d) => d / 1000
      }}
    >
      <AreaY
        data={riaa}
        {...stackY({
          x: "year",
          y: "revenue",
          z: "format",
          order: (a, b) => d3.ascending(a.group, b.group) || d3.descending(a.revenue, b.revenue),
          fill: "group",
          stroke: "white",
          title: (d) => `${d.format}\n${d.group}`
        })}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
