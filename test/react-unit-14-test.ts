// @ts-nocheck — React component tests; modules lack type declarations
import assert from "assert";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {validateTip, validateCrosshair} from "./react-fixtures.js";

describe("Unit 14: Tip, Crosshair façades", () => {
  jsdomit("renders Tip via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateTip());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    // Tip mounts a <g> with aria-label "tip" (from the imperative tip mark).
    const tipGroup = svgs[0].querySelector('[aria-label="tip"]');
    assert.ok(tipGroup, "expected a <g> for the tip mark");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders Crosshair via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateCrosshair());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    // Crosshair is a composite of ruleX/ruleY (pointer-driven). Without a
    // pointer event the lines aren't drawn, but the imperative crosshair
    // marks still mount <g> elements with an aria-label starting with
    // "crosshair".
    const crosshairGroup = svgs[0].querySelector('[aria-label^="crosshair"]');
    assert.ok(crosshairGroup, "expected a <g> for the crosshair mark");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
