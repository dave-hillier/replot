import {Replot, BarY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function letterFrequencyColumn() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot x={{label: null}} y={{label: "Frequency (%)", transform: (y) => y * 100, grid: true}}>
      <BarY data={alphabet} x="letter" y="frequency" />
      <RuleY data={[0]} />
    </Replot>
  );
}
