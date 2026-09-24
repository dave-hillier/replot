import assert from "assert";
import {pointerAnchors, pointerOffsets, pointerSearch} from "../src/react/interactions/pointerUpstream.js";

// Pure unit tests of the three helpers extracted from upstream's pointer
// closure. No React, no jsdom, no store: the anisotropic, margin-reset and NaN
// cases are far cheaper to pin here than through a simulated hover.

const dims = {width: 100, height: 100, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0};
const inset = {width: 200, height: 200, marginTop: 20, marginRight: 20, marginBottom: 20, marginLeft: 20};

const at = (X: (number | undefined)[]) => (i: number) => X[i] as number;

it("pointerSearch excludes a datum whose coordinate is missing, rather than scoring it as zero", () => {
  // Datum 0 has no x. Upstream relies on `undefined - xp` being NaN and on
  // `NaN <= ri` being false; a `?? 0` anywhere would place datum 0 exactly at
  // the pointer (0, 0) and let it win with ri === 0.
  const X = [undefined, 5];
  const Y = [0, 0];
  const {ii, ri} = pointerSearch([0, 1], at(X), at(Y), 0, 0, 1, 1, 40, dims);
  assert.strictEqual(ii, 1);
  assert.strictEqual(ri, 25);

  // With every candidate missing a coordinate, nothing is selected at all.
  const none = pointerSearch([0], at([undefined]), at([0]), 0, 0, 1, 1, 40, dims);
  assert.strictEqual(none.ii, null);
});

it("pointerSearch accepts a candidate at exactly maxRadius, and the last index wins a tie", () => {
  // ri starts at maxRadius² and the comparison is `rj <= ri`, so a point at
  // exactly maxRadius qualifies — and a later point at the same distance
  // replaces an earlier one.
  const X = [40, 60];
  const Y = [50, 50];
  const tie = pointerSearch([0, 1], at(X), at(Y), 50, 50, 1, 1, 10, dims);
  assert.strictEqual(tie.ii, 1);
  assert.strictEqual(tie.ri, 100);

  // Reversing the index proves it is arrival order, not the datum, that decides.
  const reversed = pointerSearch([1, 0], at(X), at(Y), 50, 50, 1, 1, 10, dims);
  assert.strictEqual(reversed.ii, 0);

  // Just outside maxRadius is rejected.
  const outside = pointerSearch([0], at([60.001]), at([50]), 50, 50, 1, 1, 10, dims);
  assert.strictEqual(outside.ii, null);
});

it("pointerSearch with ky = 0.01 picks the x-nearest datum despite a large y gap", () => {
  // pointerX squashes the orthogonal component: datum 0 is 40px away in y but
  // only 2px away in x, so it beats datum 1 which is 20px away in x alone.
  const X = [52, 70];
  const Y = [90, 50];
  const {ii} = pointerSearch([0, 1], at(X), at(Y), 50, 50, 1, 0.01, 40, dims);
  assert.strictEqual(ii, 0);

  // Isotropically, datum 1 wins instead.
  const isotropic = pointerSearch([0, 1], at(X), at(Y), 50, 50, 1, 1, 40, dims);
  assert.strictEqual(isotropic.ii, 1);
});

it("pointerSearch resets the y weighting to 1 outside the vertical margins", () => {
  const X = [102, 120];
  const Y = [150, 190];

  // yp = 170 is inside the frame, so ky = 0.01 applies and the x-nearest datum
  // 0 wins despite being 20px away in y.
  const inside = pointerSearch([0, 1], at(X), at(Y), 100, 170, 1, 0.01, 60, inset);
  assert.strictEqual(inside.ii, 0);

  // yp = 190 is below height - marginBottom, so kpy resets to 1 and selection
  // becomes isotropic over the axis area: datum 1, 20px away, now wins.
  const outside = pointerSearch([0, 1], at(X), at(Y), 100, 190, 1, 0.01, 60, inset);
  assert.strictEqual(outside.ii, 1);
});

it("pointerSearch returns the unsquashed distance only when kx or ky is not 1", () => {
  const X = [102, 120];
  const Y = [150, 190];

  // Anisotropic: the winner is chosen on the squashed distance (4.04) but the
  // reported ri is recomputed unsquashed (2² + 20²) so that it is comparable
  // across facets and pools.
  let calls = 0;
  const countingX = (i: number) => (calls++, X[i]);
  const anisotropic = pointerSearch([0, 1], countingX, at(Y), 100, 170, 1, 0.01, 60, inset);
  assert.strictEqual(anisotropic.ii, 0);
  assert.strictEqual(anisotropic.ri, 404);
  assert.strictEqual(calls, 3); // two in the loop, one in the recompute

  // Isotropic: the recompute is skipped entirely, so the accessors are called
  // exactly once per candidate.
  calls = 0;
  const isotropic = pointerSearch([0, 1], countingX, at(Y), 100, 170, 1, 1, 60, inset);
  assert.strictEqual(isotropic.ii, 0);
  assert.strictEqual(isotropic.ri, 404);
  assert.strictEqual(calls, 2);
});

it("pointerAnchors follows px/py, then the x1–x2 midpoint, then x, then the frame anchor", () => {
  // A centred frame anchor for this mark is (50, 50).
  const mark = {frameAnchor: undefined};
  const d = {width: 100, height: 100, marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10};

  const [px1, py1] = pointerAnchors(mark, {px: [7], py: [8], x: [99], y: [99]}, d);
  assert.deepStrictEqual([px1(0), py1(0)], [7, 8]);

  const [px2, py2] = pointerAnchors(mark, {x1: [10], x2: [20], y1: [30], y2: [50]}, d);
  assert.deepStrictEqual([px2(0), py2(0)], [15, 40]);

  // x defaults to x1 (e.g., area), so a mark with only the start channel
  // anchors on it rather than falling back to the frame.
  const [px3, py3] = pointerAnchors(mark, {x1: [10], y1: [30]}, d);
  assert.deepStrictEqual([px3(0), py3(0)], [10, 30]);

  const [px4, py4] = pointerAnchors(mark, {x: [3], y: [4]}, d);
  assert.deepStrictEqual([px4(0), py4(0)], [3, 4]);

  const [px5, py5] = pointerAnchors(mark, {}, d);
  assert.deepStrictEqual([px5(0), py5(0)], [50, 50]);
});

it("pointerAnchors falls through to the frame anchor for x2 with no x1 and no x", () => {
  // Upstream's destructuring default is `x: X = X1` only, so x2 alone never
  // anchors anything; the frame anchor wins. Reproduced deliberately.
  const mark = {frameAnchor: "top-left"};
  const d = {width: 100, height: 100, marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10};
  const [px, py] = pointerAnchors(mark, {x2: [20], y2: [40]}, d);
  assert.deepStrictEqual([px(0), py(0)], [10, 10]);
});

it("pointerOffsets subtracts the facet translate and adds half a bandwidth", () => {
  const band = (bandwidth: number) => Object.assign(() => 0, {bandwidth: () => bandwidth});
  const d = {width: 200, height: 200, marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 20};

  const index: any = [0, 1];
  index.fx = "b";
  index.fy = "r";

  // fx(index.fx) - marginLeft, plus x.bandwidth() / 2 because a band scale
  // returns the band's lower edge rather than its centre.
  assert.deepStrictEqual(pointerOffsets(index, {x: band(30), fx: () => 120}, d), [115, 0]);
  assert.deepStrictEqual(pointerOffsets(index, {y: band(40), fy: () => 90}, d), [0, 100]);

  // No facet scales and no band scales: no correction at all.
  assert.deepStrictEqual(pointerOffsets(index, {}, d), [0, 0]);
});
