// @ts-nocheck — React component tests; modules lack type declarations
import assert from "assert";
import {findNearest} from "../src/react/interactions/usePointer.js";
import {formatTip} from "../src/react/interactions/Tip.js";
import {
  indirectStyleProps,
  directStyleProps,
  channelStyleProps,
  groupChannelStyleProps,
  computeTransform,
  computeFrameAnchor,
  resolveStyles,
  transformProp
} from "../src/react/styles.js";
import {withTitleChild, withHrefWrap} from "../src/react/styles-jsx.js";

// --- Utility function tests ---

describe("findNearest", () => {
  it("returns null for an empty index", () => {
    assert.strictEqual(findNearest([], {x: [], y: []}, 50, 50), null);
  });

  it("finds nearest point in xy mode", () => {
    const index = [0, 1, 2];
    const values = {x: [10, 50, 90], y: [10, 50, 90]};
    assert.strictEqual(findNearest(index, values, 48, 52, "xy"), 1);
  });

  it("finds nearest point in x mode", () => {
    const index = [0, 1, 2];
    const values = {x: [10, 50, 90], y: [10, 50, 90]};
    // In x mode, only x distance matters; closest x to 12 is 10 (index 0)
    assert.strictEqual(findNearest(index, values, 12, 999, "x"), 0);
  });

  it("finds nearest point in y mode", () => {
    const index = [0, 1, 2];
    const values = {x: [10, 50, 90], y: [10, 50, 90]};
    // In y mode, only y distance matters; closest y to 88 is 90 (index 2)
    assert.strictEqual(findNearest(index, values, 0, 88, "y"), 2);
  });

  it("skips null values", () => {
    const index = [0, 1, 2];
    const values = {x: [null, 50, null], y: [null, 50, null]};
    assert.strictEqual(findNearest(index, values, 0, 0, "xy"), 1);
  });

  it("handles single-element index", () => {
    const index = [0];
    const values = {x: [100], y: [200]};
    assert.strictEqual(findNearest(index, values, 0, 0, "xy"), 0);
  });
});

describe("formatTip", () => {
  it("returns empty array for null datum", () => {
    assert.deepStrictEqual(formatTip(null), []);
  });

  it("returns empty array for undefined datum", () => {
    assert.deepStrictEqual(formatTip(undefined), []);
  });

  it("formats a scalar datum", () => {
    const lines = formatTip(42);
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes("42"));
  });

  it("formats an object datum with all keys", () => {
    const lines = formatTip({a: 1, b: "hello", c: null});
    // c is null so should be excluded
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes("a"));
    assert.ok(lines[1].includes("hello"));
  });

  it("formats an object datum with specified channels", () => {
    const lines = formatTip({a: 1, b: 2, c: 3}, ["a", "c"]);
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes("a"));
    assert.ok(lines[1].includes("c"));
  });
});

// --- Style utility function tests ---

describe("Style utilities", () => {
  describe("indirectStyleProps", () => {
    it("returns empty object for empty mark options", () => {
      const props = indirectStyleProps({});
      assert.deepStrictEqual(props, {});
    });

    it("maps known style properties", () => {
      const props = indirectStyleProps({
        fill: "red",
        stroke: "blue",
        strokeWidth: 2,
        ariaLabel: "dots"
      });
      assert.strictEqual(props.fill, "red");
      assert.strictEqual(props.stroke, "blue");
      assert.strictEqual(props.strokeWidth, 2);
      assert.strictEqual(props["aria-label"], "dots");
    });

    it("includes stroke dash properties", () => {
      const props = indirectStyleProps({
        strokeDasharray: "5,3",
        strokeDashoffset: "2",
        strokeLinecap: "round",
        strokeLinejoin: "bevel"
      });
      assert.strictEqual(props.strokeDasharray, "5,3");
      assert.strictEqual(props.strokeDashoffset, "2");
      assert.strictEqual(props.strokeLinecap, "round");
      assert.strictEqual(props.strokeLinejoin, "bevel");
    });

    it("skips null/undefined values", () => {
      const props = indirectStyleProps({fill: null, stroke: undefined, className: "my-class"});
      assert.ok(!("fill" in props));
      assert.ok(!("stroke" in props));
      assert.strictEqual(props.className, "my-class");
    });
  });

  describe("directStyleProps", () => {
    it("returns empty object for normal mark options", () => {
      const props = directStyleProps({});
      assert.deepStrictEqual(props, {});
    });

    it("includes mixBlendMode when not normal", () => {
      const props = directStyleProps({mixBlendMode: "multiply"});
      assert.ok(props.style);
      assert.strictEqual(props.style.mixBlendMode, "multiply");
    });

    it("excludes mixBlendMode when normal", () => {
      const props = directStyleProps({mixBlendMode: "normal"});
      assert.ok(!props.style);
    });

    it("includes opacity", () => {
      const props = directStyleProps({opacity: 0.5});
      assert.strictEqual(props.opacity, 0.5);
    });
  });

  describe("channelStyleProps", () => {
    it("returns empty object when no channel values", () => {
      const props = channelStyleProps(0, {});
      assert.deepStrictEqual(props, {});
    });

    it("extracts indexed values from channels", () => {
      const values = {
        fill: ["red", "green", "blue"],
        stroke: ["black", "white", "gray"]
      };
      const props = channelStyleProps(1, values);
      assert.strictEqual(props.fill, "green");
      assert.strictEqual(props.stroke, "white");
    });

    it("handles opacity and strokeWidth channels", () => {
      const values = {
        opacity: [0.1, 0.5, 1.0],
        strokeWidth: [1, 2, 3]
      };
      const props = channelStyleProps(2, values);
      assert.strictEqual(props.opacity, 1.0);
      assert.strictEqual(props.strokeWidth, 3);
    });
  });

  describe("groupChannelStyleProps", () => {
    it("uses first index of group", () => {
      const values = {fill: ["red", "green", "blue"]};
      const props = groupChannelStyleProps([1, 2], values);
      assert.strictEqual(props.fill, "green");
    });
  });

  describe("computeTransform", () => {
    it("defaults to the crisp-edge offset, matching applyTransform", () => {
      assert.strictEqual(computeTransform({}, {}), "translate(0.5,0.5)");
    });

    it("returns undefined when explicitly not offset", () => {
      assert.strictEqual(computeTransform({}, {}, 0, 0), undefined);
    });

    it("returns translate for dx/dy", () => {
      assert.strictEqual(computeTransform({dx: 5, dy: 10}, {}, 0, 0), "translate(5,10)");
    });

    it("includes bandwidth offset for band scales", () => {
      const scales = {x: Object.assign((v: any) => v, {bandwidth: () => 20})};
      const result = computeTransform({dx: 0, dy: 0}, scales, 0, 0);
      assert.strictEqual(result, "translate(10,0)");
    });
  });

  describe("computeFrameAnchor", () => {
    const dims = {width: 640, height: 400, marginTop: 20, marginRight: 20, marginBottom: 30, marginLeft: 40};

    it("centers by default", () => {
      const [x, y] = computeFrameAnchor(undefined, dims);
      assert.strictEqual(x, (40 + 640 - 20) / 2);
      assert.strictEqual(y, (20 + 400 - 30) / 2);
    });

    it("anchors to top-left", () => {
      const [x, y] = computeFrameAnchor("top-left", dims);
      assert.strictEqual(x, 40);
      assert.strictEqual(y, 20);
    });

    it("anchors to bottom-right", () => {
      const [x, y] = computeFrameAnchor("bottom-right", dims);
      assert.strictEqual(x, 620);
      assert.strictEqual(y, 370);
    });
  });

  describe("resolveStyles", () => {
    it("resolves with defaults", () => {
      const resolved = resolveStyles({}, {fill: "currentColor", stroke: "none"});
      assert.strictEqual(resolved.fill, undefined); // "currentColor" is the implied default
      assert.strictEqual(resolved.stroke, undefined); // "none" is the implied default
    });

    it("resolves explicit values", () => {
      const resolved = resolveStyles(
        {fill: "red", stroke: "blue", strokeWidth: 3},
        {fill: "currentColor", stroke: "none"}
      );
      assert.strictEqual(resolved.fill, "red");
      assert.strictEqual(resolved.stroke, "blue");
      assert.strictEqual(resolved.strokeWidth, 3);
    });
  });
});

// --- New <Replot> contract validation (Unit 1) ---
// Renders the new façade through JSDOM + ReactDOM to confirm the imperative
// mount path produces real SVG output via the imperative `plot()` factory.

import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {
  validatePlot,
  validateFrame,
  validateRuleX,
  validateRuleY,
  validateTickX,
  validateTickY,
  validateGeo,
  validateGeoData,
  validateHexgrid,
  validateBarY,
  validateBarX,
  validateRectY,
  validateCellY,
  validateCell,
  validateDot,
  validateDotPointer,
  validateAxisX,
  validateAxisY,
  validateGridX,
  validateGridY,
  validateAxisFx,
  validateAxisFy,
  validateGridFx,
  validateGridFy,
  validateBollingerY,
  validateDifferenceY,
  validateLinearRegressionY,
  validateBoxY,
  validateTreeMark,
  validateAuto,
  validateDensity,
  validateContour,
  validateRaster,
  validateDelaunayMesh,
  validateDelaunayLink,
  validateHull,
  validateVoronoi,
  validateVoronoiMesh,
  validateWaffleX,
  validateWaffleY,
  validateLegendSwatches,
  validateLegendRamp
} from "../src/react/__validate.js";

async function renderAndQuery(element: any) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(element);
  });
  await act(async () => {});
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

describe("New Plot contract (Unit 1)", () => {
  jsdomit("renders a Frame mark via the new useMark contract", async () => {
    const {container, cleanup} = await renderAndQuery(validatePlot());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 1, "expected at least one <rect>");
    const stroke = rects[0].getAttribute("stroke");
    assert.strictEqual(stroke, "black");
    await cleanup();
  });
});

describe("Geo/Hexgrid new contract (Unit 8)", () => {
  jsdomit("renders Sphere + Graticule via the imperative façade", async () => {
    const {container, cleanup} = await renderAndQuery(validateGeo());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 2, `expected at least 2 <path> (sphere + graticule), got ${paths.length}`);
    await cleanup();
  });

  jsdomit("renders Geo with data via the imperative façade", async () => {
    const {container, cleanup} = await renderAndQuery(validateGeoData());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    await cleanup();
  });

  jsdomit("renders Hexgrid via the imperative façade", async () => {
    const {container, cleanup} = await renderAndQuery(validateHexgrid());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 1, `expected at least one <path> from hexgrid, got ${paths.length}`);
    await cleanup();
  });

  jsdomit("renders Sphere + Graticule via the new useMark contract (Unit 8)", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateGeo());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 2, "expected at least two <path> (sphere + graticule)");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Geo with data via the new useMark contract (Unit 8)", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateGeoData());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Hexgrid via the new useMark contract (Unit 8)", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateHexgrid());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 1, "expected at least one <path> from hexgrid");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

async function renderUnit3(element: any) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(element);
  });
  await act(async () => {});
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

describe("Bar/Rect/Cell new contract (Unit 3)", () => {
  jsdomit("renders BarY via the imperative façade", async () => {
    const {container, cleanup} = await renderUnit3(validateBarY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 3, `expected at least 3 <rect> for BarY, got ${rects.length}`);
    await cleanup();
  });

  jsdomit("renders BarX via the imperative façade", async () => {
    const {container, cleanup} = await renderUnit3(validateBarX());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 2, `expected at least 2 <rect> for BarX, got ${rects.length}`);
    await cleanup();
  });

  jsdomit("renders RectY via the imperative façade", async () => {
    const {container, cleanup} = await renderUnit3(validateRectY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 5, `expected at least 5 <rect> for RectY, got ${rects.length}`);
    await cleanup();
  });

  jsdomit("renders CellY via the imperative façade", async () => {
    const {container, cleanup} = await renderUnit3(validateCellY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 4, `expected at least 4 <rect> for CellY, got ${rects.length}`);
    await cleanup();
  });

  jsdomit("renders Cell via the imperative façade", async () => {
    const {container, cleanup} = await renderUnit3(validateCell());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 2, `expected at least 2 <rect> for Cell, got ${rects.length}`);
    await cleanup();
  });
});

describe("New Plot contract — Unit 2 façades", () => {
  async function mountAndQuery(element: any, selector: string) {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(element);
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const matches = svgs[0].querySelectorAll(selector);
    await act(async () => {
      root.unmount();
    });
    container.remove();
    return matches;
  }

  jsdomit("Frame façade renders a <rect> via PlotV2", async () => {
    const rects = await mountAndQuery(validateFrame(), "rect");
    assert.ok(rects.length >= 1, "expected at least one <rect>");
  });

  jsdomit("RuleX façade renders <line> elements via PlotV2", async () => {
    const lines = await mountAndQuery(validateRuleX(), "line");
    assert.ok(lines.length >= 1, "expected at least one <line>");
  });

  jsdomit("RuleY façade renders <line> elements via PlotV2", async () => {
    const lines = await mountAndQuery(validateRuleY(), "line");
    assert.ok(lines.length >= 1, "expected at least one <line>");
  });

  jsdomit("TickX façade renders <line> elements via PlotV2", async () => {
    const lines = await mountAndQuery(validateTickX(), "line");
    assert.ok(lines.length >= 1, "expected at least one <line>");
  });

  jsdomit("TickY façade renders <line> elements via PlotV2", async () => {
    const lines = await mountAndQuery(validateTickY(), "line");
    assert.ok(lines.length >= 1, "expected at least one <line>");
  });
});

describe("Dot façade (Unit 5)", () => {
  jsdomit("renders Dot via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateDot());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const circles = svgs[0].querySelectorAll("circle");
    assert.ok(circles.length >= 3, `expected at least 3 <circle> elements; got ${circles.length}`);
    // The imperative `dot()` factory applies stroke to the enclosing <g>, not
    // each <circle>, via applyIndirectStyles.
    const groupStroke = (circles[0].parentNode as Element)?.getAttribute("stroke");
    assert.strictEqual(groupStroke, "red");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Dot with spread pointer({...}) interaction", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateDotPointer());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    // pointer renders an empty initial state; the SVG should still mount.
    const groups = svgs[0].querySelectorAll("g");
    assert.ok(groups.length >= 1, "expected at least one <g>");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe("Axis/Grid façades (Unit 9)", () => {
  async function renderInJsdom(element: any) {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(element);
    });
    await act(async () => {});
    return {container, root};
  }

  async function unmount(container: any, root: any) {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }

  jsdomit("renders AxisX via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateAxisX());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const ariaLabel = svgs[0].querySelector('[aria-label*="x-axis"]');
    assert.ok(ariaLabel, "expected an x-axis group");
    await unmount(container, root);
  });

  jsdomit("renders AxisY via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateAxisY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const ariaLabel = svgs[0].querySelector('[aria-label*="y-axis"]');
    assert.ok(ariaLabel, "expected a y-axis group");
    await unmount(container, root);
  });

  jsdomit("renders GridX via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateGridX());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const grid = svgs[0].querySelector('[aria-label*="x-grid"]');
    assert.ok(grid, "expected an x-grid group");
    await unmount(container, root);
  });

  jsdomit("renders GridY via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateGridY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const grid = svgs[0].querySelector('[aria-label*="y-grid"]');
    assert.ok(grid, "expected a y-grid group");
    await unmount(container, root);
  });

  jsdomit("renders AxisFx via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateAxisFx());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    await unmount(container, root);
  });

  jsdomit("renders AxisFy via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateAxisFy());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    await unmount(container, root);
  });

  jsdomit("renders GridFx via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateGridFx());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    await unmount(container, root);
  });

  jsdomit("renders GridFy via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateGridFy());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    await unmount(container, root);
  });
});

describe("New Plot contract (Unit 10)", () => {
  jsdomit("renders BollingerY band via the imperative bollingerY composite", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateBollingerY());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = Array.from(svgs[0].querySelectorAll("path")) as any[];
    // The bollingerY composite emits an area (the band) plus a line (the
    // centerline). Both should produce non-empty `d` attributes once the
    // imperative window+map+stack pipeline has run.
    const ds = paths.map((p) => p.getAttribute("d") || "").filter((d: string) => d.length > 0);
    assert.ok(ds.length >= 2, `expected at least 2 non-empty path d attributes, got ${ds.length}`);
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders DifferenceY via the imperative differenceY composite", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateDifferenceY());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = Array.from(svgs[0].querySelectorAll("path")) as any[];
    const ds = paths.map((p) => p.getAttribute("d") || "").filter((d: string) => d.length > 0);
    assert.ok(ds.length >= 1, `expected at least 1 non-empty path d attribute, got ${ds.length}`);
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders LinearRegressionY line via the imperative linearRegressionY composite", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateLinearRegressionY());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = Array.from(svgs[0].querySelectorAll("path")) as any[];
    const ds = paths.map((p) => p.getAttribute("d") || "").filter((d: string) => d.length > 0);
    assert.ok(ds.length >= 1, `expected at least 1 non-empty path d attribute, got ${ds.length}`);
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe("Box/Tree/Auto façades (Unit 11)", () => {
  async function renderInJsdom(element: any) {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(element);
    });
    await act(async () => {});
    return {container, root};
  }

  jsdomit("BoxY emits composite rule + bar + tick from raw values", async () => {
    const {container, root} = await renderInJsdom(validateBoxY());
    const svg = container.querySelector("svg");
    assert.ok(svg, "expected an <svg>");
    const lines = svg.querySelectorAll("line");
    const rects = svg.querySelectorAll("rect");
    assert.ok(lines.length >= 2, `expected whisker/tick lines, got ${lines.length}`);
    assert.ok(rects.length >= 1, `expected box rects, got ${rects.length}`);
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("TreeMark runs the tree() layout transform on flat path data", async () => {
    const {container, root} = await renderInJsdom(validateTreeMark());
    const svg = container.querySelector("svg");
    assert.ok(svg, "expected an <svg>");
    // tree() must compute positions and emit edges + node labels.
    const paths = svg.querySelectorAll("path");
    const texts = svg.querySelectorAll("text");
    assert.ok(paths.length >= 1, `expected tree edge paths, got ${paths.length}`);
    assert.ok(texts.length >= 1, `expected tree node labels, got ${texts.length}`);
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("Auto infers a mark from the data shape", async () => {
    const {container, root} = await renderInJsdom(validateAuto());
    const svg = container.querySelector("svg");
    assert.ok(svg, "expected an <svg>");
    const drawn = svg.querySelectorAll("path, circle, rect, line");
    assert.ok(drawn.length >= 1, `expected at least one drawn element, got ${drawn.length}`);
    await act(async () => root.unmount());
    container.remove();
  });
});

describe("Unit 12: Density, Contour, Raster façades", () => {
  jsdomit("renders Density as paths via the imperative density() factory", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateDensity());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 1, "expected at least one density <path>");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Contour as paths via the imperative contour() factory", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateContour());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 1, "expected at least one contour <path>");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Raster as an <image> via the imperative raster() factory", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateRaster());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const images = svgs[0].querySelectorAll("image");
    assert.ok(images.length >= 1, "expected at least one <image> element (canvas pipeline)");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe("Delaunay and Waffle façades (Unit 13)", () => {
  async function renderInJsdom(element: any) {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(element);
    });
    await act(async () => {});
    return {container, root};
  }

  jsdomit("renders DelaunayMesh via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateDelaunayMesh());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    assert.ok(svgs[0].querySelector('g[aria-label*="delaunay"]'), "expected a delaunay layer");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders DelaunayLink via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateDelaunayLink());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    assert.ok(svgs[0].querySelector('g[aria-label*="link"]'), "expected a link layer");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders Hull via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateHull());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    assert.ok(svgs[0].querySelector('g[aria-label*="hull"]'), "expected a hull layer");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders Voronoi via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateVoronoi());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    assert.ok(svgs[0].querySelector('g[aria-label*="voronoi"]'), "expected a voronoi layer");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders VoronoiMesh via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateVoronoiMesh());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    assert.ok(svgs[0].querySelector('g[aria-label*="voronoi"]'), "expected a voronoi layer");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders WaffleY via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateWaffleY());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 1, "expected at least one waffle cell rect");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders WaffleX via the new useMark contract", async () => {
    const {container, root} = await renderInJsdom(validateWaffleX());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1);
    const rects = svgs[0].querySelectorAll("rect");
    assert.ok(rects.length >= 1, "expected at least one waffle cell rect");
    await act(async () => root.unmount());
    container.remove();
  });
});

describe("Legend façade (Unit 15)", () => {
  jsdomit("renders a swatches legend via the imperative legend()", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateLegendSwatches());
    });
    await act(async () => {});
    const host = container.querySelector(".plot-legend");
    assert.ok(host, "expected a .plot-legend host div");
    const swatches = host.querySelectorAll("svg");
    assert.ok(swatches.length >= 1, "expected at least one swatch <svg>");
    await act(async () => root.unmount());
    container.remove();
  });

  jsdomit("renders a ramp legend via the imperative legend()", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateLegendRamp());
    });
    await act(async () => {});
    const host = container.querySelector(".plot-legend");
    assert.ok(host, "expected a .plot-legend host div");
    const svg = host.querySelector("svg");
    assert.ok(svg, "expected an <svg> ramp");
    await act(async () => root.unmount());
    container.remove();
  });
});

import {renderToStaticMarkup} from "react-dom/server";

describe("transformProp", () => {
  it("returns an empty object when there is nothing to translate", () => {
    assert.deepStrictEqual(transformProp({}, {}), {transform: "translate(0.5,0.5)"});
    assert.deepStrictEqual(transformProp({}, {}, 0, 0), {});
    assert.deepStrictEqual(transformProp({dx: 0, dy: 0}, {}, 0, 0), {});
  });
  it("returns a translate string when dx or dy is set", () => {
    assert.deepStrictEqual(transformProp({dx: 5, dy: 0}, {}, 0, 0), {transform: "translate(5,0)"});
    assert.deepStrictEqual(transformProp({dx: 0, dy: -3}, {}, 0, 0), {transform: "translate(0,-3)"});
  });
  it("adds half-bandwidth from band scales", () => {
    const x = {bandwidth: () => 20};
    const y = {bandwidth: () => 10};
    assert.deepStrictEqual(transformProp({}, {x, y}, 0, 0), {transform: "translate(10,5)"});
  });
});

describe("withTitleChild", () => {
  it("returns the original children when there is no title channel", () => {
    assert.strictEqual(withTitleChild({}, {}, 0, null), null);
  });
  it("emits a <title> child when the title channel has a non-empty value", () => {
    const html = renderToStaticMarkup(<g>{withTitleChild({}, {title: ["hello"]}, 0, null)}</g>);
    assert.ok(html.includes("<title>hello</title>"), `got ${html}`);
  });
  it("skips empty title values", () => {
    assert.strictEqual(withTitleChild({}, {title: [""]}, 0, null), null);
    assert.strictEqual(withTitleChild({}, {title: [null]}, 0, null), null);
  });
  it("omits the title when the mark has a tip, as the imperative applyChannelStyles does", () => {
    assert.strictEqual(withTitleChild({tip: true}, {title: ["hello"]}, 0, null), null);
    assert.strictEqual(withTitleChild({tip: "x"}, {title: ["hello"]}, 0, null), null);
    assert.strictEqual(withTitleChild({tip: {anchor: "top"}}, {title: ["hello"]}, 0, null), null);
  });
});

describe("withHrefWrap", () => {
  it("returns the node unchanged when there is no href channel", () => {
    const node = <line x1={0} x2={10} y1={0} y2={0} />;
    assert.strictEqual(withHrefWrap({}, undefined, 0, node), node);
  });
  it("wraps the node in an <a> when href is present", () => {
    const node = <line x1={0} x2={10} y1={0} y2={0} />;
    const wrapped = withHrefWrap({href: ["https://example.com"]}, "_blank", 0, node);
    const html = renderToStaticMarkup(<g>{wrapped}</g>);
    assert.ok(html.includes("<a"), `got ${html}`);
    assert.ok(html.includes('href="https://example.com"'), `got ${html}`);
    assert.ok(html.includes('target="_blank"'), `got ${html}`);
  });
  it("skips entries with null href", () => {
    const node = <line x1={0} x2={10} y1={0} y2={0} />;
    assert.strictEqual(withHrefWrap({href: [null]}, undefined, 0, node), node);
  });
});
