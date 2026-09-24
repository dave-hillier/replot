import {Replot, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function letterFrequencyCloud() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  const random = d3.randomLcg(3);
  const max = d3.max(alphabet, (d) => d.frequency);
  return (
    <Replot x={{axis: null, domain: [-0.1, 1.1]}} y={{axis: null, domain: [-0.1, 1.2]}}>
      <Text data={alphabet} x={random} y={random} text="letter" fontSize={(d) => 10 + 200 * (d.frequency / max)} />
    </Replot>
  );
}
