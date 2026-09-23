import {Replot, BarX, Frame, Text, groupY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinFacetAnnotatedX() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot marginLeft={75} x={{insetRight: 10}}>
      <BarX data={penguins} {...groupY({x: "count"}, {fx: "island", y: "species", fill: "sex"})} />
      <Frame />
      <Text
        data={["Torgersen Island only has Adelie penguins!"]}
        fx={["Torgersen"]}
        frameAnchor="top-right"
        dy={4}
        dx={-4}
        lineWidth={10}
      />
    </Replot>
  );
}
