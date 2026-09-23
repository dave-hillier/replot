import {Replot, BoxX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function diamondsBoxplot() {
  const diamonds = await d3.csv<any>("data/diamonds.csv", d3.autoType);
  return (
    <Replot>
      <BoxX data={diamonds} x="price" y="clarity" sort={{y: "x"}} />
    </Replot>
  );
}
