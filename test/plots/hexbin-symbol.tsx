import {Replot, Dot, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function hexbinSymbol() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot grid={true} symbol={{legend: true}}>
      <Dot data={penguins} {...hexbin({r: "count"}, {symbol: "sex", x: "culmen_depth_mm", y: "culmen_length_mm"})} />
    </Replot>
  );
}
