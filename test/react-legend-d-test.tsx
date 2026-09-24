import React from "react";
import {Legend} from "../src/react/legends/Legend.js";

// The plot-scoped form: <Legend scale="…"> must typecheck for each of the
// legend-capable scales.
export const colorLegend = <Legend scale="color" />;
export const opacityLegend = <Legend scale="opacity" />;
export const symbolLegend = <Legend scale="symbol" />;

// The plot-scoped form still accepts non-scale legend options, including the
// plain-colour hints (`color` on an opacity ramp, `fill`/`stroke` on symbols).
export const rampLegend = <Legend scale="color" legend="ramp" />;
export const opacityRampLegend = <Legend scale="opacity" color="red" label="o" />;
export const symbolLegendFill = <Legend scale="symbol" fill="steelblue" columns="2" />;

// The standalone form still takes a scale spec under the matching key.
export const standaloneLegend = <Legend color={{type: "ordinal", domain: ["a", "b"]}} legend="swatches" />;
export const standaloneOpacity = <Legend opacity={{type: "linear", domain: [0, 1]}} />;
export const standaloneSymbol = <Legend symbol={{type: "ordinal", domain: ["a", "b"]}} />;

// Scales without legends aren't resolvable.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const xLegend = <Legend scale="x" />;

// The two forms are mutually exclusive: `scale` names a scale on the parent
// <Plot>, so combining it with a standalone scale spec is rejected. (This
// combination used to compile and then throw at render time.)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const mixedColor = <Legend scale="color" color={{type: "ordinal", domain: ["a", "b"]}} />;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const mixedOpacity = <Legend scale="opacity" opacity={{type: "linear", domain: [0, 1]}} />;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const mixedSymbol = <Legend scale="symbol" symbol={{type: "ordinal", domain: ["a", "b"]}} />;
