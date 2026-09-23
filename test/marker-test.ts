import * as Plot from "replot";
import assert from "assert";
import it from "./jsdom.js";

// A custom marker function, as documented by MarkerFunction: it receives the
// stroke color and the render context, and returns a <marker> element built in
// that context's document. The shape is deliberately unlike any built-in
// marker so the assertions can't be satisfied by a fallback.
function customMarker(color: string, {document}: {document: Document}) {
  const svgNS = "http://www.w3.org/2000/svg";
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("viewBox", "-4 -4 8 8");
  marker.setAttribute("markerWidth", "4");
  marker.setAttribute("markerHeight", "4");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "M-2,0h4");
  path.setAttribute("stroke", color);
  marker.append(path);
  return marker;
}

it("draws a custom marker function", () => {
  const svg = Plot.ruleX([1, 2, 3], {marker: customMarker}).plot();
  const lines = svg.querySelectorAll("line");
  assert.strictEqual(lines.length, 3);
  // Every marker reference resolves to a def drawn from the user's element.
  for (const line of lines) {
    for (const attr of ["marker-start", "marker-mid", "marker-end"]) {
      const ref = line.getAttribute(attr);
      assert.match(ref ?? "", /^url\(#plot-marker-\d+\)$/, `${attr} should reference a marker`);
      const def = svg.querySelector(`[id="${ref!.slice(5, -1)}"]`);
      assert.ok(def, `expected a def for ${attr}`);
      assert.strictEqual(def!.getAttribute("viewBox"), "-4 -4 8 8");
      assert.strictEqual(def!.querySelector("path")?.getAttribute("d"), "M-2,0h4");
      assert.strictEqual(def!.querySelector("path")?.getAttribute("stroke"), "currentColor");
    }
  }
});

it("gives each marker a unique id, so two plots cannot resolve each other's", () => {
  const a = Plot.ruleX([1, 2, 3], {marker: "arrow"}).plot();
  const b = Plot.ruleX([1, 2, 3], {marker: "arrow"}).plot();
  const ids = (root: Element) => [...root.querySelectorAll("marker")].map((n) => n.getAttribute("id"));
  const idsA = ids(a);
  const idsB = ids(b);
  assert.ok(idsA.length > 0, "expected the first plot to draw markers");
  // The plot-marker- prefix is upstream's, and the one the snapshot harness
  // reindexes to a stable sequence.
  assert.match(idsA[0]!, /^plot-marker-\d+$/);
  assert.strictEqual(idsA.length, idsB.length);
  for (const id of idsA) assert.ok(!idsB.includes(id), `duplicate marker id across plots: ${id}`);
});

it("gives two marks in one plot their own defs", () => {
  // Ids used to be built from the marker name and color alone, so these two
  // rules drew one shared def: whichever of them came first in the document
  // would have supplied the currentColor context for both. The scope is minted
  // per mark, so each draws its own.
  const svg = Plot.plot({
    marks: [Plot.ruleX([1], {marker: "arrow", stroke: "red"}), Plot.ruleX([2], {marker: "arrow", stroke: "red"})]
  });
  const markers = [...svg.querySelectorAll("marker")];
  assert.strictEqual(markers.length, 2);
  assert.notStrictEqual(markers[0].getAttribute("id"), markers[1].getAttribute("id"));
});

it("shares one marker def across the tick's lines", () => {
  // Every line in a tick mark names the same marker and color, so the mark
  // emits a single def for all of them rather than one per element.
  const svg = Plot.tickX([1, 2, 3], {marker: "arrow"}).plot();
  const markers = svg.querySelectorAll("marker");
  assert.strictEqual(markers.length, 1);
  const id = markers[0].getAttribute("id");
  for (const line of svg.querySelectorAll("line")) {
    assert.strictEqual(line.getAttribute("marker-start"), `url(#${id})`);
    assert.strictEqual(line.getAttribute("marker-end"), `url(#${id})`);
  }
});
