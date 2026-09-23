import {useId, useLayoutEffect} from "react";
import {usePlotContext} from "../PlotContext.js";
import {stampOptions} from "../useMark.js";
import type {ChannelValue} from "../../channel.js";
import type {Data} from "../../mark.js";
import type {ScaleOptions} from "../../scales.js";
import type {ColorLegendOptions, OpacityLegendOptions, SymbolLegendOptions} from "../../legends.js";
import type {ProjectionOptions} from "../../projection.js";

// Scale components declare plot-level scale options as JSX:
//
//   <Plot>
//     <ScaleY grid type="log" label="Price" />
//     <ScaleColor scheme="warm" />
//     <Line data={data} x="date" y="price" stroke="city" />
//   </Plot>
//
// Each component renders null and registers its props with the enclosing
// <Plot> via PlotContext (like marks via useMark): registration is a layout
// effect, depless so it re-registers every commit, stamped by prop values so a
// change recomputes the plot, and removal is unmount-driven. <Plot> merges the
// registrations into the options passed to computePlot; an explicit
// object-form prop on <Plot> itself (e.g. y={{…}}) wins over the component on
// any conflicting key. The object-literal form remains supported.

export type ScaleXProps = ScaleOptions;
export type ScaleYProps = ScaleOptions;
export type ScaleColorProps = ScaleOptions & ColorLegendOptions;
export type ScaleOpacityProps = ScaleOptions & OpacityLegendOptions;
export type ScaleRProps = ScaleOptions;
export type ScaleSymbolProps = ScaleOptions & SymbolLegendOptions;
export type ScaleLengthProps = ScaleOptions;
export type ScaleFxProps = ScaleOptions;
export type ScaleFyProps = ScaleOptions;
export type ScaleProjectionProps = ProjectionOptions;

// Mirrors PlotFacetOptions from plot.d.ts, which the runtime plot.ts shadows
// and so cannot be imported here.
export interface ScaleFacetProps {
  /** data for top-level faceting */
  data?: Data;

  /** x channel for top-level faceting; implies fx scale */
  x?: ChannelValue;

  /** y channel for top-level faceting; implies fy scale */
  y?: ChannelValue;

  /** shorthand to set the same default for all four facet margins */
  margin?: number;

  /** the top facet margin in pixels */
  marginTop?: number;

  /** the right facet margin in pixels */
  marginRight?: number;

  /** the bottom facet margin in pixels */
  marginBottom?: number;

  /** the left facet margin in pixels */
  marginLeft?: number;

  /** default axis grid for fx and fy scales */
  grid?: ScaleOptions["grid"];

  /** default axis label for fx and fy scales */
  label?: ScaleOptions["label"];
}

// Shared registration: stamps the props by value — a function, interval, scale
// or other value the stamp cannot read by identity, exactly as mark stamps do
// (stampOptions) — and registers them under the plot-level option key.
// Registration is effect-based, NOT render-phase, for the reason spelled out in
// useMark: StrictMode's simulated unmount runs the cleanup below with no
// re-render to follow it, so a render-phase registration is simply lost. The
// depless effect re-registers every commit; a same-stamp re-registration only
// swaps the stored config in place so closures always see the latest props.
// A server render inverts that (nothing commits, so nothing can be lost) and
// registers while it renders — the same exception useMark takes, for the same
// reason: without it a server-rendered plot has no scale components in it.
function useScaleOption(scaleName: string, config: Record<string, any>): void {
  const id = useId();
  const {registerScale, unregisterScale, serverRender} = usePlotContext();
  const stamp = () => stampOptions(`scale:${scaleName}`, null, config);
  // A server render registers while it renders, for the reasons spelled out in
  // useMark: no effect runs there, so the effect below would never take the
  // registration and the scale option would be missing from the plot. The
  // order the registration lands in is tree order, which is what the compute
  // pass in <Replot> reads it in.
  if (serverRender) registerScale?.(id, stamp(), scaleName, config);
  useLayoutEffect(() => {
    // Unconditional (hooks are), and never run on a server render; see useMark.
    if (serverRender) return;
    registerScale?.(id, stamp(), scaleName, config);
  });
  // Removal is unmount-driven, mirroring useMark.
  useLayoutEffect(() => (unregisterScale ? () => unregisterScale(id) : undefined), [unregisterScale, id]);
}

export function ScaleX(props: ScaleXProps) {
  useScaleOption("x", props);
  return null;
}

export function ScaleY(props: ScaleYProps) {
  useScaleOption("y", props);
  return null;
}

export function ScaleColor(props: ScaleColorProps) {
  useScaleOption("color", props);
  return null;
}

export function ScaleOpacity(props: ScaleOpacityProps) {
  useScaleOption("opacity", props);
  return null;
}

export function ScaleR(props: ScaleRProps) {
  useScaleOption("r", props);
  return null;
}

export function ScaleSymbol(props: ScaleSymbolProps) {
  useScaleOption("symbol", props);
  return null;
}

export function ScaleLength(props: ScaleLengthProps) {
  useScaleOption("length", props);
  return null;
}

export function ScaleFx(props: ScaleFxProps) {
  useScaleOption("fx", props);
  return null;
}

export function ScaleFy(props: ScaleFyProps) {
  useScaleOption("fy", props);
  return null;
}

export function ScaleFacet(props: ScaleFacetProps) {
  useScaleOption("facet", props);
  return null;
}

export function ScaleProjection(props: ScaleProjectionProps) {
  useScaleOption("projection", props);
  return null;
}
