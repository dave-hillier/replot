import {Replot, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function letterFrequencyDot() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={alphabet} x="letter" r="frequency" />
    </Replot>
  );
}
