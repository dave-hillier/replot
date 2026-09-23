import {
  Replot,
  DifferenceY,
  DifferenceX,
  normalizeY,
  groupX,
  find,
  windowY,
  shiftX,
  mapX
} from "../../src/react/api.js";
import * as d3 from "d3";

async function readStocks(start = 0, end = Infinity) {
  return (
    await Promise.all(
      ["AAPL", "GOOG"].map((symbol) =>
        d3.csv<any>(`data/${symbol.toLowerCase()}.csv`, (d, i) =>
          start <= i && i < end ? ((d.Symbol = symbol), d3.autoType(d)) : null
        )
      )
    )
  ).flat();
}

// Here we compare the normalized performance of Apple and Google stock; green
// represents Apple outperforming, while blue represents Google outperforming.
export async function differenceY() {
  const stocks = await readStocks();
  return (
    <Replot>
      <DifferenceY
        data={stocks}
        {...normalizeY(
          groupX(
            {y1: find((d) => d.Symbol === "GOOG"), y2: find((d) => d.Symbol === "AAPL")},
            {x: "Date", y: "Close", tip: true}
          )
        )}
      />
    </Replot>
  );
}

export async function differenceYRandom() {
  const random = d3.randomLcg(42);
  let sum = 3;
  const cumsum = () => (sum += random() - 0.5);
  return (
    <Replot>
      <DifferenceY data={{length: 60}} y1={cumsum} y2={cumsum} curve="natural" tip={true} />
    </Replot>
  );
}

export async function differenceYCurve() {
  const stocks = await readStocks(60, 100);
  return (
    <Replot>
      <DifferenceY
        data={stocks}
        {...normalizeY(
          groupX(
            {y1: find((d) => d.Symbol === "GOOG"), y2: find((d) => d.Symbol === "AAPL")},
            {x: "Date", y: "Close", curve: "cardinal", tension: 0.1}
          )
        )}
      />
    </Replot>
  );
}

export async function differenceYVariable() {
  const stocks = await readStocks();
  return (
    <Replot>
      <DifferenceY
        data={stocks}
        {...normalizeY(
          groupX(
            {y1: find((d) => d.Symbol === "GOOG"), y2: find((d) => d.Symbol === "AAPL")},
            {x: "Date", y: "Close", negativeFill: "#eee", positiveFill: ([d]) => d.Date.getUTCFullYear()}
          )
        )}
      />
    </Replot>
  );
}

export async function differenceYClip() {
  const gistemp = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  return (
    <Replot x={{insetLeft: -50}}>
      <DifferenceY data={gistemp} {...windowY(28, {x: "Date", y: "Anomaly", clip: "frame"})} />
    </Replot>
  );
}

export async function differenceYClipVariable() {
  const stocks = await readStocks();
  return (
    <Replot>
      <DifferenceY
        data={stocks}
        {...normalizeY(
          groupX(
            {y1: find((d) => d.Symbol === "GOOG"), y2: find((d) => d.Symbol === "AAPL")},
            {x: "Date", y: "Close", negativeFill: "#eee", positiveFill: ([d]) => d.Date.getUTCFullYear(), clip: true}
          )
        )}
      />
    </Replot>
  );
}

export async function differenceYConstant() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <DifferenceY data={aapl} x="Date" y1={115} y2="Close" />
    </Replot>
  );
}

export async function differenceYOrdinal() {
  const random = d3.randomLcg(42);
  return (
    <Replot>
      <DifferenceY data={{length: 30}} y1={() => "ABCDE"[(random() * 5) | 0]} y2={() => "ABCDE"[(random() * 5) | 0]} />
    </Replot>
  );
}

export async function differenceYOrdinalFlip() {
  const random = d3.randomLcg(42);
  return (
    <Replot y={{reverse: true}}>
      <DifferenceY data={{length: 30}} y1={() => "ABCDE"[(random() * 5) | 0]} y2={() => "ABCDE"[(random() * 5) | 0]} />
    </Replot>
  );
}

export async function differenceYReverse() {
  const gistemp = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  return (
    <Replot y={{reverse: true}}>
      <DifferenceY data={gistemp} {...windowY(28, {x: "Date", y: "Anomaly"})} />
    </Replot>
  );
}

export async function differenceYZero() {
  const gistemp = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  return (
    <Replot>
      <DifferenceY data={gistemp} {...windowY(28, {x: "Date", y: "Anomaly"})} />
    </Replot>
  );
}

export async function differenceYNegative() {
  const gistemp = await d3.csv<any>("data/gistemp.csv", d3.autoType);
  return (
    <Replot>
      <DifferenceY data={gistemp} {...windowY(28, {x: "Date", positiveFill: "none", y: "Anomaly"})} />
    </Replot>
  );
}

export async function differenceY1() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <DifferenceY
        data={aapl}
        {...shiftX("year", {
          x: "Date",
          y: "Close",
          positiveFillOpacity: 0.2,
          positiveFill: "currentColor",
          negativeFillOpacity: 0.8,
          negativeFill: "red"
        })}
      />
    </Replot>
  );
}

export async function differenceFilterX() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const goog = await d3.csv<any>("data/goog.csv", d3.autoType);
  const x = aapl.map((d, i) => (200 <= i && i < 400 ? NaN : d.Date));
  const y1 = goog.map((d, i, data) => d.Close / data[0].Close);
  const y2 = aapl.map((d, i, data) => d.Close / data[0].Close);
  return (
    <Replot>
      <DifferenceY data={aapl} x={x} y1={y1} y2={y2} />
    </Replot>
  );
}

export async function differenceFilterY1() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const goog = await d3.csv<any>("data/goog.csv", d3.autoType);
  const x = aapl.map((d) => d.Date);
  const y1 = goog.map((d, i, data) => d.Close / data[0].Close);
  const y2 = aapl.map((d, i, data) => (200 <= i && i < 400 ? NaN : d.Close / data[0].Close));
  return (
    <Replot>
      <DifferenceY data={aapl} x={x} y1={y1} y2={y2} />
    </Replot>
  );
}

export async function differenceFilterY2() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const goog = await d3.csv<any>("data/goog.csv", d3.autoType);
  const x = aapl.map((d) => d.Date);
  const y1 = goog.map((d, i, data) => (200 <= i && i < 400 ? NaN : d.Close / data[0].Close));
  const y2 = aapl.map((d, i, data) => d.Close / data[0].Close);
  return (
    <Replot>
      <DifferenceY data={aapl} x={x} y1={y1} y2={y2} />
    </Replot>
  );
}

export async function differenceX() {
  const random = d3.randomNormal.source(d3.randomLcg(22))();
  return (
    <Replot height={600} y={{reverse: true}}>
      <DifferenceX data={{length: 100}} {...mapX("cumsum", {x1: random, x2: random, curve: "basis"})} />
    </Replot>
  );
}
