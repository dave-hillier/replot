import {Replot, BarY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function ibmTrading() {
  const ibm = await d3.csv<any>("data/ibm.csv", d3.autoType).then((data) => data.slice(-20));
  return (
    <Replot x={{interval: "day"}} y={{transform: (d) => d / 1e6, label: "Volume (USD, millions)", grid: true}}>
      <BarY data={ibm} x="Date" y="Volume" />
    </Replot>
  );
}
