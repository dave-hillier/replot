import {Replot, BarX, Frame, Text, groupY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinAnnotated() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot marginLeft={75} x={{insetRight: 10}}>
      <BarX data={penguins} {...groupY({x: "count"}, {y: "species", fill: "sex", title: "sex", sort: {y: "-x"}})} />
      <Frame />
      <Text
        data={["Count of penguins\ngrouped by species\n and colored by sex"]}
        frameAnchor="bottom-right"
        dx={-3}
        dy={-3}
        fontStyle="italic"
      />
    </Replot>
  );
}
