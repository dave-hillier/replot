import {Replot, Rect, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function diamondsCaratPrice() {
  const data = await d3.csv<any>("data/diamonds.csv", d3.autoType);
  return (
    <Replot
      height={640}
      marginLeft={44}
      color={{
        scheme: "bupu",
        type: "symlog"
      }}
    >
      <Rect data={data} {...bin({fill: "count"}, {x: "carat", y: "price", thresholds: 100})} />
    </Replot>
  );
}
