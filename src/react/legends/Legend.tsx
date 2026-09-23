import React, {useContext, useId, useLayoutEffect} from "react";
import {rgb} from "d3";
import {type LegendScales} from "../../legends.js";
// These helpers live in the JS sources but aren't part of the public .d.ts.
import {createContext} from "../../context.js";
import {inherit, isScaleOptions} from "../../options.js";
import {normalizeScale} from "../../scales.js";
import {PlotContext, type PlotContextValue} from "../PlotContext.js";
import {stampOptions} from "../useMark.js";
import {Ramp} from "./Ramp.js";
import {ColorSwatches, Swatches, SymbolSwatches} from "./Swatches.js";

// The Legend façade renders entirely via the JSX path (<Ramp>, <Swatches>).
// Two ways to use it:
//   - Standalone: pass the scale spec via the matching key (e.g.,
//     `color={{...}}`); the dispatch picks the legend type from whichever
//     scale key is present (color, opacity, or symbol).
//   - Plot-scoped: nest inside a <Plot> and use `scale="<name>"` to resolve
//     a named scale from the parent's computed scaleDescriptors.
// `scale` is the second form's prop and not a scale of its own, so it is
// declared here rather than in LegendScales (which upstream's imperative
// legend() takes, and which has no plot to resolve a name against).
export type LegendProps = LegendScales & {scale?: string};

export function Legend(props: LegendProps) {
  const ctx = useContext(PlotContext);
  const id = useId();
  const register = ctx?.registerLegend;
  const unregister = ctx?.unregisterLegend;
  const serverRender = ctx?.serverRender;
  const registration = () => register?.(id, stampOptions("legend", null, props as Record<string, unknown>), props);
  // Inside a <Plot>, register instead of rendering: the Plot renders the
  // visible <LegendDisplay> in its figure slot, so a Legend is promoted no
  // matter how it's composed (memo, wrapper components, fragments).
  // Registration is effect-based, NOT render-phase: StrictMode's simulated
  // unmount runs the cleanup below without re-rendering, so a render-phase
  // registration would be lost; this depless effect re-registers every
  // commit, idempotently under the stable useId.
  // A server render registers while it renders instead, as marks and scales do
  // (useMark): no effect runs there, and an explicit legend that never
  // registers is a legend the figure slot never shows.
  if (serverRender) registration();
  useLayoutEffect(() => {
    // Unconditional, and never run on a server render; see useMark.
    if (serverRender) return;
    registration();
  });
  useLayoutEffect(() => {
    if (!unregister) return;
    return () => unregister(id);
  }, [unregister, id]);
  if (register) return null;
  return <LegendDisplay {...props} />;
}

// Visible half of <Legend>: dispatches to the JSX legend components. Rendered
// by <Plot> for registered legends and directly for standalone usage; it must
// not register, or the figure slot would recurse.
export function LegendDisplay(props: LegendProps) {
  const ctx = useContext(PlotContext);

  // If we're inside a Plot and the legend refers to a named scale, resolve
  // that scale from the parent's computed scaleDescriptors and route through
  // the JSX legend components — mirroring `exposeLegends`.
  const scaleName = (props as any)?.scale;
  const plotScaleElement =
    typeof scaleName === "string" && ctx?.scaleDescriptors && ctx.scaleDescriptors[scaleName]
      ? renderPlotScopedLegend(scaleName, props, ctx)
      : null;

  // JSX paths cover every shape: swatches first (ordinal/threshold color,
  // symbol, ordinal/threshold opacity), then ramp (continuous or banded
  // color/opacity). Plot-scoped legends take precedence.
  const swatchesElement = plotScaleElement === null && isSwatchesLegend(props) ? <Swatches {...props} /> : null;
  const rampElement = plotScaleElement === null && swatchesElement === null ? rampJSX(props as any) : null;
  const jsx = plotScaleElement ?? swatchesElement ?? rampElement;

  return <div className="plot-legend">{jsx}</div>;
}

// Standalone legend (Plot.legend(options)): dispatches the same swatches/ramp
// shapes as the <Legend> façade but returns the bare element (no plot-legend
// wrapper), matching the imperative legend() output. Returns null for identity
// or otherwise unrenderable scales; throws (at render time) for invalid swatches
// requests, mirroring the d3 legend builders.
export function renderStandaloneLegend(props: LegendScales): React.ReactElement | null {
  // Swatches() normalizes the scale internally, so call it directly (rather
  // than gating on isSwatchesLegend, which inspects the raw, un-normalized
  // type and misses e.g. {color: {domain: [...]}} ordinal scales). Fall back
  // to the ramp path when it declines.
  const swatches = Swatches(props);
  if (swatches != null) return swatches;
  return rampJSX(props as any);
}

// Renders a single named-scale legend (color/opacity/symbol) to a React
// element, mirroring exposeLegends() (src/legends.js): the per-call `options`
// override the plot's per-key defaults. Returns null for unknown/absent scales.
export function renderLegendElement(
  key: string,
  options: Record<string, any>,
  scaleDescriptors: any,
  context: any,
  plotOptions: any
): React.ReactElement | null {
  return renderPlotScopedLegend(key, {...options}, {scaleDescriptors, context, plotOptions} as PlotContextValue);
}

export function buildAutoLegends(scaleDescriptors: any, context: any, plotOptions: any): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  if (!scaleDescriptors) return out;
  const ctx = {scaleDescriptors, context, plotOptions} as PlotContextValue;
  let hasColor = false;
  for (const key of ["symbol", "color", "opacity"] as const) {
    if (!(key in scaleDescriptors)) continue;
    if (key === "color" && hasColor) continue;
    const o = inherit(plotOptions?.[key], {legend: plotOptions?.legend});
    if (!o.legend) continue;
    const el = renderPlotScopedLegend(key, {legend: o.legend}, ctx);
    if (el == null) continue;
    // A symbol legend whose stroke is bound to the color scale (the default
    // when fill is unset and a color scale exists) doubles as the color legend.
    if (key === "symbol" && plotOptions?.fill === undefined && isScaleOptions(plotOptions?.color)) hasColor = true;
    // Return the bare legend element (no plot-legend wrapper) to match the
    // imperative createLegends output, which appends svgs directly to <figure>.
    out.push(React.cloneElement(el, {key}));
  }
  return out;
}

// True when the legend props describe a swatches-style legend that the JSX
// `<Swatches>` component can render: any symbol scale, an ordinal-or-explicit
// "swatches" color scale, or an ordinal/threshold opacity scale (default
// "swatches"). All other shapes fall through to the ramp path.
function isSwatchesLegend(props: LegendScales): boolean {
  const p = props as any;
  if (isScaleOptions(p.symbol)) return true;
  if (isScaleOptions(p.color)) {
    const t = p.color.type;
    const explicit = p.legend !== undefined && p.legend !== true ? `${p.legend}`.toLowerCase() : null;
    if (explicit === "swatches") return true;
    if (explicit === "ramp") return false;
    return t === "ordinal" || t === "categorical";
  }
  if (isScaleOptions(p.opacity)) {
    const t = p.opacity.type;
    if (t !== "ordinal" && t !== "threshold") return false;
    const explicit = p.legend !== undefined && p.legend !== true ? `${p.legend}`.toLowerCase() : null;
    // Mirror legendOpacity: only ordinal opacity defaults to swatches; threshold
    // defaults to the ramp (handled by opacityRampJSX). Explicit "swatches" still
    // routes here for either type.
    if (explicit === "swatches") return true;
    return explicit === null && t === "ordinal";
  }
  return false;
}

// Resolves a ramp-eligible color/opacity legend to a <Ramp> element, or null
// if the legend props don't describe a ramp case (e.g., a swatches legend).
function rampJSX(props: Record<string, any>): React.ReactElement | null {
  if (isScaleOptions(props.color)) return colorRampJSX(props);
  if (isScaleOptions(props.opacity)) return opacityRampJSX(props);
  return null;
}

function colorRampJSX(props: Record<string, any>): React.ReactElement | null {
  const colorOpts = props.color;
  const normalized = normalizeScale("color", colorOpts);
  if (normalized.domain === undefined) return null; // no identity legend
  const legendKind = props.legend ?? true;
  const kind =
    legendKind === true ? (normalized.type === "ordinal" ? "swatches" : "ramp") : `${legendKind}`.toLowerCase();
  if (kind !== "ramp") return null;
  return rampElement(props, normalized, colorOpts);
}

function opacityRampJSX(props: Record<string, any>): React.ReactElement | null {
  const opacityOpts = props.opacity;
  const {type} = opacityOpts;
  const isBanded = type === "ordinal" || type === "threshold";
  // Mirror legendOpacity: ordinal opacity defaults to swatches (caught by
  // isSwatchesLegend), so the ordinal ramp requires explicit `legend: "ramp"`.
  // Threshold and continuous opacity default to the ramp.
  const explicit = props.legend !== undefined && props.legend !== true ? `${props.legend}`.toLowerCase() : null;
  const ordinalNeedsExplicit = type === "ordinal" && explicit !== "ramp";
  const wrongExplicit = explicit !== null && explicit !== "ramp";
  if (ordinalNeedsExplicit || wrongExplicit) return null;
  const normalized = normalizeScale("opacity", opacityOpts);
  if (normalized.domain === undefined) return null;
  // Mirror legendOpacity: continuous opacity becomes a color scale with an
  // rgba interpolator; banded opacity is drawn black-on-white under a flood
  // filter (rampWithFilter()). The ramp color is the top-level `color` option
  // (a plain color, not a scale spec), as in the imperative legendOpacity.
  const color = props.color ?? rgb(0, 0, 0);
  if (isBanded) {
    return rampElement(props, normalized, opacityOpts, {filterColor: `${rgb(color)}`});
  }
  if (!normalized.interpolate) return null; // unsupported continuous opacity
  return rampElement(props, {...normalized, interpolate: interpolateOpacity(color)}, opacityOpts);
}

function rampElement(
  props: Record<string, any>,
  normalized: any,
  opts: Record<string, any>,
  extra: {filterColor?: string} = {}
): React.ReactElement {
  const context = createContext(props);
  const {className, ...ctxRest} = context as any;
  const merged = inherit(
    props,
    {className, ...ctxRest},
    {label: opts.label, ticks: opts.ticks, tickFormat: opts.tickFormat}
  ) as any;
  // Keep `opacity` in the options: a numeric top-level opacity mutes the ramp
  // (Ramp reads it via maybeNumberChannel, which ignores scale-spec objects),
  // matching the imperative legendRamp which receives the whole options bag.
  const {legend: _legend, color: _color, ...options} = merged;
  return <Ramp scale={normalized} {...options} filterColor={extra.filterColor} />;
}

function interpolateOpacity(color: any): (t: number) => string {
  const {r, g, b} = rgb(color) || rgb(0, 0, 0);
  return (t: number) => `rgba(${r},${g},${b},${t})`;
}

// Resolves a named-scale legend (e.g. <Legend scale="color">) against the
// parent <Plot>'s computed scaleDescriptors and renders it via Ramp/Swatches.
// Mirrors `exposeLegends(scaleDescriptors, context, defaults)` from
// src/legends.js: it applies the same `inherit(options, context, defaults)`
// merge before dispatching to the right legend kind.
function renderPlotScopedLegend(
  key: string,
  props: Record<string, any>,
  ctx: PlotContextValue
): React.ReactElement | null {
  if (key !== "color" && key !== "opacity" && key !== "symbol") return null;
  const scale = ctx.scaleDescriptors![key];
  if (!scale) return null;
  const defaults = ctx.plotOptions?.[key];
  const {scale: _scale, ...rest} = props;
  const merged = legendOptions(ctx.context, defaults, rest);

  if (key === "symbol") {
    const resolve = (k: string) => ctx.scaleDescriptors?.[k] ?? null;
    return <SymbolSwatches scale={scale} resolve={resolve} {...merged} />;
  }

  if (key === "color") {
    if (scale.domain === undefined) return null;
    const {legend = true, ...rampOpts} = merged;
    const kind = legend === true ? (scale.type === "ordinal" ? "swatches" : "ramp") : `${legend}`.toLowerCase();
    if (kind === "swatches") return <ColorSwatches scale={scale} {...rampOpts} />;
    if (kind === "ramp") return <Ramp scale={scale} {...rampOpts} />;
    return null;
  }

  // key === "opacity"
  const {type, interpolate} = scale;
  const {legend = true, color = rgb(0, 0, 0), ...rest2} = merged;
  if (type === "ordinal" || type === "threshold") {
    // Mirror legendOpacity (src/legends.js): only ordinal defaults to
    // "swatches"; threshold defaults to the (filtered) ramp.
    const kind = legend === true ? (type === "ordinal" ? "swatches" : "ramp") : `${legend}`.toLowerCase();
    if (kind === "swatches") return <ColorSwatches scale={{...scale, color, key: "opacity"}} {...rest2} />;
    if (kind === "ramp") return <Ramp scale={scale} {...rest2} filterColor={`${rgb(color)}`} />;
    return null;
  }
  if (!interpolate) return null;
  const kind = legend === true ? "ramp" : `${legend}`.toLowerCase();
  if (kind !== "ramp") return null;
  return <Ramp scale={{...scale, interpolate: interpolateOpacity(color)}} {...rest2} />;
}

// Mirrors `legendOptions(context, scale, options)` from src/legends.js:
// merges (in order) the user-supplied `options`, the plot's render context
// (className + ambient defaults), and any label/ticks/tickFormat from the
// originating scale options.
function legendOptions(context: any, scale: any, options: any): any {
  if (!context) return {...options};
  const {className, ...rest} = context;
  const {label, ticks, tickFormat} = (scale ?? {}) as Record<string, any>;
  return inherit(options, {className, ...rest}, {label, ticks, tickFormat});
}
