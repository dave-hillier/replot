import {max, min, quantile} from "d3";
import type {CompoundMark, Data} from "../mark.js";
import {marks} from "../mark.js";
import {identity} from "../options.js";
import {groupX, groupY, groupZ} from "../transforms/group.js";
import {map} from "../transforms/map.js";
import type {BarXOptions, BarYOptions} from "./bar.js";
import {barX, barY} from "./bar.js";
import type {DotOptions} from "./dot.js";
import {dot} from "./dot.js";
import type {RuleXOptions, RuleYOptions} from "./rule.js";
import {ruleX, ruleY} from "./rule.js";
import type {TickXOptions, TickYOptions} from "./tick.js";
import {tickX, tickY} from "./tick.js";

// JSX rendering note: Box is a pure compound-mark factory (boxX/boxY return an
// array of Bar + Rule + Tick + Dot marks via `marks(...)`). There is no Box
// Mark class and no imperative `render()` method on this file, so there is
// nothing to port to JSX here. JSX rendering is handled by each underlying
// sub-mark's own `renderJSX` (Bar, Rule, Tick, Dot), ported in their respective
// units.

/** Options for the boxX mark. */
export type BoxXOptions = DotOptions & BarXOptions & TickXOptions & RuleXOptions;

/** Options for the boxY mark. */
export type BoxYOptions = DotOptions & BarYOptions & TickYOptions & RuleYOptions;

/**
 * Returns a box mark that draws horizontal boxplots where **x** is quantitative
 * or temporal and **y**, if present, is ordinal. The box mark is a compound
 * mark consisting of four marks:
 *
 * - a rule representing the extreme values (not including outliers),
 * - a bar representing the interquartile range (trimmed to the data),
 * - a tick representing the median value, and
 * - a dot representing outliers, if any.
 *
 * The given *options* are passed through to these underlying marks, with the
 * exception of the following options:
 *
 * - **fill** - the fill color of the bar; defaults to gray
 * - **fillOpacity** - the fill opacity of the bar; defaults to 1
 * - **stroke** - the stroke color of the rule, tick, and dot; defaults to *currentColor*
 * - **strokeOpacity** - the stroke opacity of the rule, tick, and dot; defaults to 1
 * - **strokeWidth** - the stroke width of the tick; defaults to 2
 */
// Returns a composite mark for producing a horizontal box plot, applying the
// necessary statistical transforms. The boxes are grouped by y, if present.
export function boxX(
  data?: Data,
  {
    x = identity,
    y = null,
    r,
    fill = "light-dark(#ccc, #555)",
    fillOpacity,
    stroke = "currentColor",
    strokeOpacity,
    strokeWidth = 2,
    sort,
    ...options
  }: BoxXOptions = {} as BoxXOptions
): CompoundMark {
  const group = y != null ? groupY : groupZ;
  return marks(
    ruleY(data, group({x1: loqr1, x2: hiqr2}, {x, y, stroke, strokeOpacity, ...options})),
    barX(data, group({x1: "p25", x2: "p75"}, {x, y, fill, fillOpacity, ...options})),
    tickX(data, group({x: "p50"}, {x, y, stroke, strokeOpacity, strokeWidth, sort, ...options})),
    dot(data, map({x: oqr}, {x, y, z: y, r, stroke, strokeOpacity, ...options} as any))
  );
}

/**
 * Returns a box mark that draws vertical boxplots where **y** is quantitative
 * or temporal and **x**, if present, is ordinal. The box mark is a compound
 * mark consisting of four marks:
 *
 * - a rule representing the extreme values (not including outliers),
 * - a bar representing the interquartile range (trimmed to the data),
 * - a tick representing the median value, and
 * - a dot representing outliers, if any.
 *
 * The given *options* are passed through to these underlying marks, with the
 * exception of the following options:
 *
 * - **fill** - the fill color of the bar; defaults to gray
 * - **fillOpacity** - the fill opacity of the bar; defaults to 1
 * - **stroke** - the stroke color of the rule, tick, and dot; defaults to *currentColor*
 * - **strokeOpacity** - the stroke opacity of the rule, tick, and dot; defaults to 1
 * - **strokeWidth** - the stroke width of the tick; defaults to 2
 */
// Returns a composite mark for producing a vertical box plot, applying the
// necessary statistical transforms. The boxes are grouped by x, if present.
export function boxY(
  data?: Data,
  {
    y = identity,
    x = null,
    r,
    fill = "light-dark(#ccc, #555)",
    fillOpacity,
    stroke = "currentColor",
    strokeOpacity,
    strokeWidth = 2,
    sort,
    ...options
  }: BoxYOptions = {} as BoxYOptions
): CompoundMark {
  const group = x != null ? groupX : groupZ;
  return marks(
    ruleX(data, group({y1: loqr1, y2: hiqr2}, {x, y, stroke, strokeOpacity, ...options})),
    barY(data, group({y1: "p25", y2: "p75"}, {x, y, fill, fillOpacity, ...options})),
    tickY(data, group({y: "p50"}, {x, y, stroke, strokeOpacity, strokeWidth, sort, ...options})),
    dot(data, map({y: oqr}, {x, y, z: x, r, stroke, strokeOpacity, ...options} as any))
  );
}

// A map function that returns only outliers, returning NaN for non-outliers
function oqr(values: any) {
  const r1 = loqr1(values);
  const r2 = hiqr2(values);
  return values.map((v: any) => (v < r1 || v > r2 ? v : NaN));
}

function loqr1(values: any): any {
  const lo = quartile1(values) * 2.5 - quartile3(values) * 1.5;
  return min(values as any[], (d: any) => (d >= lo ? d : NaN));
}

function hiqr2(values: any): any {
  const hi = quartile3(values) * 2.5 - quartile1(values) * 1.5;
  return max(values as any[], (d: any) => (d <= hi ? d : NaN));
}

function quartile1(values: any): any {
  return quantile(values, 0.25);
}

function quartile3(values: any): any {
  return quantile(values, 0.75);
}
