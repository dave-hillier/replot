import {nearest, svgPoint} from "./pointerHitTest.js";

// The registration and selection layer of the React pointer interaction. A
// plain object graph: no React import, no DOM beyond the event objects handed
// to it, and unit-testable on its own (test/pointer-store-test.ts).
//
// A registration is one rendered (mark, facet) pair — exactly upstream's
// renderIndex slot in src/interactions/pointer.js. Identity is the RECORD
// OBJECT, created once per slot instance, so there is no string key anywhere:
// two tips, or the two "crosshair rule" and two "crosshair text" sub-marks of a
// pair of crosshairs, cannot collide however they are labelled.

/** One slot's current selection: the focused index, and whether it is pinned. */
export interface PointerSelection {
  readonly i: number | null;
  readonly sticky: boolean;
}

/** The shared empty selection. Frozen and shared so identity is stable. */
export const NONE: PointerSelection = Object.freeze({i: null, sticky: false});

export interface Registration {
  /**
   * markIndex * 1000 + facetOrdinal. The registry is kept sorted by it so that
   * the two order-sensitive upstream behaviours — which mark's pooling infects
   * the plot, and which handler claims a pointerdown — are decided by render
   * order rather than by the order React happens to fire effects in.
   */
  order: number;
  mark: any;
  /** The facet index, or null when the mark is not faceted. */
  fi: number | null;
  index: number[];
  values: any;
  data: any;
  dimensions: any;
  context: any;
  kx: number;
  ky: number;
  maxRadius: number;
  tx: number;
  ty: number;
  px: (i: number) => number;
  py: (i: number) => number;
  /** Frozen; its identity changes only when the selection actually changes. */
  sel: PointerSelection;
  /** The rendered root element, for the click-inside-a-sticky-mark test. */
  root: Element | null;
  listeners: Set<() => void>;
  /** Stable and bound at creation, so useSyncExternalStore never resubscribes. */
  subscribe: (fn: () => void) => () => void;
  /** Stable. */
  getSnapshot: () => PointerSelection;
  /** Stable. Server and imperative plot() renders have no pointer. */
  getServerSnapshot: () => PointerSelection;
  /** Stable, so attaching it as a ref causes no detach/attach churn per commit. */
  rootRef: (el: Element | null) => void;
}

interface Hit {
  reg: Registration;
  ii: number | null;
  ri: number;
}

/** The single group every registration falls into when the plot pools. */
const GLOBAL = Symbol("pool");

export function createPointerStore() {
  let regs: Registration[] = [];
  let sticky = false;
  let onValue: (v: unknown) => void = () => {};
  let frame = 0;

  // Created during render (a useState initializer) and deliberately NOT added
  // to the registry here: `add` happens in a layout effect, once the record has
  // been filled in, so the store can never see a half-built record.
  function createRegistration(): Registration {
    const reg = {
      order: 0,
      mark: null,
      fi: null,
      index: [],
      values: null,
      data: null,
      dimensions: null,
      context: null,
      kx: 1,
      ky: 1,
      maxRadius: 40,
      tx: 0,
      ty: 0,
      px: () => NaN,
      py: () => NaN,
      sel: NONE,
      root: null,
      listeners: new Set<() => void>(),
      subscribe(fn: () => void) {
        reg.listeners.add(fn);
        return () => void reg.listeners.delete(fn);
      },
      getSnapshot: () => reg.sel,
      getServerSnapshot: () => NONE,
      rootRef: (el: Element | null) => void (reg.root = el)
    } as Registration;
    return reg;
  }

  /** Registers a filled-in record; returns its unregistration. */
  function add(reg: Registration): () => void {
    regs.push(reg);
    regs.sort((a, b) => a.order - b.order);
    return () => {
      regs = regs.filter((r) => r !== reg);
      // The record's `sel` is deliberately left ALONE. Unregistration is not
      // only a teardown: the registration effect re-runs whenever mark.filter
      // reallocates the index, which is most plot re-renders, so this cleanup
      // is the ordinary path for a slot that is about to re-register with the
      // very same record. Clearing here would destroy the selection on every
      // re-render, and while sticky it would leave {i: null, sticky: true} —
      // a state the plot cannot leave, because move() and leave() return on
      // sticky and down() returns because the claimant is no longer pointing.
      // A record that is genuinely gone is unreachable from `regs`, so nothing
      // can read its stale selection except its own slot, which is unmounting.
    };
  }

  // The bail-out that keeps a pointer move from re-rendering the plot: when the
  // selection is unchanged the record keeps the identical snapshot object, so
  // useSyncExternalStore short-circuits — and we do not even notify.
  function publish(reg: Registration, i: number | null): boolean {
    if (reg.sel.i === i && reg.sel.sticky === sticky) return false;
    reg.sel = i == null && !sticky ? NONE : (Object.freeze({i, sticky}) as PointerSelection);
    return true;
  }

  function notify(changed: readonly Registration[]): void {
    for (const reg of changed) for (const l of reg.listeners) l();
  }

  function datumOf(reg: Registration, i: number): unknown {
    const d = reg.data;
    return d == null ? null : Array.isArray(d) ? d[i] : typeof d.get === "function" ? d.get(i) : d[i];
  }

  // upstream pointer.js:130 — `const pool = state.pool ?? facetPool`, where
  // state.pool is built from `this.pool` of whichever pointer mark renders
  // FIRST and then applies to every later mark. That contagion is the
  // behaviour, not an accident: a pooled tip rendered first drags every other
  // pointer mark into its pool, while a crosshair rendered first leaves
  // everything independent.
  function globallyPooled(): boolean {
    return regs.length > 0 && regs[0].mark?.pool === true;
  }

  // upstream pointer.js:172 skips a mark's CLEARING dispatch when
  // facetPool.map.size > 1 — and facetPool.map gains an entry on every
  // pointermove, misses included (pointer.js:134), so that size counts the
  // facets of the mark that have ever been SEARCHED, not the ones currently
  // hitting. Every facet of a mark listens on the same <svg>, so for a
  // two-facet mark the size is 2 from the very first move onward: upstream
  // therefore essentially NEVER dispatches a clearing value for a faceted
  // mark, and svg.value keeps the stale datum until a different datum replaces
  // it. That looks like a bug and it is reproduced here on purpose — do not
  // "fix" it back to counting the facets that are currently hitting.
  //
  // The key is the slot's `order`, Replot's stand-in for upstream's
  // renderIndex, so the set does not retain unregistered records.
  const searchedFacets = new Map<any, Set<number>>();

  // upstream pointer.js:130 again: a facetPool is only ever WRITTEN when the
  // plot is not globally pooled, because `state.pool ?? facetPool` resolves to
  // state.pool in that case and facetPool.map stays empty — size 0, so the
  // skip never applies.
  function markSearchedFacets(hits: readonly Hit[]): void {
    if (globallyPooled()) return;
    for (const h of hits) {
      if (h.reg.fi == null) continue;
      let searched = searchedFacets.get(h.reg.mark);
      if (searched === undefined) searchedFacets.set(h.reg.mark, (searched = new Set<number>()));
      searched.add(h.reg.order);
    }
  }

  /** Whether upstream would suppress this record's clearing dispatch. */
  function suppressesClearingDispatch(reg: Registration): boolean {
    if (reg.fi == null || globallyPooled()) return false;
    return (searchedFacets.get(reg.mark)?.size ?? 0) > 1;
  }

  // Upstream dispatches through context.dispatchValue (plot.ts:189-194), which
  // compares by reference so that re-entering the same datum never re-fires;
  // the React prop is called alongside it.
  //
  // onValue is called unconditionally beside it, so with two pointer consumers
  // changing in one move the React prop fires twice where the DOM's `input`
  // event fires once. Deliberately left as-is here: work item W6 owns value
  // dispatch end to end and must decide whether the prop follows the DOM
  // contract (dedupe by reference, one call per distinct value per move) or
  // the per-registration one. The case it has to cover is a pooled tip plus a
  // crosshair over the same datum: one move, two records changing.
  function dispatch(reg: Registration, value: unknown): void {
    reg.context?.dispatchValue?.(value);
    onValue(value);
  }

  // One pass over every registration, then upstream's exclusivity rules. This
  // is the single-pass replacement for upstream's second animation frame: one
  // listener sees every slot, so exclusivity resolves within the move-coalescing
  // frame instead of a frame later. Identical steady state, one fewer frame.
  function select(x: number, y: number): void {
    // Defensive, and the invariant's real home: a selection must never be
    // written while sticky. move() already guards, but a pointerdown can land
    // in the same task as a pointermove whose frame is still pending, and the
    // selection is written HERE. (down() cancels that frame as well.)
    if (sticky) return;

    const hits: Hit[] = regs.map((reg) => ({reg, ...nearest(reg, x, y)}));
    markSearchedFacets(hits);

    const globalPool = globallyPooled();
    const groupOf = (reg: Registration): unknown => (globalPool ? GLOBAL : reg.fi != null ? reg.mark : reg);

    const best = new Map<unknown, Hit>();
    for (const h of hits) {
      if (h.ii == null) continue;
      const g = groupOf(h.reg);
      const cur = best.get(g);
      // Strictly less-than, scanning in `order`: the first entry wins a tie.
      if (cur === undefined || h.ri < cur.ri) best.set(g, h);
    }

    const changed: Registration[] = [];
    for (const h of hits) {
      const win = best.get(groupOf(h.reg)) === h ? h.ii : null;
      if (publish(h.reg, win)) changed.push(h.reg);
    }

    // pointer.js:172 — upstream's stated intent is that when simultaneously
    // leaving one facet and entering another, the entering facet's dispatch
    // wins; slot order then gives its last writer. See
    // suppressesClearingDispatch for how much wider the rule it actually wrote
    // is, and why that width is reproduced.
    for (const reg of changed) {
      const i = reg.sel.i;
      if (i == null && suppressesClearingDispatch(reg)) continue;
      dispatch(reg, i == null ? null : datumOf(reg, i));
    }

    notify(changed);
  }

  function clear(): void {
    const changed = regs.filter((r) => publish(r, null));
    for (const reg of changed) {
      // The same upstream skip as in select(): pointerleave runs
      // update(null) → render(null) (pointer.js:200/134), which reaches the
      // very same facetPool.map.size test at pointer.js:172.
      if (suppressesClearingDispatch(reg)) continue;
      dispatch(reg, null);
    }
    // …and then records the facets as searched, exactly as update() does: the
    // pool.map write at pointer.js:134 runs AFTER the render(null) above, so
    // the leaving facets do not suppress their own clearing dispatch but do
    // count towards every later one. Marking here rather than at the top of
    // clear() is therefore load-bearing, and every registration is marked —
    // update() writes the map for a facet whose render() bailed out early too.
    markSearchedFacets(regs.map((reg) => ({reg, ii: null, ri: Infinity})));
    notify(changed);
  }

  return {
    createRegistration,
    add,

    /** Sets the callback backing the <Plot onValue> prop. */
    setOnValue(fn: (v: unknown) => void): void {
      onValue = fn;
    },

    get sticky(): boolean {
      return sticky;
    },

    move(svg: SVGSVGElement, event: any): void {
      if (sticky) return;
      if (event.pointerType === "mouse" && event.buttons === 1) return; // dragging
      const [x, y] = svgPoint(svg, event);
      // Coalesce: only the last move of a frame is searched.
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        select(x, y);
      });
    },

    leave(event: any): void {
      if (event.pointerType !== "mouse") return;
      if (sticky) return;
      if (frame) cancelAnimationFrame(frame), (frame = 0);
      clear();
    },

    // upstream pointer.js:188-196. The `handledEvents` WeakSet means the
    // FIRST-registered handler claims the pointerdown and its own `i` decides —
    // including the case where it is not pointing, in which case nothing
    // toggles even though another mark is.
    down(event: any): void {
      if (event.pointerType !== "mouse") return;
      const claimant = regs[0];
      if (!claimant || claimant.sel.i == null) return; // not pointing
      // A click inside an already-rendered sticky root keeps it sticky; this is
      // what makes a sticky tip's text selectable.
      if (sticky && regs.some((r) => r.root?.contains(event.target as Node))) return;
      // A pointermove and a pointerdown arrive in the same task on an ordinary
      // click, so the move's coalescing frame is still pending here. Cancel it
      // exactly as leave() does: were it allowed to run afterwards it would
      // re-publish every non-claimant with the new sticky flag and re-dispatch
      // its value, when upstream re-renders the claiming slot only.
      if (frame) cancelAnimationFrame(frame), (frame = 0);
      if (sticky) {
        sticky = false;
        clear();
      } else {
        sticky = true;
        // Upstream re-renders only the claiming slot (pointer.js:195); the
        // other slots keep their stale DOM, so do not republish them.
        if (publish(claimant, claimant.sel.i)) notify([claimant]);
      }
    },

    dispose(): void {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

export type PointerStore = ReturnType<typeof createPointerStore>;
