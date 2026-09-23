// @ts-nocheck — JSDOM tests; the imperative plot() entry returns a DOM node.
//
// #157: contour, frame and raster must emit the channel-driven <title> as a
// child of the element it describes. Upstream gets there through
// applyChannelStyles, which appends the title to the element itself; a sibling
// title attaches the tooltip to the enclosing group instead (which has no datum
// of its own), so hovering a contour band shows the group's first title or
// nothing at all, and a frame title — having no group — lands on the <svg>.
import assert from "assert";
import it from "./jsdom.js";
import * as Plot from "../src/index.ts";

// Every <title> under `root` must be a child of `parent`.
function assertTitlesAreChildrenOf(root, parent, what) {
  const titles = root.querySelectorAll("title");
  assert.ok(titles.length > 0, `expected a <title> in ${what}`);
  for (const title of titles) {
    assert.strictEqual(title.parentNode, parent, `expected the <title> to be a child of ${what}`);
  }
}

describe("mark titles are children of the element they describe", () => {
  it("contour puts each band's title inside its own path", () => {
    const svg = Plot.plot({
      marks: [
        Plot.contour([1, 2, 3, 4, 5, 6, 7, 8, 9], {
          width: 3,
          height: 3,
          value: (d) => d,
          title: (d) => `band ${d.value}`
        })
      ]
    });
    const paths = svg.querySelectorAll("g[aria-label='contour'] > path");
    assert.ok(paths.length > 0, "expected contour paths");
    assert.strictEqual(svg.querySelectorAll("title").length, paths.length, "expected one title per band");
    for (const path of paths) {
      const title = path.querySelector("title");
      assert.ok(title, "expected a title inside the band's own path");
      assert.strictEqual(title.parentNode, path, "expected the title inside the band's own path");
    }
  });

  it("frame puts its title inside the frame rect", () => {
    const svg = Plot.plot({marks: [Plot.frame({title: () => "hello"})]});
    const rect = svg.querySelector("rect[aria-label='frame']");
    assert.ok(rect, "expected a frame rect");
    assertTitlesAreChildrenOf(svg, rect, "the frame rect");
  });

  it("frame puts its title inside an anchored frame line", () => {
    const svg = Plot.plot({marks: [Plot.frame({anchor: "top", title: () => "hello"})]});
    const line = svg.querySelector("line[aria-label='frame']");
    assert.ok(line, "expected a frame line");
    assertTitlesAreChildrenOf(svg, line, "the frame line");
  });

  it("frame puts its title inside a rounded frame path", () => {
    const svg = Plot.plot({marks: [Plot.frame({r: 16, title: () => "hello"})]});
    const path = svg.querySelector("path[aria-label='frame']");
    assert.ok(path, "expected a frame path");
    assertTitlesAreChildrenOf(svg, path, "the frame path");
  });

  it("raster puts its title inside the image", () => {
    const svg = Plot.plot({marks: [Plot.raster([1, 2, 3, 4], {width: 2, height: 2, title: () => "r"})]});
    const image = svg.querySelector("image");
    assert.ok(image, "expected an image");
    assertTitlesAreChildrenOf(svg, image, "the raster image");
  });
});
