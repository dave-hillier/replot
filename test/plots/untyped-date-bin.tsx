import {Replot, RectY, RuleY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function untypedDateBin() {
  const aapl = await d3.csv<any>("data/aapl.csv");
  return (
    <Replot
      y={{
        transform: (d) => d / 1e6
      }}
    >
      <RectY data={aapl} {...binX({y: "sum"}, {x: "Date", thresholds: "month", y: "Volume"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
