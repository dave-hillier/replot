import {Replot, RectY, binX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function randomBins() {
  const random = d3.randomExponential.source(d3.randomLcg(42))(1);
  const data = Array.from({length: 100}, random);
  return (
    <Replot>
      <RectY data={data} {...binX()} />
    </Replot>
  );
}
