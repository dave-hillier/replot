import {Replot, BarX, BarY, RuleY, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function errorBarX() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot>
      <BarX data={alphabet} x="frequency" y="letter" sort={{y: "-x"}} fill="steelblue" />
      <RuleY data={alphabet} x1={(d) => d.frequency * 0.9} x2={(d) => d.frequency * 1.1} y="letter" marker="tick" />
      <RuleX data={[0]} />
    </Replot>
  );
}

export async function errorBarY() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot>
      <BarY data={alphabet} x="letter" y="frequency" sort={{x: "-y"}} fill="steelblue" />
      <RuleX data={alphabet} x="letter" y1={(d) => d.frequency * 0.9} y2={(d) => d.frequency * 1.1} marker="tick" />
      <RuleY data={[0]} />
    </Replot>
  );
}
