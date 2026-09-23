// Type-level tests for the plot props, run by `yarn test:tsc` (which compiles
// this file): every @ts-expect-error below has to fail to compile, for the
// reason its comment names. Between them they say that the plot's scale,
// projection, facet, axis, grid and style props take the same option types as
// the imperative plot(), and that ReplotProps has no catch-all index signature
// — so a misspelled or wrongly typed prop is a compile error instead of a prop
// that is silently ignored at runtime.
import React from "react";
import {Replot, Dot} from "../src/react/index.js";

const points = [
  {x: 1, y: 2},
  {x: 2, y: 3}
];

// Every prop here is a real one, with the type the imperative API gives it.
export const ok = (
  <Replot
    width={640}
    height={400}
    marginLeft={60}
    x={{type: "log", domain: [1, 10], nice: true, grid: true}}
    y={{label: "y", grid: false, axis: "right"}}
    color={{scheme: "observable10", legend: true}}
    r={{range: [0, 5]}}
    opacity={{domain: [0, 1]}}
    fx={{padding: 0.1}}
    projection="mercator"
    facet={{marginRight: 40}}
    style={{maxWidth: "50%"}}
    className="my-plot"
    title="A title"
    ariaLabel="A plot"
    clip
    figure="auto"
    onValue={(value: unknown) => void value}
  >
    <Dot data={points} x="x" y="y" />
  </Replot>
);

// A style option may also be a string, as in the imperative API.
export const styleString = <Replot style="max-width: 50%" />;

// @ts-expect-error: a misspelled prop is not silently accepted
export const typo = <Replot widht={640} />;

// @ts-expect-error: scale props are ScaleOptions, so a wrong option type fails
export const badScaleOption = <Replot x={{type: 123}} />;

// @ts-expect-error: ... and so does a scale prop given the wrong shape
export const badScaleProp = <Replot y="log" />;

// @ts-expect-error: marks are children on this entry point, not a marks prop
export const marksProp = <Replot marks={[]} />;
