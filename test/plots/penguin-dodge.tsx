import {Replot, Dot, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinDodgeNegativeRadius() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={200}>
      <Dot data={penguins} {...dodgeY({x: "body_mass_g", r: -1})} />
    </Replot>
  );
}

export async function penguinDodge() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={200}>
      <Dot data={penguins} {...dodgeY({x: "body_mass_g"})} />
    </Replot>
  );
}
