import {Replot, Dot, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

// A channel of explicit symbols does not show in the tip nor has a legend.
export async function explicitSymbol() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={220} symbol={{legend: true}}>
      <Dot
        data={penguins}
        {...dodgeY({x: "culmen_length_mm", symbol: (d: any) => (d.sex === "FEMALE" ? "square" : "star"), tip: true})}
      />
    </Replot>
  );
}
