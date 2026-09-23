// @ts-nocheck — JSDOM React tests for computePlot errors reaching an error boundary.
//
// #151: <Replot> caught computePlot's errors, logged them with console.error and
// rendered an empty plot-host, so an invalid option produced a blank plot and an
// enclosing error boundary never saw anything. Upstream's imperative plot()
// throws these straight out of plot() (src/plot.js:143 -> src/scales.js:379,
// `unknown scale type: nope`), and nothing in upstream's src/ catches an error
// to downgrade it to a console message, so the React path rethrows during render
// instead.
import assert from "assert";
import React from "react";
import jsdomit from "./jsdom.js";
import ReactDOM from "react-dom/client";
import {act} from "react";
import {Replot, Dot} from "../src/react/index.js";

const data = [
  {x: 1, y: 2},
  {x: 2, y: 3},
  {x: 3, y: 1}
];

// React logs a caught render error to console.error; the tests below provoke one
// deliberately, so the console is silenced for the duration and any stderr noise
// stays out of the suite's output.
async function mountSilencingErrors(node) {
  const container = (globalThis as any).document.createElement("div");
  (globalThis as any).document.body.appendChild(container);
  const realError = console.error;
  console.error = () => {};
  try {
    await act(async () => {
      ReactDOM.createRoot(container).render(node);
    });
    await act(async () => {});
  } finally {
    console.error = realError;
  }
  return container;
}

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
  }
  static getDerivedStateFromError(error) {
    return {error};
  }
  componentDidCatch() {}
  render() {
    return this.state.error ? <p className="fallback">{this.state.error.message}</p> : this.props.children;
  }
}

describe("#151 computePlot errors reach an error boundary", () => {
  jsdomit("hands an invalid scale type to the enclosing boundary", async () => {
    const container = await mountSilencingErrors(
      <Boundary>
        <Replot width={200} height={200} x={{type: "nope"}}>
          <Dot data={data} x="x" y="y" />
        </Replot>
      </Boundary>
    );
    const fallback = container.querySelector(".fallback");
    assert.ok(fallback, "expected the boundary to render its fallback");
    // The same message upstream's plot() throws, rather than a wrapped one.
    assert.strictEqual(fallback.textContent, "unknown scale type: nope");
  });

  jsdomit("leaves a valid plot alone", async () => {
    // The guard for the fix: the error path must not throw for a plot that
    // computes.
    const container = await mountSilencingErrors(
      <Boundary>
        <Replot width={200} height={200}>
          <Dot data={data} x="x" y="y" />
        </Replot>
      </Boundary>
    );
    assert.strictEqual(container.querySelector(".fallback"), null);
    assert.strictEqual(container.querySelectorAll("circle").length, 3);
  });

  jsdomit("hands an invalid option on a later update to the boundary too", async () => {
    // The error arrives from a layout effect after a prop change, not just from
    // the first render, so it has to reach the boundary from that path as well.
    const container = (globalThis as any).document.createElement("div");
    (globalThis as any).document.body.appendChild(container);
    let root: any;
    let setType: any;
    const realError = console.error;
    console.error = () => {};
    try {
      function Harness() {
        const [type, set] = React.useState("linear");
        setType = set;
        return (
          <Boundary>
            <Replot width={200} height={200} x={{type}}>
              <Dot data={data} x="x" y="y" />
            </Replot>
          </Boundary>
        );
      }
      await act(async () => {
        root = ReactDOM.createRoot(container);
        root.render(<Harness />);
      });
      await act(async () => {});
      assert.strictEqual(container.querySelector(".fallback"), null);
      await act(async () => setType("nope"));
      await act(async () => {});
    } finally {
      console.error = realError;
    }
    const fallback = container.querySelector(".fallback");
    assert.ok(fallback, "expected the boundary to render its fallback");
    assert.strictEqual(fallback.textContent, "unknown scale type: nope");
  });
});
