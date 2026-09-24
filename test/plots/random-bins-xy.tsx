import {Replot, Dot, bin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function randomBinsXY() {
  const random = d3.randomNormal.source(d3.randomLcg(42))(10, 3);
  const data = Array.from({length: 500}, () => [random(), random()]);
  return (
    <Replot>
      <Dot data={data} {...bin()} />
    </Replot>
  );
}
