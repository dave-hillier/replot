// Legend stylesheets. The CSS lives here rather than inline in the legend
// components: a <style> block written inside a .tsx file is against the
// project's rules, and both legends need the same element. The rules stay a
// stylesheet because they are :where()-wrapped to keep zero specificity, so a
// page's own CSS can still override a legend — something inline styles cannot
// express — and because the selectors reach descendants (`.plot-swatch > svg`,
// the column and wrap layouts) that the container element does not own.
//
// The string is always built from a controlled className (maybeClassName) and
// constant CSS, never from user input.
import {createElement, type ReactElement} from "react";

/** Wraps legend CSS in the <style> element the legend renders with it. */
export function legendStyleSheet(css: string): ReactElement {
  return createElement("style", null, css);
}

/**
 * Ramp legend: makes the legend's <svg> block-level and keeps its tick labels
 * from wrapping. Mirrors the stylesheet the imperative ramp legend emitted.
 */
export function rampStyle(className: string): string {
  return `:where(.${className}-ramp) {
  display: block;
  height: auto;
  height: intrinsic;
  max-width: 100%;
  overflow: visible;
}
:where(.${className}-ramp text) {
  white-space: pre;
}`;
}

/**
 * Swatches legend: base rules for the wrapping <div> and its swatch <svg>s,
 * plus the layout rules for the requested variant.
 */
export function swatchesStyle(cls: string, layout: "columns" | "wrap"): string {
  const base = `:where(.${cls}-swatches) {
  font-family: system-ui, sans-serif;
  font-size: 10px;
  margin-bottom: 0.5em;
}
:where(.${cls}-swatch > svg) {
  margin-right: 0.5em;
  overflow: visible;
}
`;

  const columns = `:where(.${cls}-swatches-columns .${cls}-swatch) {
  display: flex;
  align-items: center;
  break-inside: avoid;
  padding-bottom: 1px;
}
:where(.${cls}-swatches-columns .${cls}-swatch::before) {
  flex-shrink: 0;
}
:where(.${cls}-swatches-columns .${cls}-swatch-label) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`;

  const wrap = `:where(.${cls}-swatches-wrap) {
  display: flex;
  align-items: center;
  min-height: 33px;
  flex-wrap: wrap;
}
:where(.${cls}-swatches-wrap .${cls}-swatch) {
  display: inline-flex;
  align-items: center;
  margin-right: 1em;
}`;

  return base + (layout === "columns" ? columns : wrap);
}
