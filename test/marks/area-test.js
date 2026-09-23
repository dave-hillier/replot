import * as Plot from "replot";
import {curveLinear, curveStep} from "d3";
import assert from "assert";
import it from "../jsdom.js";

it("area(data, options) has the expected defaults", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1"});
  assert.strictEqual(area.data, undefined);
  // assert.strictEqual(area.transform, undefined);
  assert.deepStrictEqual(Object.keys(area.channels), ["x1", "y1"]);
  assert.deepStrictEqual(
    Object.values(area.channels).map((c) => c.value),
    ["0", "1"]
  );
  assert.deepStrictEqual(
    Object.values(area.channels).map((c) => c.scale),
    ["x", "y"]
  );
  assert.strictEqual(area.curve, curveLinear);
  assert.strictEqual(area.fill, undefined);
  assert.strictEqual(area.fillOpacity, undefined);
  assert.strictEqual(area.stroke, undefined);
  assert.strictEqual(area.strokeWidth, undefined);
  assert.strictEqual(area.strokeOpacity, undefined);
  assert.strictEqual(area.strokeLinejoin, undefined);
  assert.strictEqual(area.strokeLinecap, undefined);
  assert.strictEqual(area.strokeMiterlimit, undefined);
  assert.strictEqual(area.strokeDasharray, undefined);
  assert.strictEqual(area.strokeDashoffset, undefined);
  assert.strictEqual(area.mixBlendMode, undefined);
  assert.strictEqual(area.shapeRendering, undefined);
});

it("area(data, {x1, y1, y2}) specifies an optional y2 channel", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", y2: "2"});
  const {y2} = area.channels;
  assert.strictEqual(y2.value, "2");
  assert.strictEqual(y2.scale, "y");
});

it("area(data, {x1, x2, y1}) specifies an optional x2 channel", () => {
  const area = Plot.area(undefined, {x1: "0", x2: "1", y1: "2"});
  const {x2} = area.channels;
  assert.strictEqual(x2.value, "1");
  assert.strictEqual(x2.scale, "x");
});

it("area(data, {z}) specifies an optional z channel", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", z: "2"});
  const {z} = area.channels;
  assert.strictEqual(z.value, "2");
  assert.strictEqual(z.scale, undefined);
});

it("area(data, {title}) specifies an optional title channel", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", title: "2"});
  const {title} = area.channels;
  assert.strictEqual(title.value, "2");
  assert.strictEqual(title.scale, undefined);
});

it("area(data, {fill}) allows fill to be a constant color", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", fill: "red"});
  assert.strictEqual(area.fill, "red");
});

it("area(data, {fill}) allows fill to be null", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", fill: null});
  assert.strictEqual(area.fill, "none");
});

it("area(data, {fill}) allows fill to be a variable color", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", fill: "x"});
  assert.strictEqual(area.fill, undefined);
  const {fill} = area.channels;
  assert.strictEqual(fill.value, "x");
  assert.strictEqual(fill.scale, "auto");
});

it("area(data, {fill}) implies a default z channel if fill is variable", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", fill: "2", stroke: "3"}); // fill takes priority
  const {z} = area.channels;
  assert.strictEqual(z.value, "2");
  assert.strictEqual(z.scale, undefined);
});

it("area(data, {stroke}) allows stroke to be a constant color", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", stroke: "red"});
  assert.strictEqual(area.stroke, "red");
});

it("area(data, {stroke}) allows stroke to be null", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", stroke: null});
  assert.strictEqual(area.stroke, undefined);
});

it("area(data, {stroke}) allows stroke to be a variable color", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", stroke: "x"});
  assert.strictEqual(area.stroke, undefined);
  const {stroke} = area.channels;
  assert.strictEqual(stroke.value, "x");
  assert.strictEqual(stroke.scale, "auto");
});

it("area(data, {stroke}) implies a default z channel if stroke is variable", () => {
  const area = Plot.area(undefined, {x1: "0", y1: "1", stroke: "2"});
  const {z} = area.channels;
  assert.strictEqual(z.value, "2");
  assert.strictEqual(z.scale, undefined);
});

it("area(data, {curve}) specifies a named curve or function", () => {
  assert.strictEqual(Plot.area(undefined, {x1: "0", y1: "1", curve: "step"}).curve, curveStep);
  assert.strictEqual(Plot.area(undefined, {x1: "0", y1: "1", curve: curveStep}).curve, curveStep);
});

it("areaX(data, {x, y}) defaults x1 to zero, x2 to x, and y1 to y", () => {
  const area = Plot.areaX(undefined, {x: "0", y: "1"});
  const {x1} = area.channels;
  // assert.strictEqual(x1.value, 0);
  assert.strictEqual(x1.scale, "x");
  const {x2} = area.channels;
  assert.strictEqual(x2.value.label, "0");
  assert.strictEqual(x2.scale, "x");
  const {y1} = area.channels;
  assert.strictEqual(y1.value, "1");
  assert.strictEqual(y1.scale, "y");
});

it("areaY(data, {x, y}) defaults x1 to x, y1 to zero, and y2 to y", () => {
  const area = Plot.areaY(undefined, {x: "0", y: "1"});
  const {x1} = area.channels;
  assert.strictEqual(x1.value, "0");
  assert.strictEqual(x1.scale, "x");
  const {y1} = area.channels;
  // assert.strictEqual(y1.value, 0);
  assert.strictEqual(y1.scale, "y");
  const {y2} = area.channels;
  assert.strictEqual(y2.value.label, "1");
  assert.strictEqual(y2.scale, "y");
});

// The line option (area.js:96 upstream) draws the topline a second time as a
// stroke-only path, so the area can be filled translucently while its edge
// stays crisp. The area-line defaults mirror the line mark (area.js:20-29).
it("areaY(data, {line: true}) draws the topline as a separate stroke-only path", () => {
  const data = [
    {x: 0, y: 1},
    {x: 1, y: 3},
    {x: 2, y: 2}
  ];
  const svg = Plot.plot({marks: [Plot.areaY(data, {x: "x", y: "y", line: true})]});
  const group = svg.querySelector('[aria-label="area-line"]');
  assert.ok(group, "area-line group is rendered");
  assert.strictEqual(group.getAttribute("fill-opacity"), "0.3");
  assert.strictEqual(group.getAttribute("stroke"), "currentColor");
  assert.strictEqual(group.getAttribute("stroke-width"), "1.5");
  const [area, line] = group.querySelectorAll("path");
  assert.strictEqual(area.getAttribute("stroke"), "none");
  assert.strictEqual(line.getAttribute("fill"), "none");
  // The line traces the topline, so it is the path a lineY of the same data
  // draws — the area’s own baseline plays no part in it. The y domain is pinned
  // because the area’s implicit zero baseline widens it.
  const lineSvg = Plot.lineY(data, {x: "x", y: "y"}).plot({y: {domain: [0, 3]}});
  assert.strictEqual(line.getAttribute("d"), lineSvg.querySelector('[aria-label="line"] path').getAttribute("d"));
});

it("areaY(data, {line: false}) has no area-line", () => {
  const svg = Plot.plot({
    marks: [
      Plot.areaY(
        [
          {x: 0, y: 1},
          {x: 1, y: 3}
        ],
        {x: "x", y: "y"}
      )
    ]
  });
  assert.strictEqual(svg.querySelector('[aria-label="area-line"]'), null);
  assert.strictEqual(svg.querySelectorAll('[aria-label="area"] path').length, 1);
});

it("areaY(data, {line: true, marker}) decorates the line with markers", () => {
  const svg = Plot.plot({
    marks: [
      Plot.areaY(
        [
          {x: 0, y: 1},
          {x: 1, y: 3},
          {x: 2, y: 2}
        ],
        {x: "x", y: "y", line: true, marker: "dot"}
      )
    ]
  });
  const [, line] = svg.querySelectorAll('[aria-label="area-line"] path');
  const marker = svg.querySelector("marker");
  assert.ok(marker, "the marker def is rendered");
  // The three refs must point at the def that was actually rendered, rather
  // than matching an id shape: the id scheme is the marker registry's business,
  // and a ref that names a def this plot never emitted draws nothing.
  const ref = `url(#${marker.getAttribute("id")})`;
  assert.strictEqual(line.getAttribute("marker-start"), ref);
  assert.strictEqual(line.getAttribute("marker-mid"), ref);
  assert.strictEqual(line.getAttribute("marker-end"), ref);
});

it("areaX(data, {line: true}) draws the topline as a separate stroke-only path", () => {
  const svg = Plot.plot({
    marks: [
      Plot.areaX(
        [
          {x: 1, y: 0},
          {x: 3, y: 1},
          {x: 2, y: 2}
        ],
        {x: "x", y: "y", line: true}
      )
    ]
  });
  const group = svg.querySelector('[aria-label="area-line"]');
  assert.ok(group, "area-line group is rendered");
  const [area, line] = group.querySelectorAll("path");
  assert.strictEqual(area.getAttribute("stroke"), "none");
  assert.strictEqual(line.getAttribute("fill"), "none");
});
