// @ts-nocheck — JSDOM React tests for how <Replot> collects its mark, scale and
// legend registrations: which phase they are taken in, and what order the
// committed set is read in.
//
// Two issues share this file because they share one mechanism:
//   #145 — the mark list follows children order, not registration order;
//   #148 — registration must not happen during render, and the plot context
//          must not be rebuilt on every render.
import assert from "assert";
import React, {useState} from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, RuleY, Dot, ScaleY, BarY, Legend, usePlotContext} from "../src/react/index.js";

const data = [
  {x: 1, y: 2, c: "a"},
  {x: 2, y: 3, c: "b"},
  {x: 3, y: 1, c: "c"}
];

async function mount(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(node);
  });
  await act(async () => {});
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

// The axes and ticks render <path> and <text>, so a bare <line> is a RuleY, a
// <circle> is a Dot and a <rect> is a BarY: the tag sequence of those elements
// is the mark z-order. Scoped to the <svg>, because a legend's swatches are
// <rect>s too and live beside the plot in the figure.
function markOrder(container: any): string {
  return [...svgOf(container).querySelectorAll("line, circle, rect")].map((e: any) => e.tagName).join(",");
}

// The plot's own <svg>. A legend carries an <svg> of its own inside its
// .plot-legend wrapper, and that one comes first in the document, so a bare
// querySelector("svg") finds the legend rather than the plot.
function svgOf(container: any): any {
  const svg = [...container.querySelectorAll("svg")].find((s: any) => !s.closest(".plot-legend"));
  assert.ok(svg, "expected the plot's <svg>");
  return svg;
}

describe("#145 mark z-order follows children order", () => {
  jsdomit("draws a mark mounted later in children order, not registration order", async () => {
    // The exact repro from the issue: the rule is written before the dots, but
    // it mounts a commit later, so registration order would put it last and it
    // would paint over the dots.
    let setShow: any;
    function Harness() {
      const [show, set] = useState(false);
      setShow = set;
      return (
        <Replot width={200} height={200}>
          {show && <RuleY data={[2]} />}
          <Dot data={data} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      assert.strictEqual(markOrder(container), "circle,circle,circle");
      await act(async () => setShow(true));
      await act(async () => {});
      assert.strictEqual(markOrder(container), "line,circle,circle,circle");
    } finally {
      await cleanup();
    }
  });

  jsdomit("follows a reorder of keyed children", async () => {
    // React moves keyed instances without remounting them, so the registry's
    // insertion order cannot be the source of truth: the rule stays registered
    // from the first commit and only its position among the children changes.
    let setFlipped: any;
    function Harness() {
      const [flipped, set] = useState(false);
      setFlipped = set;
      const rule = <RuleY key="r" data={[2]} />;
      const dots = <Dot key="d" data={data} x="x" y="y" />;
      return (
        <Replot width={200} height={200}>
          {flipped ? [rule, dots] : [dots, rule]}
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      assert.strictEqual(markOrder(container), "circle,circle,circle,line");
      await act(async () => setFlipped(true));
      await act(async () => {});
      assert.strictEqual(markOrder(container), "line,circle,circle,circle");
    } finally {
      await cleanup();
    }
  });

  jsdomit("merges same-name scale components in children order", async () => {
    // Scale components merge per key with later-wins, so their order is the
    // marks' order seen from the other side. The component written FIRST is the
    // one that mounts later here, and children order is what must decide.
    let setShow: any;
    function Harness() {
      const [show, set] = useState(false);
      setShow = set;
      return (
        <Replot width={200} height={200}>
          {show && <ScaleY type="log" />}
          <ScaleY type="linear" />
          <BarY data={data} x="c" y="x" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      assert.strictEqual(svgOf(container).scale.y.type, "linear");
      await act(async () => setShow(true));
      await act(async () => {});
      assert.strictEqual(svgOf(container).scale.y.type, "linear");
    } finally {
      await cleanup();
    }
  });
});

describe("#148 registration phase and plot context identity", () => {
  jsdomit("keeps the plot context value stable across renders", async () => {
    // The context value is the last thing tying every mark to <Replot>: if its
    // identity changes on each render, every consumer re-renders with it, which
    // is the render cascade in the issue and the accident that makes StrictMode
    // appear to work (the simulated unmount unregisters every mark, and they
    // come back only because the changed context re-renders them into
    // re-registering).
    const seen: any[] = [];
    function Consumer() {
      seen.push(usePlotContext());
      return null;
    }
    const children = (
      <>
        <Consumer />
        <Dot data={data} x="x" y="y" />
      </>
    );
    let setWidth: any;
    function Harness() {
      const [width, set] = useState(200);
      setWidth = set;
      return (
        <Replot width={width} height={200}>
          {children}
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      const first = seen[seen.length - 1];
      assert.ok(first, "expected the consumer to have rendered");
      await act(async () => setWidth(300));
      await act(async () => {});
      // The plot itself did update — without this the assertion below would
      // pass on a plot that never re-rendered at all.
      assert.strictEqual(svgOf(container).getAttribute("width"), "300");
      // Compared with ===, not assert.strictEqual: the value is the whole plot
      // context, and an assertion failure would try to diff two of them.
      assert.ok(seen[seen.length - 1] === first, "expected the context value to keep its identity");
    } finally {
      await cleanup();
    }
  });

  jsdomit("does not re-render a context consumer when an unrelated plot prop changes", async () => {
    const renders = {n: 0};
    function Consumer() {
      renders.n++;
      usePlotContext();
      return null;
    }
    const children = (
      <>
        <Consumer />
        <Dot data={data} x="x" y="y" />
      </>
    );
    let setWidth: any;
    function Harness() {
      const [width, set] = useState(200);
      setWidth = set;
      return (
        <Replot width={width} height={200}>
          {children}
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      const before = renders.n;
      await act(async () => setWidth(300));
      await act(async () => {});
      assert.strictEqual(svgOf(container).getAttribute("width"), "300");
      assert.strictEqual(renders.n, before, "expected no context-driven re-render");
    } finally {
      await cleanup();
    }
  });

  jsdomit("does not re-render a context consumer when a mark's own prop changes", async () => {
    // The cascade the issue describes: a mark's prop change wakes <Plot>, and
    // <Plot> re-rendering used to hand every context consumer a new value. The
    // consumer is memoized and takes no props, so it only re-renders when a
    // context it reads changes — which makes its render count a probe for the
    // context value's identity alone.
    const renders = {n: 0};
    const Consumer = React.memo(function Consumer() {
      renders.n++;
      usePlotContext();
      return null;
    });
    let setR: any;
    function Harness() {
      const [r, set] = useState(3);
      setR = set;
      return (
        <Replot width={200} height={200}>
          <Consumer />
          <Dot data={data} x="x" y="y" r={r} />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(<Harness />);
    try {
      const before = renders.n;
      await act(async () => setR(9));
      await act(async () => {});
      // The plot re-rendered for the new radius — without this the assertion
      // below would pass on a plot that ignored the change.
      assert.strictEqual(svgOf(container).querySelector("circle").getAttribute("r"), "9");
      assert.strictEqual(renders.n, before, "expected no context-driven re-render");
    } finally {
      await cleanup();
    }
  });

  jsdomit("renders marks, scales and legends under StrictMode", async () => {
    // StrictMode's simulated unmount runs every registration cleanup without
    // re-rendering, so a registration taken during render is destroyed and
    // never restored. This is the guard for taking registrations in effects.
    const {container, cleanup} = await mount(
      <React.StrictMode>
        <Replot width={200} height={200} color={{domain: ["a", "b", "c"]}}>
          <ScaleY type="linear" />
          <RuleY data={[2]} />
          <BarY data={data} x="c" y="x" fill="c" />
          <Legend scale="color" />
        </Replot>
      </React.StrictMode>
    );
    try {
      assert.strictEqual(markOrder(container), "line,rect,rect,rect");
      assert.strictEqual(svgOf(container).scale.y.type, "linear");
      assert.strictEqual(container.querySelectorAll(".plot-legend").length, 1, "expected the legend to survive");
      assert.ok(container.querySelector("figure"), "expected the legend to force figure mode");
    } finally {
      await cleanup();
    }
  });

  jsdomit("keeps children order under StrictMode when a mark is mounted later", async () => {
    let setShow: any;
    function Harness() {
      const [show, set] = useState(false);
      setShow = set;
      return (
        <Replot width={200} height={200}>
          {show && <RuleY data={[2]} />}
          <Dot data={data} x="x" y="y" />
        </Replot>
      );
    }
    const {container, cleanup} = await mount(
      <React.StrictMode>
        <Harness />
      </React.StrictMode>
    );
    try {
      await act(async () => setShow(true));
      await act(async () => {});
      assert.strictEqual(markOrder(container), "line,circle,circle,circle");
    } finally {
      await cleanup();
    }
  });
});
