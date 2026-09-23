// @ts-nocheck — JSDOM React tests for the transform wrappers under StrictMode.
//
// The transform wrappers publish a wrap function and a stamp through React
// context, and the mark inside them applies that wrap inside its factory, once
// per computePlot run. StrictMode double-invokes every render and remounts
// every effect in the commit, so each wrapper's context value is built twice
// and each enclosed mark's factory can run twice within one commit. What that
// must not do is change the picture: a wrap applied twice, a stamp that comes
// out matching when the configuration changed, or an invalidation that is
// skipped because the second pass saw the first pass's value would all show up
// here and nowhere else.
//
// Every case is the equivalence test its own module already makes, compared
// against ITSELF rather than against the functional form: same element tree,
// rendered once plainly and once inside <StrictMode>. Two equal strings means
// StrictMode is invisible to the wrapper; that is the whole property.
//
// The comparison alone would pass vacuously if a wrapper swallowed its mark
// entirely — an empty <svg> equals an empty <svg> — so renderSvg refuses to
// return a plot that drew nothing (see markElements below).
import assert from "assert";
import React, {StrictMode, useLayoutEffect, useState, type ReactElement} from "react";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {
  Replot,
  Arrow,
  BarX,
  BarY,
  Cell,
  Dot,
  DotX,
  Hexagon,
  Line,
  LineX,
  LineY,
  Rect,
  RectX,
  RectY,
  Text
} from "../src/react/index.js";
import {Bin, BinX, BinY} from "../src/react/transforms/Bin.js";
import {Centroid} from "../src/react/transforms/Centroid.js";
import {DodgeY} from "../src/react/transforms/Dodge.js";
import {Group, GroupX, GroupZ} from "../src/react/transforms/Group.js";
import {Hexbin} from "../src/react/transforms/Hexbin.js";
import {MapX} from "../src/react/transforms/Map.js";
import {NormalizeX} from "../src/react/transforms/Normalize.js";
import {SelectMaxY} from "../src/react/transforms/Select.js";
import {ShiftX} from "../src/react/transforms/Shift.js";
import {StackY} from "../src/react/transforms/Stack.js";
import {WindowX, WindowY} from "../src/react/transforms/Window.js";

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
const points = weights.map((weight, i) => ({weight, height: 150 + ((i * 7) % 40)}));

const penguins = [
  {species: "Adelie", island: "Torgersen", sex: "male"},
  {species: "Adelie", island: "Biscoe", sex: "female"},
  {species: "Chinstrap", island: "Dream", sex: "male"},
  {species: "Gentoo", island: "Biscoe", sex: "female"},
  {species: "Gentoo", island: "Biscoe", sex: "male"}
];

const series = Array.from({length: 30}, (_, i) => ({step: i, value: Math.sin(i / 3) * 10 + (i % 5) - 2}));

const unemployment = [
  {date: new Date("2020-01-01"), unemployment: 4.2, division: "east"},
  {date: new Date("2020-02-01"), unemployment: 4.6, division: "east"},
  {date: new Date("2020-03-01"), unemployment: 5.1, division: "east"},
  {date: new Date("2020-01-01"), unemployment: 3.1, division: "west"},
  {date: new Date("2020-02-01"), unemployment: 2.9, division: "west"},
  {date: new Date("2020-03-01"), unemployment: 3.4, division: "west"}
];

const randoms = [0.31, 0.84, 0.12, 0.66, 0.98, 0.45, 0.27, 0.73, 0.55, 0.09];

const aapl = [
  {Date: new Date("2020-01-01"), Close: 300},
  {Date: new Date("2020-04-01"), Close: 260},
  {Date: new Date("2020-07-01"), Close: 360},
  {Date: new Date("2020-10-01"), Close: 420}
];

const readings = [
  {step: 1, value: 30, series: "a"},
  {step: 2, value: 10, series: "a"},
  {step: 3, value: 45, series: "a"},
  {step: 1, value: 25, series: "b"},
  {step: 2, value: 50, series: "b"},
  {step: 3, value: 15, series: "b"}
];

const countries = [square("a", 0, 0), square("b", 20, 20)];

function square(id, x, y) {
  return {
    type: "Feature",
    id,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, y],
          [x + 10, y],
          [x + 10, y + 10],
          [x, y + 10],
          [x, y]
        ]
      ]
    }
  };
}

// Element marks drawn under a mark's own aria-labelled group. Every axis group
// carries an aria-label naming it as one ("x-axis tick", "y-axis tick label",
// …), and the axes always draw paths and text, so they are excluded here: a
// count that the axes could satisfy on their own would never catch a wrapper
// that swallowed its mark. A plot with no marks at all counts zero.
function markElements(svg) {
  return Array.from(svg.querySelectorAll("g[aria-label]"))
    .filter((g) => !/axis/.test(g.getAttribute("aria-label")))
    .reduce((n, g) => n + g.querySelectorAll("path, rect, circle, polygon, polyline, line, text, image").length, 0);
}

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
  const drawn = markElements(svg);
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return {markup, drawn};
}

// Each plot instance gets a unique generated class name; normalize it so the
// two renderings compare as equal strings.
function normalize(markup) {
  return markup.replace(/plot-[0-9a-f]+/g, "plot-x");
}

/**
 * Renders `element` once plainly and once inside <StrictMode>, and returns the
 * two normalized markups. Fails outright if either plot drew no mark element,
 * so the caller's equality assertion can only mean "the same picture", never
 * "the same nothing".
 */
async function withAndWithoutStrictMode(element: ReactElement): Promise<[string, string]> {
  const plain = await renderSvg(element);
  const strict = await renderSvg(<StrictMode>{element}</StrictMode>);
  assert.ok(strict.drawn > 0, "the StrictMode plot drew no mark, so its equality assertion would be vacuous");
  assert.ok(plain.drawn > 0, "the plain plot drew no mark, so its equality assertion would be vacuous");
  return [normalize(strict.markup), normalize(plain.markup)];
}

// One representative pairing per transform module, each taken from the module's
// own equivalence test so the channels and options are known-good for it.
const cases: Array<{name: string; element: ReactElement}> = [
  {
    name: "StackY around BarY",
    element: (
      <Replot width={400} height={300}>
        <StackY>
          <BarY data={sales} x="date" y="units" fill="fruit" />
        </StackY>
      </Replot>
    )
  },
  {
    name: "BinX around RectY",
    element: (
      <Replot width={400} height={300}>
        <BinX y="count" thresholds={10}>
          <RectY data={weights} x={(d) => d} />
        </BinX>
      </Replot>
    )
  },
  {
    name: "BinY around RectX",
    element: (
      <Replot width={400} height={300}>
        <BinY x="count" filter={null} thresholds={5}>
          <RectX data={weights} y={(d) => d} />
        </BinY>
      </Replot>
    )
  },
  {
    name: "Bin around Rect",
    element: (
      <Replot width={400} height={300}>
        <Bin fill="count">
          <Rect data={points} x="weight" y="height" />
        </Bin>
      </Replot>
    )
  },
  {
    name: "GroupX around BarY with a z channel",
    element: (
      <Replot width={400} height={300}>
        <GroupX y="count" z="sex">
          <BarY data={penguins} x="species" />
        </GroupX>
      </Replot>
    )
  },
  {
    name: "GroupZ around BarX",
    element: (
      <Replot width={400} height={300}>
        <GroupZ x="proportion">
          <BarX data={penguins} fill="species" />
        </GroupZ>
      </Replot>
    )
  },
  {
    name: "Group around Cell",
    element: (
      <Replot width={400} height={300}>
        <Group fill="count">
          <Cell data={penguins} x="island" y="species" />
        </Group>
      </Replot>
    )
  },
  {
    name: "WindowY around LineY",
    element: (
      <Replot width={400} height={300}>
        <WindowY k={7} reduce="mean">
          <LineY data={series} x="step" y="value" />
        </WindowY>
      </Replot>
    )
  },
  {
    name: "WindowX around LineX",
    element: (
      <Replot width={400} height={300}>
        <WindowX k={5} reduce="max" anchor="start" strict>
          <LineX data={series} x="value" y="step" />
        </WindowX>
      </Replot>
    )
  },
  {
    name: "NormalizeX around Line",
    element: (
      <Replot width={400} height={300}>
        <NormalizeX basis="mean">
          <Line data={unemployment} y="date" x="unemployment" z="division" />
        </NormalizeX>
      </Replot>
    )
  },
  {
    name: "MapX around DotX",
    element: (
      <Replot width={400} height={300}>
        <MapX map="quantile">
          <DotX data={randoms} x={randoms} />
        </MapX>
      </Replot>
    )
  },
  {
    name: "ShiftX around Arrow",
    element: (
      <Replot width={400} height={300}>
        <ShiftX interval="quarter">
          <Arrow data={aapl} x="Date" y="Close" bend />
        </ShiftX>
      </Replot>
    )
  },
  {
    name: "SelectMaxY around Text",
    element: (
      <Replot width={400} height={300}>
        <SelectMaxY>
          <Text data={readings} x="step" y="value" z="series" text="series" />
        </SelectMaxY>
      </Replot>
    )
  },
  {
    name: "DodgeY around Dot",
    element: (
      <Replot width={400} height={300}>
        <DodgeY anchor="bottom" padding={2} r={3}>
          <Dot data={sexed} x="weight" stroke="red" />
        </DodgeY>
      </Replot>
    )
  },
  {
    name: "Hexbin around Hexagon",
    element: (
      <Replot width={400} height={300}>
        <Hexbin r="count" fill="mean" binWidth={30}>
          <Hexagon data={points} x="weight" y="height" fill="height" />
        </Hexbin>
      </Replot>
    )
  },
  {
    name: "Centroid around Text",
    element: (
      <Replot projection="equirectangular" width={400} height={300}>
        <Centroid>
          <Text data={countries} text="id" fill="blue" />
        </Centroid>
      </Replot>
    )
  },
  {
    // Nested wrappers: the inner transform must still apply first, and the
    // outer wrap must compose with it, when every render happens twice.
    name: "BinX around StackY around RectY",
    element: (
      <Replot width={400} height={300}>
        <BinX y="count">
          <StackY>
            <RectY data={sexed} x="weight" fill="sex" />
          </StackY>
        </BinX>
      </Replot>
    )
  }
];

describe("transform wrappers under StrictMode", () => {
  jsdomit("really is running under StrictMode double mounting", async () => {
    // The premise of the whole file, asserted rather than assumed. React only
    // tears an effect down and mounts it again in a development build, so with
    // a production React every equality below would compare two renderings
    // that were never double-rendered at all. This checks the mechanism the
    // rest of the file leans on, not the wrappers.
    let setups = 0;
    let teardowns = 0;
    function Probe() {
      useLayoutEffect(() => {
        setups++;
        return () => {
          teardowns++;
        };
      }, []);
      return null;
    }
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(
        <StrictMode>
          <Probe />
          <Replot width={400} height={300}>
            <StackY>
              <BarY data={sales} x="date" y="units" fill="fruit" />
            </StackY>
          </Replot>
        </StrictMode>
      );
    });
    await act(async () => {});
    assert.strictEqual(setups, 2, "StrictMode mounted the layout effect twice in one commit");
    assert.strictEqual(teardowns, 1, "…having torn it down between the two");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  for (const {name, element} of cases) {
    jsdomit(`${name} draws the same picture as it does without StrictMode`, async () => {
      const [strict, plain] = await withAndWithoutStrictMode(element);
      assert.strictEqual(strict, plain);
    });
  }

  jsdomit("a wrapper prop change still invalidates the plot", async () => {
    // The stamp is what tells the mark its options changed. StrictMode renders
    // the wrapper twice per update, so a stamp computed from anything but the
    // current props (a cached one, or one the second render left behind) would
    // suppress this recompute and pin the old thresholds.
    let setThresholds: any;
    function Harness() {
      const [thresholds, set] = useState(5);
      setThresholds = set;
      return (
        <StrictMode>
          <Replot width={400} height={300}>
            <BinX y="count" thresholds={thresholds}>
              <RectY data={weights} x={(d) => d} />
            </BinX>
          </Replot>
        </StrictMode>
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
    const svg = container.querySelector("svg");
    assert.ok(markElements(svg) > 0, "expected the bins to be drawn");
    const before = svg.outerHTML;

    await act(async () => setThresholds(20));
    await act(async () => {});
    const after = container.querySelector("svg").outerHTML;
    assert.notStrictEqual(after, before, "expected the SVG to change when thresholds changes");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
