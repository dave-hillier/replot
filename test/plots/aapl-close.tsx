import {Replot, AreaY, LineY, RuleY, AxisY, normalizeY, valueof} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplCloseVaryingColor() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: true}}>
      <AreaY data={aapl} x="Date" y="Close" fill="Close" fillOpacity={0.2} />
      <LineY data={aapl} x="Date" y="Close" stroke="Close" />
      <RuleY data={[0]} />
    </Replot>
  );
}

export async function aaplClose() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: true}}>
      <AreaY data={aapl} x="Date" y="Close" line />
      <RuleY data={[0]} />
    </Replot>
  );
}

export async function aaplCloseClip() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot clip={true} x={{domain: [new Date(Date.UTC(2015, 0, 1)), new Date(Date.UTC(2015, 3, 1))]}} y={{grid: true}}>
      <AreaY data={aapl} x="Date" y="Close" fillOpacity={0.1} />
      <LineY data={aapl} x="Date" y="Close" />
      <RuleY data={[0]} clip={false} />
    </Replot>
  );
}

export async function aaplCloseDataTicks() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <AxisY data={d3.ticks(0, 200, 10)} anchor="left" />
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseImplicitGrid() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: true}}>
      <AxisY anchor="left" />
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseGridColor() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: "red"}}>
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseGridInterval() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{grid: "3 months"}}>
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseGridIntervalName() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{grid: "month"}}>
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseGridIterable() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: [100, 120, 140]}}>
      <LineY data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function aaplCloseNormalize() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const x = new Date("2014-01-01");
  const X = valueof(aapl, "Date");
  return (
    <Replot y={{type: "log", grid: true, tickFormat: ".1f"}}>
      <RuleY data={[1]} />
      <LineY data={aapl} {...normalizeY((I, Y) => Y[I.find((i) => X[i] >= x)], {x: X, y: "Close"})} />
    </Replot>
  );
}
