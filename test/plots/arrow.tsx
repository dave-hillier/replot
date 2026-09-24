import {
  Replot,
  BarY,
  BarX,
  RectY,
  TreeMark,
  DifferenceY,
  normalizeY,
  groupX,
  binX,
  find,
  stackY,
  AreaY,
  RuleY,
  Dot
} from "../../src/react/api.js";
import * as d3 from "d3";
import * as Arrow from "apache-arrow";
import {PointerViewof} from "./viewof.js";

/**
 * An arrow table dataset supports direct (getChild) accessors.
 */
export async function arrowTest() {
  const data = Arrow.tableFromArrays({
    id: [1, 2, 3],
    name: ["Alice", "Bob", "Charlie"],
    age: [35, 25, 45]
  });
  return (
    <Replot>
      <BarY data={data} x="name" y="age" />
    </Replot>
  );
}

/**
 * An arrow table dataset supports function accessors.
 */
export async function arrowTestAccessor() {
  const data = Arrow.tableFromArrays({
    id: [1, 2, 3],
    name: ["Alice", "Bob", "Charlie"],
    age: [35, 25, 45]
  });

  return (
    <Replot>
      <BarY data={data} x="name" y="age" fill={(d) => d.name} />
    </Replot>
  );
}

/**
 * An arrow table dataset supports binning.
 */
export async function arrowTestBin() {
  const seed = d3.randomLcg(42);
  const vector = Uint8Array.from({length: 1e5}, d3.randomExponential.source(seed)(1));
  const category = Array.from({length: 1e5}, d3.randomInt.source(seed)(4)).map((i) => `a${i}`);
  const data = Arrow.tableFromArrays({category, vector});
  return (
    <Replot marginLeft={60}>
      <RectY data={data} {...binX({y: "count"}, {x: "vector", fill: "category", thresholds: 10})} />
    </Replot>
  );
}

/**
 * An arrow table dataset supports grouping.
 */
export async function arrowTestGroup() {
  const seed = d3.randomLcg(42);
  const vector = Uint8Array.from({length: 1e5}, d3.randomExponential.source(seed)(1));
  const category = Array.from({length: 1e5}, d3.randomInt.source(seed)(4)).map((i) => `a${i}`);
  const data = Arrow.tableFromArrays({category, vector});
  return (
    <Replot marginLeft={60}>
      <BarY data={data} {...groupX({y: "count"}, {x: "vector", fill: "category"})} />
    </Replot>
  );
}

/**
 * An arrow table dataset supports sorting with a comparator.
 */
export async function arrowTestSort() {
  const data = Arrow.tableFromArrays({
    id: [1, 2, 3],
    name: ["Alice", "Bob", "Charlie"],
    age: [35, 25, 45]
  });
  return (
    <Replot>
      <BarX data={data} x="age" fill="name" sort={(a: {age: number}, b: {age: number}) => b.age - a.age} />
    </Replot>
  );
}

/**
 * An arrow table dataset supports accessing the node's datum.
 */
export async function arrowTestTree() {
  const gods = Arrow.tableFromArrays({
    branch: `Chaos Gaia Mountains
Chaos Gaia Pontus
Chaos Gaia Uranus
Chaos Eros
Chaos Erebus
Chaos Tartarus`
      .split("\n")
      .map((d) => d.replace(/\s+/g, "/"))
  });
  return (
    <Replot axis={null} insetLeft={35} insetTop={20} insetBottom={20} insetRight={120}>
      <TreeMark data={gods} path="branch" fill={(d) => d?.branch} />
    </Replot>
  );
}

/**
 * An arrow table dataset supports Plot.find.
 */
export async function arrowTestDifferenceY() {
  const stocks = Arrow.tableFromJSON(await readStocks());
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

/**
 * An arrow table dataset supports stack custom order.
 */
export async function arrowTestCustomOrder() {
  const riaa = Arrow.tableFromJSON(await d3.csv<any>("data/riaa-us-revenue.csv", d3.autoType));
  return (
    <Replot
      y={{
        grid: true,
        label: "Annual revenue (billions, adj.)",
        transform: (d) => d / 1000
      }}
    >
      <AreaY
        data={riaa}
        {...stackY({
          x: "year",
          y: "revenue",
          z: "format",
          order: (a, b) => d3.ascending(a.group, b.group) || d3.descending(a.revenue, b.revenue),
          fill: "group",
          stroke: "white",
          title: (d) => `${d.format}\n${d.group}`
        })}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}

/**
 * An arrow table dataset works with the pointer.
 */
export async function arrowTestPointer() {
  const penguins = Arrow.tableFromJSON(await d3.csv<any>("data/penguins.csv", d3.autoType));
  return (
    <PointerViewof>
      <Dot data={penguins} x="culmen_length_mm" y="culmen_depth_mm" tip={true} />
    </PointerViewof>
  );
}
