import {Replot, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesHeightWeight() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot grid={true} height={640}>
      <Dot data={athletes} x="weight" y="height" />
    </Replot>
  );
}
