// @ts-nocheck — JSDOM React tests for the group transform wrapper components.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import * as d3 from "d3";
import jsdomit from "./jsdom.js";
import {Replot, BarX, BarY, Cell, Line, RuleY, group, groupX, groupY, groupZ} from "../src/react/api.js";
import {Group, GroupX, GroupY, GroupZ} from "../src/react/transforms/Group.js";

const penguins = [
  {species: "Adelie", island: "Torgersen", sex: "male"},
  {species: "Adelie", island: "Torgersen", sex: "female"},
  {species: "Adelie", island: "Biscoe", sex: "female"},
  {species: "Chinstrap", island: "Dream", sex: "male"},
  {species: "Chinstrap", island: "Dream", sex: "female"},
  {species: "Gentoo", island: "Biscoe", sex: "male"},
  {species: "Gentoo", island: "Biscoe", sex: "female"},
  {species: "Gentoo", island: "Biscoe", sex: "male"}
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

describe("group transform wrapper equivalence", () => {
  jsdomit("<GroupX> around <BarY> matches the spread groupX form", async () => {
    // Mirrors test/plots/moby-dick-letter-relative-frequency.tsx.
    const mobydick = await d3.text("data/moby-dick-chapter-1.txt");
    const letters = [...mobydick].filter((c) => /[a-z]/i.test(c)).map((c) => c.toUpperCase());
    const nested = await renderSvg(
      <Replot y={{grid: true, percent: true}}>
        <GroupX y="proportion">
          <BarY data={letters} />
        </GroupX>
        <RuleY data={[0]} />
      </Replot>
    );
    const spread = await renderSvg(
      <Replot y={{grid: true, percent: true}}>
        <BarY data={letters} {...groupX({y: "proportion"})} />
        <RuleY data={[0]} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<GroupX> around <Line> matches the spread groupX form", async () => {
    // Mirrors the grouped line in test/plots/cars-mpg.tsx.
    const cars = await d3.csv("data/cars.csv", d3.autoType);
    const nested = await renderSvg(
      <Replot x={{type: "point"}} y={{grid: true, zero: true}} color={{type: "ordinal"}}>
        <GroupX y="mean" sort="x">
          <Line data={cars} x="year" y="economy (mpg)" stroke="cylinders" curve="basis" />
        </GroupX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot x={{type: "point"}} y={{grid: true, zero: true}} color={{type: "ordinal"}}>
        <Line
          data={cars}
          {...groupX({y: "mean", sort: "x"}, {x: "year", y: "economy (mpg)", stroke: "cylinders", curve: "basis"})}
        />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<GroupX> with a z channel matches the spread groupX form", async () => {
    // z is an input channel routed into the mark options, not an output
    // reducer; it subdivides each x group by sex.
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <GroupX y="count" z="sex">
          <BarY data={penguins} x="species" />
        </GroupX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={penguins} {...groupX({y: "count"}, {x: "species", z: "sex"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<GroupY> around <BarX> matches the spread groupY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <GroupY x="count">
          <BarX data={penguins} y="species" fill="sex" />
        </GroupY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarX data={penguins} {...groupY({x: "count"}, {y: "species", fill: "sex"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<GroupZ> around <BarX> matches the spread groupZ form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <GroupZ x="proportion">
          <BarX data={penguins} fill="species" />
        </GroupZ>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarX data={penguins} {...groupZ({x: "proportion"}, {fill: "species"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<Group> around <Cell> matches the spread group form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <Group fill="count">
          <Cell data={penguins} x="island" y="species" />
        </Group>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Cell data={penguins} {...group({fill: "count"}, {x: "island", y: "species"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});
