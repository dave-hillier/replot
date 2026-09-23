import * as Plot from "replot";
import assert from "assert";
import React, {act, useState} from "react";
import ReactDOM from "react-dom/client";
import it from "../jsdom.js";
import {Replot, DifferenceY} from "../../src/react/api.js";

const data = [
  {x: 0, y1: 1, y2: 2},
  {x: 1, y1: 2, y2: 1},
  {x: 2, y1: 3, y2: 1}
];

// Upstream composes the render option onto the two areas — and only onto the
// areas (difference.js:38,60,77): composeRender(render, clipDifference(k, …))
// puts the user's transform outside the clip, and the line gets no render at
// all. Replot left render in the options spread, so it reached both areas (as
// an unused option, since their own clip renderJSX suppressed the imperative
// bridge) and the line (where it ran).
it("differenceY(data, {render}) applies the render transform to the areas but not the line", () => {
  const seen = [];
  const svg = Plot.plot({
    marks: [
      Plot.differenceY(data, {
        x: "x",
        y1: "y1",
        y2: "y2",
        render: function (index, scales, channels, dimensions, context, next) {
          seen.push(this.ariaLabel);
          const g = next(index, scales, channels, dimensions, context);
          g.setAttribute("data-rendered", "");
          return g;
        }
      })
    ]
  });
  assert.deepStrictEqual(seen, ["positive difference", "negative difference"]);
  const areas = svg.querySelectorAll('[aria-label$="difference"]');
  assert.strictEqual(areas.length, 2);
  for (const area of areas) assert.ok(area.hasAttribute("data-rendered"), "the transform's output is rendered");
});

// Each facet renders the areas with its own index, so each facet's clips need
// their own ids; the ids are cached per facet, which is what keeps them from
// being shared across facets (all of the defs end up in one document).
it("differenceY allocates a distinct clip id per facet", () => {
  const faceted = [
    {a: "a", x: 0, y1: 1, y2: 2},
    {a: "a", x: 1, y1: 2, y2: 1},
    {a: "b", x: 0, y1: 3, y2: 1},
    {a: "b", x: 1, y1: 1, y2: 2}
  ];
  const svg = Plot.plot({marks: [Plot.differenceY(faceted, {fx: "a", x: "x", y1: "y1", y2: "y2"})]});
  const scope = '[aria-label$="difference"]';
  const ids = Array.from(svg.querySelectorAll(`${scope} clipPath`)).map((c) => c.getAttribute("id"));
  const refs = Array.from(svg.querySelectorAll(`${scope} [clip-path]`)).map((c) => c.getAttribute("clip-path"));
  assert.strictEqual(ids.length, 4);
  assert.strictEqual(new Set(ids).size, 4);
  assert.deepStrictEqual([...refs].sort(), ids.map((id) => `url(#${id})`).sort());
});

// The clips are allocated inside the render transform's `next`, so the ids must
// hold still on both sides of the composition. It has to be ONE function, not a
// fresh closure per render: a function prop is stamped by identity, so an inline
// render would restamp the mark on any re-render of the harness — correctly, and
// invisibly to this test's assertions about ids.
const differenceRender = (index, scales, channels, dimensions, context, next) =>
  next(index, scales, channels, dimensions, context);

// The clip ids are allocated during renderJSX, so a re-render that reuses the
// computed state (an unrelated state change above <Plot>, which does not
// restamp the mark) must not allocate new ones: the clip-path refs would
// otherwise be rewritten on every render. A fresh plot still allocates fresh
// ids, as upstream does.
it("differenceY keeps its clip-path ids across React re-renders", async () => {
  // The plot's own frame clip (for the line) is a separate def; only the
  // areas' difference clips are at issue here.
  const scope = '[aria-label$="difference"]';
  const ids = (container) =>
    Array.from(container.querySelectorAll(`${scope} clipPath`)).map((c) => c.getAttribute("id"));
  const refs = (container) =>
    Array.from(container.querySelectorAll(`${scope} [clip-path]`)).map((c) => c.getAttribute("clip-path"));
  let tick;
  function Harness() {
    const [n, set] = useState(0);
    tick = () => set(n + 1);
    return React.createElement(
      "div",
      null,
      React.createElement("span", null, String(n)),
      React.createElement(
        Replot,
        {width: 200, height: 200},
        React.createElement(DifferenceY, {
          data,
          x: "x",
          y1: "y1",
          y2: "y2",
          render: differenceRender
        })
      )
    );
  }
  const container = globalThis.document.createElement("div");
  globalThis.document.body.appendChild(container);
  let root;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(Harness));
  });
  await act(async () => {});
  await act(async () => {});
  // The clipPath defs render next to the paths they clip (upstream inserts
  // them into the same <g>), so there is one per area.
  const before = ids(container);
  assert.strictEqual(before.length, 2);
  assert.deepStrictEqual(
    refs(container),
    before.map((id) => `url(#${id})`)
  );
  await act(async () => tick());
  await act(async () => {});
  const after = ids(container);
  assert.deepStrictEqual(after, before);
  assert.deepStrictEqual(
    refs(container),
    before.map((id) => `url(#${id})`)
  );
  await act(async () => root.unmount());
  container.remove();
});
