import {Replot, BollingerY, Line, Frame, GridY, GridX, AxisY, AxisX, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function aaplBollinger() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot y={{grid: true}}>
      <BollingerY data={aapl} x="Date" y="Close" stroke="blue" />
      <Line data={aapl} x="Date" y="Close" strokeWidth={1} />
    </Replot>
  );
}

export async function aaplBollingerGridInterval() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <Frame fill="#eaeaea" />
      <GridY tickSpacing={35} stroke="#fff" strokeOpacity={1} strokeWidth={0.5} />
      <GridY tickSpacing={70} stroke="#fff" strokeOpacity={1} />
      <AxisY tickSpacing={70} />
      <GridX tickSpacing={40} stroke="#fff" strokeOpacity={1} strokeWidth={0.5} />
      <GridX tickSpacing={80} stroke="#fff" strokeOpacity={1} />
      <AxisX tickSpacing={80} />
      <BollingerY data={aapl} x="Date" y="Close" stroke="blue" />
      <Line data={aapl} x="Date" y="Close" strokeWidth={1} />
    </Replot>
  );
}

export async function aaplBollingerGridSpacing() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <Frame fill="#eaeaea" />
      <GridY interval={10} stroke="#fff" strokeOpacity={1} strokeWidth={0.5} />
      <GridY interval={20} stroke="#fff" strokeOpacity={1} />
      <AxisY interval={20} />
      <GridX interval="3 months" stroke="#fff" strokeOpacity={1} strokeWidth={0.5} />
      <GridX interval="1 year" stroke="#fff" strokeOpacity={1} />
      <AxisX interval="1 year" />
      <BollingerY data={aapl} x="Date" y="Close" stroke="blue" />
      <Line data={aapl} x="Date" y="Close" strokeWidth={1} />
    </Replot>
  );
}

export async function aaplBollingerCandlestick() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot
      x={{domain: [new Date("2014-01-01"), new Date("2014-06-01")]}}
      y={{domain: [68, 92], grid: true}}
      color={{domain: [-1, 0, 1], range: ["red", "black", "green"]}}
    >
      <BollingerY data={aapl} x="Date" y="Close" stroke="none" clip={true} />
      <RuleX data={aapl} x="Date" y1="Low" y2="High" strokeWidth={1} clip={true} />
      <RuleX
        data={aapl}
        x="Date"
        y1="Open"
        y2="Close"
        strokeWidth={3}
        stroke={(d) => Math.sign(d.Close - d.Open)}
        clip={true}
      />
    </Replot>
  );
}
