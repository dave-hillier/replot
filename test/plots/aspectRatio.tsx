import {Replot, Frame} from "../../src/react/api.js";

export async function aspectRatioLinear() {
  return (
    <Replot
      grid={true}
      inset={6}
      x={{type: "linear", domain: [0, 10]}}
      y={{type: "linear", domain: [10, 20]}}
      aspectRatio={1}
    >
      <Frame />
    </Replot>
  );
}

export async function aspectRatioSqrt() {
  return (
    <Replot
      grid={true}
      inset={6}
      x={{type: "sqrt", domain: [0, 10]}}
      y={{type: "sqrt", domain: [10, 20]}}
      aspectRatio={1}
    >
      <Frame />
    </Replot>
  );
}

export async function aspectRatioLog() {
  return (
    <Replot
      grid={true}
      inset={6}
      x={{type: "log", domain: [1, 10]}}
      y={{type: "log", domain: [10, 100]}}
      aspectRatio={1}
    >
      <Frame />
    </Replot>
  );
}

export async function aspectRatioPoint() {
  return (
    <Replot
      grid={true}
      inset={6}
      x={{type: "point", domain: "ABCDEF"}}
      y={{type: "point", domain: [1, 2, 3, 4, 5, 6]}}
      aspectRatio={1}
    >
      <Frame />
    </Replot>
  );
}

export async function aspectRatioBand() {
  return (
    <Replot
      grid={true}
      inset={6}
      x={{type: "band", domain: "ABCDEF"}}
      y={{type: "band", domain: [1, 2, 3, 4, 5, 6]}}
      aspectRatio={1}
    >
      <Frame />
    </Replot>
  );
}
