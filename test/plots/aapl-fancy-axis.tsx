import {Replot, RuleY, Line, GridY, AxisY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplFancyAxis() {
  const AAPL = await d3.csv<{Close: number; Date: Date}>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <RuleY data={[0]} />
      <Line data={AAPL} x="Date" y="Close" />
      <GridY x={(y) => AAPL.find((d) => d.Close >= y)?.Date} insetLeft={-6} />
      <AxisY x={(y) => AAPL.find((d) => d.Close >= y)?.Date} insetLeft={-6} textStroke="white" />
    </Replot>
  );
}
