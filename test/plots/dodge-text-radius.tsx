import {Replot, Dot, Text, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function dodgeTextRadius() {
  const random = d3.randomLcg(42);
  const length = 100;
  const X = Float64Array.from({length}, random);
  const R = Float64Array.from({length}, random);
  return (
    <Replot
      height={400}
      nice={true}
      r={{
        range: [0, 22]
      }}
    >
      <Dot data={{length}} {...dodgeY({x: X, r: R})} />
      <Text data={{length}} {...dodgeY({x: X, r: R})} />
    </Replot>
  );
}
