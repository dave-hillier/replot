import {Replot, AreaY, LineY, AreaX, LineX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function denseIntervalAreaY() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <AreaY data={aapl} x="Date" reduce="count" interval="month" />
    </Replot>
  );
}

export async function denseIntervalLineY() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <LineY data={aapl} x="Date" reduce="count" interval="month" />
    </Replot>
  );
}

export async function denseIntervalAreaX() {
  return (
    <Replot width={200}>
      <AreaX
        data={{length: 1000}}
        y={d3.randomNormal.source(d3.randomLcg(42))()}
        reduce="count"
        interval={0.5}
        curve="basis"
      />
    </Replot>
  );
}

export async function denseIntervalLineX() {
  return (
    <Replot width={200}>
      <LineX
        data={{length: 1000}}
        y={d3.randomNormal.source(d3.randomLcg(42))()}
        reduce="count"
        interval={0.5}
        curve="basis"
      />
    </Replot>
  );
}
