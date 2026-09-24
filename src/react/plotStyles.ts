// The plot's own stylesheet. The CSS lives here rather than inline in a .tsx
// component: a <style> block written in a .tsx file is against the project's
// rules, and both render paths need the same element — this file's callers are
// Replot.tsx's <PlotSvg> and renderStatic.tsx's buildStaticPlotSvg.
//
// The rules are the plot's only forced CSS: they make the svg scale with its
// container and stop text being collapsed, all through :where() so the
// selectors carry no specificity a user's rules have to fight. The class name is
// the plot's (meant to be unique per plot); upstream writes the same two rules
// in style.js, with a comment that changing them means changing defaultClassName
// there too.
//
// The string is always built from a controlled className (maybeClassName) and
// constant CSS, never from user input.
import {createElement, type ReactElement} from "react";

/** The plot's stylesheet, as CSS text. */
export function plotStyleSheet(className: string): string {
  return `:where(.${className}) {
  --plot-background: white;
  display: block;
  height: auto;
  height: intrinsic;
  max-width: 100%;
}
:where(.${className} text),
:where(.${className} tspan) {
  white-space: pre;
}`;
}

/** Wraps the plot's stylesheet in the <style> element both paths render. */
export function plotStyleSheetElement(className: string): ReactElement {
  return createElement("style", null, plotStyleSheet(className));
}
