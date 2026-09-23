import {Replot, AxisY, GridY, RuleY, Line} from "../../src/react/api.js";
import * as d3 from "d3";

export async function federalFunds() {
  const h15 = d3.csvParse((await d3.text("data/federal-funds.csv")).split("\n").slice(5).join("\n"), d3.autoType);
  return (
    <Replot marginLeft={0} x={{label: null, insetLeft: 28}} y={{label: "Federal funds rate (% per year)"}}>
      <AxisY
        interval={2}
        tickSize={0}
        dx={32}
        dy={-6}
        lineAnchor="bottom"
        tickFormat={(d) => (d === 10 ? `${d}%` : `${d}   `)}
      />
      <GridY interval={2} strokeDasharray={1.5} strokeOpacity={0.4} />
      <RuleY data={[0]} />
      <Line data={h15} x="Time Period" y="RIFSPFF_N.BWAW" markerEnd="dot" />
    </Replot>
  );
}
