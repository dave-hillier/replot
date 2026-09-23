// @ts-nocheck — React component tests for Unit 6 (Text, Link, Arrow façades).
import assert from "assert";
import ReactDOM from "react-dom/client";
import {act} from "react";
import jsdomit from "./jsdom.js";
import {validateText, validateLink, validateArrow} from "./react-fixtures.js";

async function renderInto(element) {
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

async function teardown({container, root}) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

describe("Unit 6: Text, Link, Arrow façades", () => {
  jsdomit("renders Text via the imperative façade", async () => {
    const ctx = await renderInto(validateText());
    const svgs = ctx.container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const texts = svgs[0].querySelectorAll("text");
    // text mark renders one <text> per datum (plus possible axis tick texts)
    assert.ok(texts.length >= 2, `expected at least 2 <text> elements, got ${texts.length}`);
    await teardown(ctx);
  });

  jsdomit("renders Link via the imperative façade", async () => {
    const ctx = await renderInto(validateLink());
    const svgs = ctx.container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    // link renders <line> elements with aria-label="link"
    const linkGroup = svgs[0].querySelector('[aria-label="link"]');
    assert.ok(linkGroup, "expected an aria-label=link group");
    const paths = linkGroup.querySelectorAll("path");
    assert.ok(paths.length >= 2, `expected at least 2 <path> elements, got ${paths.length}`);
    await teardown(ctx);
  });

  jsdomit("renders Arrow via the imperative façade", async () => {
    const ctx = await renderInto(validateArrow());
    const svgs = ctx.container.querySelectorAll("svg");
    assert.strictEqual(svgs.length, 1, "expected exactly one <svg>");
    const arrowGroup = svgs[0].querySelector('[aria-label="arrow"]');
    assert.ok(arrowGroup, "expected an aria-label=arrow group");
    const paths = arrowGroup.querySelectorAll("path");
    assert.ok(paths.length >= 2, `expected at least 2 <path> elements, got ${paths.length}`);
    await teardown(ctx);
  });
});
