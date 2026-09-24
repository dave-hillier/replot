import {Replot, Density, Frame} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinDensity() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot inset={30}>
      <Density data={penguins} x="flipper_length_mm" y="culmen_length_mm" />
      <Frame />
    </Replot>
  );
}
