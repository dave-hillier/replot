import {Replot, DotX, mapY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function randomQuantile() {
  const randomNormal = d3.randomNormal.source(d3.randomLcg(42))();
  const randoms = Array.from({length: 300}, randomNormal);
  return (
    <Replot>
      <DotX data={randoms} {...mapY("quantile", {y: randoms})} />
    </Replot>
  );
}
