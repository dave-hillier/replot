import {createContext, useContext} from "react";
import type {MarkEventHandlers, MarkFactory} from "./useMark.js";

export interface Dimensions {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  facet?: {
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
  };
}

// Slim Plot context: just a registry. Marks are registered as opaque
// factories that build imperative Mark instances; <Plot> calls the imperative
// `plot()` to do all rendering.
//
// The value has two halves with different lifetimes:
//
//   - the registration API, whose identities are fixed for the life of the
//     <Plot>. A mark or scale calls it from its own layout effect, so a
//     registration is taken once the plot it belongs to has committed, and a
//     registry change is a state change on <Plot> rather than a write during
//     a render React may throw away (#148).
//   - the resolved values from the last computePlot() pass, which change
//     whenever the plot recomputes. <Plot> keeps its context value IDENTICAL
//     across renders and publishes these through accessors over a ref, so a
//     consumer re-renders when the plot shows it something new rather than
//     every time the plot re-renders for any reason at all — which is also
//     what stops StrictMode's simulated unmount from being survivable only by
//     accident (#148). They are accessors rather than their own context
//     because <Legend> reads them off this same value; a second context is
//     the shape to move to if legends ever need to subscribe to them.
export interface PlotContextValue {
  // True when this plot is being rendered where no effect will ever run — a
  // server render (renderToString/renderToStaticMarkup). Every registration
  // below is normally taken from a layout effect, which a server render does
  // not run, so on a server the components taking them hand them over while
  // they render instead, and <Replot> computes the plot in a render of its
  // own, after theirs (see useMark and ServerPlot for why that ordering is
  // sound rather than lucky). Set by <Replot> from the environment; every
  // browser render, including a hydrating one, leaves it false.
  readonly serverRender?: boolean;
  // Per-mark event handlers ride alongside the factory; their identities are
  // excluded from the stamp (like all functions), so a handler-identity
  // change refreshes the registration without a rebuild.
  registerMark: (id: string, stamp: string, factory: MarkFactory, handlers?: MarkEventHandlers) => void;
  // Removes a mark's registration; called from useMark's unmount cleanup.
  // Identity is stable across <Plot> renders.
  unregisterMark: (id: string) => void;
  // Scale components (<ScaleY>, <ScaleColor>, …) register their props here as
  // the corresponding plot-level scale option (like marks via registerMark);
  // <Plot> merges the registrations into the options passed to computePlot,
  // with explicit object-form props on <Plot> winning on conflict.
  registerScale?: (id: string, stamp: string, scaleName: string, config: Record<string, any>) => void;
  // Removes a scale registration; called from the scale component's unmount
  // cleanup. Identity is stable across <Plot> renders.
  unregisterScale?: (id: string) => void;
  // Explicit <Legend> descendants register their props here (like marks via
  // registerMark) so <Plot> can render them visibly in the figure slot no
  // matter how they're composed (memo, wrapper components, fragments).
  // Absent outside <Plot>, where <Legend> renders standalone.
  registerLegend?: (id: string, stamp: string, props: Record<string, any>) => void;
  // Removes a legend's registration; called from Legend's unmount cleanup.
  // Identity is stable across <Plot> renders.
  unregisterLegend?: (id: string) => void;
  // Resolved scale descriptors and render context from the parent Plot's
  // computePlot() pass. Populated after the first render; descendants like
  // <Legend scale="color"> read named scales out of this map. Read them during
  // render; they are not a subscription.
  readonly scaleDescriptors?: Record<string, any>;
  readonly context?: any;
  // Options passed to the parent <Plot> (used as defaults when resolving
  // scale-name legends, mirroring `exposeLegends(..., defaults)`).
  readonly plotOptions?: Record<string, any>;
}

export const PlotContext = createContext<PlotContextValue | null>(null);

export function usePlotContext(): PlotContextValue {
  const ctx = useContext(PlotContext);
  if (!ctx) throw new Error("Mark used outside <Plot>");
  return ctx;
}
