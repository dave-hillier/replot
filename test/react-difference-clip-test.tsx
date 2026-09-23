// @ts-nocheck — JSDOM React tests for the difference mark's clip ids.
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, DifferenceY, DifferenceX} from "../src/react/api.js";

// A difference mark clips its two areas against a line by emitting one
// <clipPath> per area and pointing that area's <path> at it with url(#…). The
// ids have to be unique within the plot: the frame clip (which a difference
// plot always has, because the differenced line is clip: true) is a
// <clipPath> too, and a url(#…) that names two elements resolves to whichever
// one the browser reaches first — so a collision silently clips the positive
// area to the frame instead.
const data = [
  {x: 1, y: 2},
  {x: 2, y: 4},
  {x: 3, y: 3},
  {x: 4, y: 5}
];

async function mount(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
  return {
    container,
    render: async (next) => {
      await act(async () => root.render(next));
      await act(async () => {});
    },
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    }
  };
}

function clipIds(root) {
  return [...root.querySelectorAll("[id^=plot-clip-]")].map((n) => n.getAttribute("id"));
}

function clipRefs(root) {
  return [...root.querySelectorAll("[clip-path]")].map((n) => n.getAttribute("clip-path"));
}

function assertClipIdsResolve(root) {
  const ids = clipIds(root);
  const unique = new Set(ids);
  assert.deepStrictEqual(
    ids.length,
    unique.size,
    `duplicate clip ids: ${JSON.stringify(
      ids
    )} — url(#…) would resolve to whichever definition comes first in the document`
  );
  for (const ref of clipRefs(root)) {
    const id = ref.slice(5, -1);
    assert.ok(unique.has(id), `${ref} names no <clipPath> in the plot`);
  }
}

// The point of the ids: an area's clip-path ref must resolve to the <clipPath>
// the mark itself emitted, and a browser resolves url(#…) to the FIRST element
// in the document carrying that id. So the document-wide lookup has to land on
// the definition inside this group — a collision resolves it to the frame clip
// instead, which silently clips the area to the frame.
function assertGroupClipsItself(root, ariaLabel) {
  const g = root.querySelector(`g[aria-label="${ariaLabel}"]`);
  assert.ok(g, `expected a ${ariaLabel} group`);
  const refs = [...g.querySelectorAll("[clip-path]")].map((n) => n.getAttribute("clip-path").slice(5, -1));
  assert.ok(refs.length > 0, `expected ${ariaLabel} to reference a clip`);
  for (const id of refs) {
    const mine = g.querySelector(`[id="${id}"]`);
    assert.ok(mine, `${ariaLabel} references #${id}, which it does not emit`);
    assert.strictEqual(
      root.querySelector(`[id="${id}"]`),
      mine,
      `${ariaLabel}'s url(#${id}) resolves to another element in the plot`
    );
  }
}

describe("difference mark clip ids", () => {
  jsdomit("are unique in a plot that also has a frame clip", async () => {
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <DifferenceY data={data} x="x" y1="y" y2={0} />
      </Replot>
    );
    assertClipIdsResolve(container);
    assertGroupClipsItself(container, "positive difference");
    assertGroupClipsItself(container, "negative difference");
    await cleanup();
  });

  jsdomit("are unique for differenceX too", async () => {
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <DifferenceX data={data} y="x" x1="y" x2={0} />
      </Replot>
    );
    assertClipIdsResolve(container);
    await cleanup();
  });

  jsdomit("are unique with several difference marks in one plot", async () => {
    const {container, cleanup} = await mount(
      <Replot width={200} height={200}>
        <DifferenceY data={data} x="x" y1="y" y2={0} />
        <DifferenceY data={data.map((d) => ({...d, y: d.y - 1}))} x="x" y1="y" y2={0} />
      </Replot>
    );
    assertClipIdsResolve(container);
    await cleanup();
  });

  // A re-render that does not recompute the plot (React re-renders the marks
  // without rebuilding them) must not change the ids either: the browser keeps
  // whatever the last commit put in the DOM, and a rewritten id would detach
  // the clip from the paths referencing it for as long as the two are out of
  // step.
  jsdomit("stay the same across a re-render", async () => {
    const plot = (width) => (
      <Replot width={width} height={200}>
        <DifferenceY data={data} x="x" y1="y" y2={0} />
      </Replot>
    );
    const {container, render, cleanup} = await mount(plot(200));
    const before = clipIds(container);
    assert.ok(before.length > 1, "expected more than one clip in the plot");
    await render(plot(200));
    assert.deepStrictEqual(clipIds(container), before);
    assertClipIdsResolve(container);
    await cleanup();
  });
});
