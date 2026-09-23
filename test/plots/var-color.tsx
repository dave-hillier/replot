import {Replot, BarX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function varColor() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot style="--a: 0.5; --b: rgba(255, 0, 0, var(--a));">
      <BarX data={alphabet} x="frequency" y="letter" fill="var(--b)" sort={{y: "-x"}} />
    </Replot>
  );
}

export async function varColor2() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot style="--a: 0.5;">
      <BarX data={alphabet} x="frequency" y="letter" fill="rgba(255, 0, 0, var(--a))" sort={{y: "-x"}} />
    </Replot>
  );
}

export async function varColorP3() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot>
      <BarX data={alphabet} x="frequency" y="letter" fill="color(display-p3 1 0.5 0)" sort={{y: "-x"}} />
    </Replot>
  );
}
