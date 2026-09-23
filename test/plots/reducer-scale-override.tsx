import {Replot, BarY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

async function reducerScaleOverride(reduce) {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <BarY
        data={penguins}
        {...groupX(
          {y: "count", fill: {reduce, scale: true}},
          {x: "species", fill: (d) => (d.island === "Biscoe" ? "orange" : "green"), fy: "sex"}
        )}
      />
    </Replot>
  );
}

export async function reducerScaleOverrideFunction() {
  return reducerScaleOverride((values) => d3.mode(values));
}

export async function reducerScaleOverrideImplementation() {
  return reducerScaleOverride({reduceIndex: (index, values) => d3.mode(index, (i: number) => values[i])});
}

export async function reducerScaleOverrideName() {
  return reducerScaleOverride("mode");
}
