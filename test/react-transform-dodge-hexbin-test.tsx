// @ts-nocheck — JSDOM React tests for the dodge and hexbin wrapper components.
import assert from "assert";
import React from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import * as d3 from "d3";
import jsdomit from "./jsdom.js";
import {Replot, Dot, Hexagon, dodgeX, dodgeY, hexbin} from "../src/react/api.js";
import {DodgeX, DodgeY} from "../src/react/transforms/Dodge.js";
import {Hexbin} from "../src/react/transforms/Hexbin.js";
import {StackY} from "../src/react/transforms/Stack.js";

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

describe("dodge and hexbin wrapper equivalence", () => {
  jsdomit("<DodgeY> around <Dot> matches the spread dodgeY form", async () => {
    const penguins = await d3.csv("data/penguins.csv", d3.autoType);
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <DodgeY anchor="bottom" padding={2} r={3}>
          <Dot data={penguins} x="body_mass_g" stroke="red" />
        </DodgeY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Dot data={penguins} {...dodgeY({anchor: "bottom", padding: 2, r: 3}, {x: "body_mass_g", stroke: "red"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<DodgeX> around <Dot> matches the spread dodgeX form", async () => {
    const penguins = await d3.csv("data/penguins.csv", d3.autoType);
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <DodgeX anchor="middle">
          <Dot data={penguins} y="body_mass_g" fill="currentColor" />
        </DodgeX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Dot data={penguins} {...dodgeX({anchor: "middle"}, {y: "body_mass_g", fill: "currentColor"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<Hexbin> around <Hexagon> matches the spread hexbin form", async () => {
    const cars = await d3.csv("data/cars.csv", d3.autoType);
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <Hexbin r="count" fill="mean" binWidth={30}>
          <Hexagon data={cars} x="displacement (cc)" y="economy (mpg)" fill="weight (lb)" />
        </Hexbin>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Hexagon
          data={cars}
          {...hexbin(
            {r: "count", fill: "mean"},
            {x: "displacement (cc)", y: "economy (mpg)", fill: "weight (lb)", binWidth: 30}
          )}
        />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<Hexbin> without output props defaults to fill count", async () => {
    const cars = await d3.csv("data/cars.csv", d3.autoType);
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <Hexbin>
          <Hexagon data={cars} x="displacement (cc)" y="economy (mpg)" />
        </Hexbin>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Hexagon data={cars} {...hexbin(undefined, {x: "displacement (cc)", y: "economy (mpg)"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});

describe("dodge and hexbin wrapper nesting order", () => {
  jsdomit("a transform wrapper around an initializer wrapper throws", async () => {
    // <StackY> outside <DodgeX> means stackY(dodgeX(o)) — a transform applied
    // after an initializer, which the basic transform machinery rejects.
    const penguins = await d3.csv("data/penguins.csv", d3.autoType);
    await assert.rejects(
      renderSvg(
        <Replot width={400} height={300}>
          <StackY>
            <DodgeX>
              <Dot data={penguins} y="body_mass_g" />
            </DodgeX>
          </StackY>
        </Replot>
      ),
      /transforms cannot be applied after initializers/
    );
  });
});
