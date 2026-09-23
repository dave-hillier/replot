import {cloneElement, createElement as h, Fragment, isValidElement, type ReactElement, type ReactNode} from "react";
import {
  renderMarksWith,
  isPointerConsumer,
  defaultPointerEventsNone,
  promoteFacetChild,
  plainIndex,
  plotStyleSheet,
  plotSvgAttributes,
  pointerIndex,
  type FacetCell
} from "./Replot.js";
import {createClipRegistry, registerClips, type ClipRegistry} from "./clip.js";
import {domToJsx, isDomNode} from "./domToJsx.js";
import {hasRenderTransform, renderTransformJSX} from "./renderTransform.js";

// Builds the <svg> React element for a computed plot without any hooks, so it
// can be serialized via renderToStaticMarkup for the imperative plot() entry
// point. There is no React root here, so no reconciler can re-render a mark
// after a pointer event and no commit owns the lifetime a listener would need:
// plot() is static-only by design (see its JSDoc in src/plot.ts), and this file
// is where a pointer transform loses its interactivity. Pointer-consumer marks
// (Tip, crosshair) therefore render empty, matching <MarkSlot>'s at-rest
// default.
//
// The returned <svg> does NOT carry the ⚠️ warning indicator: renderMarksWith
// invokes every mark's renderJSX eagerly, so the warnings those raise land in
// the global counter while this element is being built, and the caller has to
// drain afterwards (and after the legends, which can warn too) and append the
// indicator itself — see withWarningIndicator.
export function buildStaticPlotSvg(computed: any, classNameProp?: string): ReactElement {
  // The plot's context is handed to the registry so a mark that emits its own
  // <clipPath> defs (the difference mark) allocates its ids from this render's
  // counter rather than from style.js's module-global one — see
  // ClipRegistry.clipId.
  const clipReg = createClipRegistry(computed.context);
  registerClips(computed, clipReg);
  const marks = renderMarksWith(
    computed,
    (mark, index, values, dims, scales, context, key, _order, facetCell) =>
      staticRenderOne(mark, index, values, dims, scales, context, key, clipReg, facetCell),
    clipReg
  );
  // The shell is the one <PlotSvg> renders (plotSvgAttributes/plotStyleSheet in
  // Replot.tsx), so the two entry points cannot drift apart again. The style
  // option is not part of it: plot() applies that to the element it has built.
  return h(
    "svg",
    plotSvgAttributes(computed, classNameProp),
    h("style", null, plotStyleSheet(computed.className)),
    ...clipReg.defs,
    ...marks
  );
}

function staticRenderOne(
  mark: any,
  index: any,
  values: any,
  dims: any,
  scales: any,
  context: any,
  key: string,
  clipReg: ClipRegistry,
  facetCell?: FacetCell
): ReactNode {
  if (typeof mark.renderJSX !== "function") return null;
  // A pointer consumer renders at rest here — no pointer can reach a static
  // render — through the same substitution <PointerMarkSlot> makes when nothing
  // is hovered (pointerIndex).
  const arrayIndex = plainIndex(isPointerConsumer(mark) ? pointerIndex(index) : index);
  // A user render option (a render transform) executes against the
  // imperative contract, with the default renderJSX output supplied as
  // `next`.
  let jsx: ReactNode;
  if (hasRenderTransform(mark)) {
    jsx = renderTransformJSX(mark, arrayIndex, scales, values, dims, context);
  } else {
    jsx = mark.renderJSX(arrayIndex, scales, values, dims, context);
    // Function marks (wrapped by plot.ts's Render) may return a detached DOM
    // node (htl's svg`…`); convert it so React can render it.
    if (isDomNode(jsx)) jsx = domToJsx(jsx);
  }
  if (jsx == null) return null;
  // Static renders are never sticky, so pointer-driven marks always default
  // to pointer-events="none" (upstream's context.pointerSticky === false).
  if (isPointerConsumer(mark)) jsx = defaultPointerEventsNone(jsx);
  const node = clipReg ? clipReg.wrap(jsx as ReactElement, mark, dims, context) : jsx;
  // One facet of a promoted ARIA group (renderMarksWith's faceted branch). The
  // key goes on the mark's own node rather than on a <Fragment> wrapper,
  // because the walker adds no per-facet <g> here for it to key.
  if (facetCell !== undefined) {
    const child = promoteFacetChild(node, facetCell);
    return isValidElement(child) ? cloneElement(child as ReactElement, {key}) : child;
  }
  return h(Fragment, {key}, node);
}
