// @ts-nocheck — JSDOM React tests for Unit 4 (Line/Area façades)
import assert from "assert";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {
  validateLine,
  validateLineX,
  validateLineY,
  validateArea,
  validateAreaX,
  validateAreaY
} from "./react-fixtures.js";

async function mountAndQuery(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
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

describe("Unit 4: Line/Area façades (new contract)", () => {
  jsdomit("renders a Line via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateLine());
    const svgs = container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const paths = svgs[0].querySelectorAll("path");
    assert.ok(paths.length >= 1, "expected at least one <path> for the line");
    await cleanup();
  });

  jsdomit("renders a LineX via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateLineX());
    const paths = container.querySelectorAll("svg path");
    assert.ok(paths.length >= 1, "expected at least one <path> for lineX");
    await cleanup();
  });

  jsdomit("renders a LineY via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateLineY());
    const paths = container.querySelectorAll("svg path");
    assert.ok(paths.length >= 1, "expected at least one <path> for lineY");
    await cleanup();
  });

  jsdomit("renders an Area via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateArea());
    const paths = container.querySelectorAll("svg path");
    assert.ok(paths.length >= 1, "expected at least one <path> for area");
    await cleanup();
  });

  jsdomit("renders an AreaX via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateAreaX());
    const paths = container.querySelectorAll("svg path");
    assert.ok(paths.length >= 1, "expected at least one <path> for areaX");
    await cleanup();
  });

  jsdomit("renders an AreaY via the new useMark contract", async () => {
    const {container, cleanup} = await mountAndQuery(validateAreaY());
    const paths = container.querySelectorAll("svg path");
    assert.ok(paths.length >= 1, "expected at least one <path> for areaY");
    await cleanup();
  });
});
