import {Replot, Frame, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function anscombeQuartet() {
  const anscombe = await d3.csv<any>("data/anscombe.csv", d3.autoType);
  return (
    <Replot
      grid={true}
      inset={10}
      width={960}
      height={240}
      facet={{
        data: anscombe,
        x: "series"
      }}
    >
      <Frame />
      <Dot data={anscombe} x="x" y="y" />
    </Replot>
  );
}
