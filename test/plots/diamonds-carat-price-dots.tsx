import {Replot, Dot, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function diamondsCaratPriceDots() {
  const data = await d3.csv<any>("data/diamonds.csv", d3.autoType);
  return (
    <Replot
      height={640}
      grid={true}
      marginLeft={44}
      x={{
        label: "Carats"
      }}
      y={{
        label: "Price ($)"
      }}
      r={{
        domain: [0, 100],
        range: [0, 3]
      }}
    >
      <Dot data={data} {...bin({r: "count"}, {x: "carat", y: "price", thresholds: 100})} />
    </Replot>
  );
}
