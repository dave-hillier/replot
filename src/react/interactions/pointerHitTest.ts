import {pointer as pointof} from "d3";
import {pointerAnchors, pointerOffsets, pointerSearch} from "./pointerUpstream.js";

// The pure hit-test half of the React pointer interaction: no React, no store,
// and no DOM beyond the single coordinate conversion in svgPoint. Every piece of
// arithmetic here comes from src/interactions/pointer.js, so the imperative
// pointer closure and the React path cannot drift apart.

/** The per-registration state that {@link nearest} needs to run a search. */
export interface HitTestTarget {
  index: ArrayLike<number> & Iterable<number>;
  px: (i: number) => number;
  py: (i: number) => number;
  tx: number;
  ty: number;
  kx: number;
  ky: number;
  maxRadius: number;
  dimensions: any;
}

/**
 * Precomputes everything about one rendered (mark, facet) that does not depend
 * on the pointer position: the facet and band-scale correction to subtract from
 * an event, and the two target-position accessors. Called once per registration
 * rather than once per pointer move.
 */
export function computeAnchors(
  mark: any,
  scales: any,
  values: any,
  dimensions: any,
  index: any
): {tx: number; ty: number; px: (i: number) => number; py: (i: number) => number} {
  const [tx, ty] = pointerOffsets(index, scales, dimensions);
  const [px, py] = pointerAnchors(mark, values, dimensions);
  return {tx, ty, px, py};
}

/**
 * Reads the *kx*, *ky* and *maxRadius* that the pointer transform stamped onto
 * the composed render function. They are otherwise trapped in the pointer
 * closure, which the React path never executes. The defaults match pointer()'s
 * own: isotropic distance within 40 pixels.
 */
export function pointerKOf(mark: any): {kx: number; ky: number; maxRadius: number} {
  const k = mark?.render?.pointerK;
  return {kx: k?.kx ?? 1, ky: k?.ky ?? 1, maxRadius: +(k?.maxRadius ?? 40)};
}

/**
 * Converts a pointer event into the SVG's own user coordinates. Upstream uses
 * d3.pointer, which is createSVGPoint + getScreenCTM().inverse() in a browser —
 * so the CSS scaling from Plot's injected max-width:100% cannot skew the hit
 * test — and falls back to getBoundingClientRect where no CTM is available, as
 * in jsdom.
 */
export const svgPoint = (svg: SVGSVGElement, event: any): [number, number] => pointof(event, svg) as [number, number];

/**
 * Runs upstream's search for one registration at the SVG-space point
 * (*x0*, *y0*), correcting the POINTER by the registration's facet and
 * band-scale offsets — the channel values are facet-local, so the event moves,
 * not the data. Returns an infinite radius when nothing is within maxRadius, so
 * that a miss can never win a group comparison.
 *
 * That Infinity is a DELIBERATE divergence from upstream, which reports a miss
 * as *maxRadius* squared and pools it alongside the hits (pointer.js:134-140):
 * a datum sitting at exactly maxRadius scores maxRadius squared too, and
 * upstream's `c.ri < best.ri` gives the tie to whichever entry the pool saw
 * first — so an earlier-registered MISS beats it and every pooled mark renders
 * nothing. Replot shows the datum instead. Pinned by "prefers a datum at
 * exactly maxRadius over an earlier registration that missed" in
 * test/pointer-store-test.ts, which is where a future upstream re-sync will
 * trip over it.
 */
export function nearest(reg: HitTestTarget, x0: number, y0: number): {ii: number | null; ri: number} {
  if (!reg.index.length) return {ii: null, ri: Infinity};
  const {ii, ri} = pointerSearch(
    reg.index,
    reg.px,
    reg.py,
    x0 - reg.tx,
    y0 - reg.ty,
    reg.kx,
    reg.ky,
    reg.maxRadius,
    reg.dimensions
  );
  return {ii, ri: ii == null ? Infinity : ri};
}
