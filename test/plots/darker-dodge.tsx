import {Replot, DotX, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";
import {remap} from "../transforms/remap.js";

function darker(outputs: {[name: string]: number}, inputs) {
  return remap(
    Object.fromEntries(Object.entries(outputs).map(([name, value]) => [name, (v) => d3.lab(v).darker(value)])),
    inputs
  );
}

export async function darkerDodge() {
  const random = d3.randomLogNormal.source(d3.randomLcg(42))();
  return (
    <Replot height={170} nice={true}>
      <DotX
        data={Array.from({length: 150}, random)}
        {...dodgeY({anchor: "middle"}, darker({stroke: 2}, {x: (d) => d, fill: (d) => d, stroke: (d) => d}))}
      />
    </Replot>
  );
}
