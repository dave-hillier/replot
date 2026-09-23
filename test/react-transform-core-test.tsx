// @ts-nocheck — JSDOM React tests for transform wrapper components.
import assert from "assert";
import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {
  Replot,
  BarY,
  LineY,
  Rect,
  RectX,
  RectY,
  StackY,
  Bin,
  BinX,
  BinY,
  GroupX,
  stackY,
  bin,
  binX,
  binY,
  groupX,
  filter,
  filterTransform,
  map,
  mapTransform,
  window as windowFn,
  windowMap
} from "../src/react/api.js";

const sales = [
  {date: "Mon", fruit: "apples", units: 30},
  {date: "Mon", fruit: "oranges", units: 20},
  {date: "Tue", fruit: "apples", units: 10},
  {date: "Tue", fruit: "oranges", units: 40},
  {date: "Wed", fruit: "apples", units: 25},
  {date: "Wed", fruit: "oranges", units: 15}
];

const weights = [54, 57, 58, 61, 61, 62, 63, 65, 66, 66, 68, 70, 71, 73, 75, 78, 81, 84, 90, 96];

const sexed = weights.map((weight, i) => ({weight, sex: i % 2 ? "male" : "female"}));

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

describe("transform wrapper equivalence", () => {
  jsdomit("<StackY> around <BarY> matches the spread stackY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <StackY>
          <BarY data={sales} x="date" y="units" fill="fruit" />
        </StackY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={sales} {...stackY({x: "date", y: "units", fill: "fruit"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<BinX> around <RectY> matches the spread binX form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <BinX y="count" thresholds={10}>
          <RectY data={weights} x={(d) => d} />
        </BinX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <RectY data={weights} {...binX({y: "count", thresholds: 10}, {x: (d) => d})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<BinY> around <RectX> matches the spread binY form", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <BinY x="count" filter={null} thresholds={5}>
          <RectX data={weights} y={(d) => d} />
        </BinY>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <RectX data={weights} {...binY({x: "count", filter: null, thresholds: 5}, {y: (d) => d})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<Bin> around <Rect> matches the spread bin form", async () => {
    const points = weights.map((weight, i) => ({weight, height: 150 + ((i * 7) % 40)}));
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <Bin fill="count">
          <Rect data={points} x="weight" y="height" />
        </Bin>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <Rect data={points} {...bin({fill: "count"}, {x: "weight", y: "height"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("a bare <BinX> matches the no-argument binX() default outputs", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <BinX>
          <RectY data={weights} x={(d) => d} />
        </BinX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <RectY data={weights} {...binX(undefined, {x: (d) => d})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<BinX> with only bin config still applies the default outputs", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <BinX thresholds={5}>
          <RectY data={weights} x={(d) => d} />
        </BinX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <RectY data={weights} {...binX(undefined, {thresholds: 5, x: (d) => d})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("a bare <GroupX> matches the no-argument groupX() default outputs", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <GroupX>
          <BarY data={sexed} x="sex" />
        </GroupX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={sexed} {...groupX(undefined, {x: "sex"})} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });

  jsdomit("<BinX> around <StackY> composes with inner transform applied first", async () => {
    const nested = await renderSvg(
      <Replot width={400} height={300}>
        <BinX y="count">
          <StackY>
            <RectY data={sexed} x="weight" fill="sex" />
          </StackY>
        </BinX>
      </Replot>
    );
    const spread = await renderSvg(
      <Replot width={400} height={300}>
        <RectY data={sexed} {...binX({y: "count"}, stackY({x: "weight", fill: "sex"}))} />
      </Replot>
    );
    assert.strictEqual(normalize(nested), normalize(spread));
  });
});

describe("preferred transform aliases", () => {
  it("aliases the bare filter, map, and window exports", () => {
    assert.strictEqual(filterTransform, filter);
    assert.strictEqual(mapTransform, map);
    assert.strictEqual(windowMap, windowFn);
  });

  jsdomit("mapTransform with a windowMap method matches the bare map/window form", async () => {
    const aliased = await renderSvg(
      <Replot width={400} height={300}>
        <LineY
          data={sales}
          {...mapTransform(
            {stroke: windowMap({k: 2, reduce: "difference"})},
            {x: "date", y: "units", z: "fruit", stroke: "units"}
          )}
        />
      </Replot>
    );
    const bare = await renderSvg(
      <Replot width={400} height={300}>
        <LineY
          data={sales}
          {...map(
            {stroke: windowFn({k: 2, reduce: "difference"})},
            {x: "date", y: "units", z: "fruit", stroke: "units"}
          )}
        />
      </Replot>
    );
    assert.strictEqual(normalize(aliased), normalize(bare));
  });

  jsdomit("filterTransform matches the bare filter form", async () => {
    const aliased = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={sales} {...filterTransform((d) => d.units > 15, {x: "date", y: "units"})} />
      </Replot>
    );
    const bare = await renderSvg(
      <Replot width={400} height={300}>
        <BarY data={sales} {...filter((d) => d.units > 15, {x: "date", y: "units"})} />
      </Replot>
    );
    assert.strictEqual(normalize(aliased), normalize(bare));
  });
});

describe("transform wrapper invalidation", () => {
  jsdomit("updates the SVG when a wrapper prop changes", async () => {
    let setThresholds;
    function Harness() {
      const [thresholds, set] = useState(5);
      setThresholds = set;
      return (
        <Replot width={400} height={300}>
          <BinX y="count" thresholds={thresholds}>
            <RectY data={weights} x={(d) => d} />
          </BinX>
        </Replot>
      );
    }
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(<Harness />);
    });
    await act(async () => {});
    const before = container.querySelector("svg").outerHTML;
    await act(async () => setThresholds(20));
    await act(async () => {});
    const after = container.querySelector("svg").outerHTML;
    assert.notStrictEqual(after, before, "expected the SVG to change when thresholds changes");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("updates the SVG when an array-valued wrapper prop changes", async () => {
    let setThresholds;
    function Harness() {
      const [thresholds, set] = useState([50, 60, 70, 80, 90, 100]);
      setThresholds = set;
      return (
        <Replot width={400} height={300}>
          <BinX y="count" thresholds={thresholds}>
            <RectY data={weights} x={(d) => d} />
          </BinX>
        </Replot>
      );
    }
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(<Harness />);
    });
    await act(async () => {});
    const before = container.querySelector("svg").outerHTML;
    await act(async () => setThresholds([50, 75, 100]));
    await act(async () => {});
    const after = container.querySelector("svg").outerHTML;
    assert.notStrictEqual(after, before, "expected the SVG to change when a thresholds array changes");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
