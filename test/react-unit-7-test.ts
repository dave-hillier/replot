// @ts-nocheck — React component tests; modules lack type declarations
import assert from "assert";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {validateVector, validateSpike, validateImage} from "./react-fixtures.js";

describe("Unit 7: Vector and Image as imperative façades", () => {
  jsdomit("renders a Vector mark via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateVector());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const vectorGroup = svgs[0].querySelector('[aria-label="vector"]');
    assert.ok(vectorGroup, "expected a vector group");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders a Spike mark via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateSpike());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const spikeGroup = svgs[0].querySelector('[aria-label="vector"]');
    assert.ok(spikeGroup, "expected a vector group (spike)");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  jsdomit("renders an Image mark via the new useMark contract", async () => {
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(validateImage());
    });
    await act(async () => {});
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const imageGroup = svgs[0].querySelector('[aria-label="image"]');
    assert.ok(imageGroup, "expected an image group");
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
