import * as pointer from "../../interactions/pointer.js";

// Replot-owned type sidecar for the three pure helpers extracted out of
// upstream's pointer closure in src/interactions/pointer.js, so that the
// imperative path and the React path share one implementation of the
// arithmetic and cannot drift.
//
// They are deliberately NOT declared in src/interactions/pointer.d.ts. That
// file is upstream's, so a future re-sync of it should be a zero-hunk diff;
// and src/replot.d.ts does `export * from "./interactions/pointer.js"`, so a
// declaration there would advertise these internals as part of the package's
// public type surface even though src/replot.ts exports only pointer, pointerX
// and pointerY at runtime. Upstream keeps such internals undeclared — which is
// why src/marks/tip.ts reaches anchorX/anchorY through an @ts-expect-error.
interface PointerInternals {
  /**
   * Returns the [*tx*, *ty*] correction to subtract from a pointer position to
   * convert it into the facet-local coordinates the mark's channel values use:
   * the facet translate, plus half a bandwidth for each band scale.
   */
  pointerOffsets(index: any, scales: any, dimensions: any): [number, number];

  /**
   * Returns the [*px*, *py*] accessors giving the target position of each
   * datum: the **px** and **py** channels, else the *x1*–*x2* and *y1*–*y2*
   * midpoints, else *x* and *y* (where *x* defaults to *x1*), else the mark's
   * frame anchor. An accessor returns undefined for a datum that lacks the
   * coordinate.
   */
  pointerAnchors(mark: any, values: any, dimensions: any): [(i: number) => number, (i: number) => number];

  /**
   * Returns the index *ii* of the datum closest to the already facet-corrected
   * pointer position (*xp*, *yp*) within *maxRadius*, or null, together with
   * its squared distance *ri* — unsquashed when **kx** or **ky** is not 1. A
   * miss reports *ri* as *maxRadius* squared.
   */
  pointerSearch(
    index: Iterable<number>,
    px: (i: number) => number,
    py: (i: number) => number,
    xp: number,
    yp: number,
    kx: number,
    ky: number,
    maxRadius: number,
    dimensions: any
  ): {ii: number | null; ri: number};
}

const {pointerAnchors, pointerOffsets, pointerSearch} = pointer as unknown as PointerInternals;

export {pointerAnchors, pointerOffsets, pointerSearch};
