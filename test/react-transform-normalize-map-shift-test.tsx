// @ts-nocheck — JSDOM React tests for the normalize, map, and shift wrappers.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {
  Replot,
  Line,
  LineY,
  DotX,
  Arrow,
  normalizeX,
  normalizeY,
  mapX,
  mapY,
  shiftX,
  shiftY
} from "../src/react/api.js";
import {NormalizeX, NormalizeY} from "../src/react/transforms/Normalize.js";
import {MapX, MapY} from "../src/react/transforms/Map.js";
import {ShiftX, ShiftY} from "../src/react/transforms/Shift.js";

// Mirrors the metro-unemployment-normalize plot's channel shape (x, y, z) on a
// small inline series.
const unemployment = [
  {date: new Date("2020-01-01"), unemployment: 4.2, division: "east"},
  {date: new Date("2020-02-01"), unemployment: 4.6, division: "east"},
  {date: new Date("2020-03-01"), unemployment: 5.1, division: "east"},
  {date: new Date("2020-01-01"), unemployment: 3.1, division: "west"},
  {date: new Date("2020-02-01"), unemployment: 2.9, division: "west"},
  {date: new Date("2020-03-01"), unemployment: 3.4, division: "west"}
];

const randoms = [0.31, 0.84, 0.12, 0.66, 0.98, 0.45, 0.27, 0.73, 0.55, 0.09];

// Mirrors the shift plot's channel shape (Date, Close) on a small inline series.
const aapl = [
  {Date: new Date("2020-01-01"), Close: 300},
  {Date: new Date("2020-04-01"), Close: 260},
  {Date: new Date("2020-07-01"), Close: 360},
  {Date: new Date("2020-10-01"), Close: 420}
];

async function renderSvg(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  await act(async () => {});
  const svg = container.querySelector("svg");
  assert.ok(svg, "expected an <svg>");
  const markup = svg.outerHTML;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return markup;
}

// Each plot instance gets a unique generated class name; normalize it so the
// nested and spread renderings compare as equal strings.
function normalize(markup) {
  return markup.replace(/plot-[0-9a-f]+/g, "plot-x");
}

describe("normalize, map, and shift wrapper equivalence", () => {
  jsdomit("<NormalizeX> around <Line> matches the spread normalizeX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <NormalizeX basis="mean">
          <Line data={unemployment} y="date" x="unemployment" z="division" />
        </NormalizeX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Line data={unemployment} {...normalizeX("mean", {y: "date", x: "unemployment", z: "division"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<NormalizeY> around <Line> matches the spread normalizeY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <NormalizeY>
          <Line data={unemployment} x="date" y="unemployment" z="division" />
        </NormalizeY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Line data={unemployment} {...normalizeY({x: "date", y: "unemployment", z: "division"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<MapX> around <DotX> matches the spread mapX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <MapX map="quantile">
          <DotX data={randoms} x={randoms} />
        </MapX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <DotX data={randoms} {...mapX("quantile", {x: randoms})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<MapY> around <LineY> matches the spread mapY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <MapY map="cumsum">
          <LineY data={randoms} y={randoms} />
        </MapY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <LineY data={randoms} {...mapY("cumsum", {y: randoms})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<ShiftX> around <Arrow> matches the spread shiftX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <ShiftX interval="quarter">
          <Arrow data={aapl} x="Date" y="Close" bend />
        </ShiftX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Arrow data={aapl} {...shiftX("quarter", {x: "Date", y: "Close", bend: true})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<ShiftY> around <Arrow> matches the spread shiftY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <ShiftY interval="quarter">
          <Arrow data={aapl} y="Date" x="Close" bend />
        </ShiftY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Arrow data={aapl} {...shiftY("quarter", {y: "Date", x: "Close", bend: true})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});
