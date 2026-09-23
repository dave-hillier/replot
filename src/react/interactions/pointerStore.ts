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
   * The slot's render order: `markIndex * facetCount + facetOrdinal`, so that
   * it is strictly increasing in document order and — unlike a fixed stride —
   * cannot collide however many facets a plot has. The registry is kept sorted
   * by it so that the two order-sensitive upstream behaviours — which mark's
   * pooling infects the plot, and which handler claims a pointerdown — are
   * decided by render order rather than by the order React fires effects in.
   */
  order: number;
  mark: any;
  /** The facet index, or null when the mark is not faceted. */
  fi: number | null;
  index: number[];
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

/** A pointer position in the svg's own user space. */
interface Point {
  readonly x: number;
  readonly y: number;
}

export function createPointerStore() {
  let regs: Registration[] = [];
  let onValue: (v: unknown) => void = () => {};
  let frame = 0;

  // WHERE THE POINTER IS. This is the whole of what survives a plot recompute,
  // and it is the reason nothing else has to.
  //
  // A selection is an INDEX into channel arrays that the next recompute
  // reallocates, so a record that keeps one across re-registration is holding a
  // number whose meaning has expired. Five rounds of this port tried to
  // VALIDATE that number on the way back in — index membership, then the data
  // array's reference, then the datum's own identity — and each proxy for
  // "still the same datum" broke a legitimate case: membership silently
  // re-points the tip at a neighbour when an earlier datum is deleted; the
  // array reference dies on every controlled plot, whose parent hands the mark
  // a fresh array on the very render the selection caused; and datum identity
  // dies under groupX, binX and stackY, which synthesise new datum objects on
  // every recompute, and under any mark whose rows are derived in render.
  //
  // The premise was wrong. Upstream never validates anything because its
  // focused index lives in the same closure as its listeners: rebuild the mark
  // and the index goes with it. Replot separated them, and re-linking them by
  // identity cannot work, because after a transform there IS no identity to
  // link.
  //
  // So the store remembers the pointer instead of the selection. When the
  // registry changes, settle() re-runs the ordinary hit test at this point
  // against the NEW index, values and anchors — exactly what a pointermove
  // would do — and whatever is under the pointer now becomes the selection.
  // Transforms, derived rows, reorders, insertions, deletions and filters all
  // need no special case, because none of them move the pointer.
  //
  // null before the pointer has ever entered the plot, and again after it has
  // left: in both states there is nothing under the pointer to re-resolve, and
  // a stale point would let a recompute conjure a selection the user is not
  // pointing at. It is deliberately NOT cleared while sticky (leave() returns
  // early there), because a pin is a pin on the place the pointer was when it
  // was taken.
  let last: Point | null = null;

  // Set by add() and by unregistration, cleared by settle(). The registry
  // changes many times within one commit — React runs every layout-effect
  // cleanup before any of the creates — so re-resolving inside add() would
  // arbitrate against a half-populated registry and dispatch values for
  // winners that lose again microseconds later. settle() is called once, by
  // <Replot>, after the whole commit has registered.
  let dirty = false;

  // Records whose registration was torn down since the last settle(). Most of
  // them are re-registrations of the very same record and are back in `regs`
  // by the time settle() looks; the ones that are not are slots that have
  // UNMOUNTED, and a record that unmounts still holding a selection is the
  // plot ceasing to show a datum, which has to be reported.
  const departed: Registration[] = [];

  // The plot's sticky modality is DERIVED from the registered records rather
  // than kept as a flag of its own, and that is what makes it impossible to
  // wedge. Only the record that CLAIMED the pointerdown carries sticky in its
  // selection — down() republishes the claimant alone (pointer.js:195) — so
  // asking the registry is asking the owner. A flag would have exactly one way
  // to be released, a gesture on the owner, and a record that unmounts and
  // never comes back makes no gesture: the flag would stay raised with nobody
  // holding it, and move(), leave() and down() would then all return early
  // forever (move and leave on sticky, down because the claimant is gone from
  // `regs` and whoever is now first is not pointing). Derived, the pin simply
  // ceases to exist when its owner leaves the registry or loses its selection,
  // and it comes back with the record when a slot re-registers mid-commit.
  function isSticky(): boolean {
    for (const reg of regs) if (reg.sel.sticky) return true;
    return false;
  }

  // Created during render (a useState initializer) and deliberately NOT added
  // to the registry here: `add` happens in a layout effect, once the record has
  // been filled in, so the store can never see a half-built record.
  function createRegistration(): Registration {
    const reg = {
      order: 0,
      mark: null,
      fi: null,
      index: [],
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
    dirty = true;
    return () => {
      regs = regs.filter((r) => r !== reg);
      departed.push(reg);
      dirty = true;
      // The record's `sel` is deliberately left ALONE here. Unregistration is
      // not only a teardown: the registration effect re-runs whenever
      // mark.filter reallocates the index, which is every plot recompute, so
      // this cleanup is the ordinary path for a slot that is about to
      // re-register with the very same record. Clearing here would blank the
      // tip on every recompute, and would do it BEFORE the new index exists to
      // re-resolve against. settle() decides, once the commit is over: a
      // record that came back is re-resolved at the pointer like every other,
      // and one that did not is cleared and reported.
    };
  }

  /**
   * Re-resolves the whole registry after a commit that changed it.
   *
   * Called once per commit by <Replot>, from a layout effect that runs AFTER
   * every slot's own — React runs layout effects child first — and after the
   * plot's root element has been attached to the context's figure holder. Both
   * orderings are load-bearing: re-resolving inside add() would arbitrate
   * against the half-populated registry a commit passes through, and
   * dispatching before the holder is filled would report a value to nothing.
   *
   * Three things happen, in this order:
   *
   *   1. every record that unmounted is cleared. Its slot is gone, so the plot
   *      has stopped SHOWING that datum; it must stop REPORTING it too, or the
   *      duplicate-value guard below stays poisoned with a datum nothing draws
   *      and swallows the next genuine selection of it.
   *   2. the survivors are re-resolved at the last pointer position, which is
   *      an ordinary hit test — the same arbitration, the same pooling, the
   *      same publish and dispatch rules as a pointermove. An index that went
   *      empty, a mark that lost its data, a datum that moved: all of them are
   *      just "what is under the pointer now", and the answer may be nothing.
   *   3. and if the plot is now showing nothing at all while still reporting
   *      something, it reports the clearing value. This is the invariant the
   *      whole exercise is about — show and report cannot disagree — and it is
   *      stated here rather than left to the per-record dispatches above,
   *      because those reproduce upstream's faceted suppression quirk (see
   *      suppressesClearingDispatch) and a suppressed clearing would otherwise
   *      leave the guard holding a vanished datum for good.
   *
   * Nothing is dispatched for a record whose selection did not change, which is
   * what stops a controlled plot from oscillating: re-resolving at an unmoved
   * pointer picks the same index it picked before, publish() returns false, and
   * the render that the last onValue caused reports nothing new. The cost of
   * that rule is stated where it bites, in the note on publish().
   */
  function settle(): void {
    if (!dirty) return;
    dirty = false;
    const gone = departed.filter((reg) => !regs.includes(reg));
    departed.length = 0;
    const cleared = gone.filter((reg) => publish(reg, null));
    if (last !== null) resolve(last.x, last.y);
    void cleared;
    // The departed records' own subscribers, for the one path that unregisters
    // without unmounting: a slot whose index went null re-runs its effect and
    // takes the early return, so it is still listening.
    notify(cleared);
  }

  // The bail-out that keeps a pointer move from re-rendering the plot: when the
  // selection is unchanged the record keeps the identical snapshot object, so
  // useSyncExternalStore short-circuits — and we do not even notify.
  // `sticky` is passed rather than read off the store: select() and clear()
  // only ever run when the plot is NOT sticky (both guard on it), and the one
  // place that sets a pin is down(), which sets it on the claimant alone.
  //
  // The selection is the INDEX and the pin, and nothing else — no datum, no
  // provenance. That is what makes the re-resolution in settle() total: there
  // is no stored fact about the old data that a transform could invalidate.
  // Its one cost is that a record which re-resolves to the same index after a
  // recompute does not change, so nothing is dispatched, and a mark whose rows
  // are rebuilt per recompute (groupX, binX, `data={rows.map(d => ({...d}))}`)
  // goes on reporting the row object it reported before while drawing an equal
  // but freshly minted one. Dispatching on the datum's identity instead would
  // close that and open something far worse: in a controlled plot each report
  // re-renders the parent, which rebuilds the rows, which changes the identity
  // again — an unbounded render loop, on precisely the shape this design exists
  // to serve.
  function publish(reg: Registration, i: number | null, sticky = false): boolean {
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
  // Set members are facet indices (`fi`), which are unique within a mark and
  // are plain numbers, so the set retains neither records nor elements.
  const searchedFacets = new Map<any, Set<number>>();

  // useMark rebuilds its mark instances on every stamp change, so a pointer
  // plot bound to changing data walks through a fresh mark object per
  // recompute; keying a plain Map on them would accumulate one dead Set per
  // mark for the life of the plot. Pruning at EVENT time rather than at
  // unregistration is what keeps the persistence semantics intact: within one
  // commit React runs every layout-effect cleanup before any of the creates, so
  // a mark is briefly absent from `regs` while its own slots re-register, and
  // dropping its set there would reset the quirk below on every re-render. No
  // event can arrive mid-commit, so at this point `regs` is complete and a mark
  // missing from it is genuinely gone.
  function pruneSearchedFacets(): void {
    if (searchedFacets.size === 0) return;
    const live = new Set(regs.map((reg) => reg.mark));
    for (const mark of [...searchedFacets.keys()]) if (!live.has(mark)) searchedFacets.delete(mark);
  }

  // upstream pointer.js:130 again: a facetPool is only ever WRITTEN when the
  // plot is not globally pooled, because `state.pool ?? facetPool` resolves to
  // state.pool in that case and facetPool.map stays empty — size 0, so the
  // skip never applies.
  function markSearchedFacets(hits: readonly Hit[]): void {
    pruneSearchedFacets();
    if (globallyPooled()) return;
    for (const h of hits) {
      if (h.reg.fi == null) continue;
      let searched = searchedFacets.get(h.reg.mark);
      if (searched === undefined) searchedFacets.set(h.reg.mark, (searched = new Set<number>()));
      searched.add(h.reg.fi);
    }
  }

  /** Whether upstream would suppress this record's clearing dispatch. */
  function suppressesClearingDispatch(reg: Registration): boolean {
    if (reg.fi == null || globallyPooled()) return false;
    return (searchedFacets.get(reg.mark)?.size ?? 0) > 1;
  }

  // The value the plot is currently reporting. Upstream keeps this state on the
  // element itself — context.dispatchValue (plot.ts:189-194) returns early when
  // `figure.value === value` — so the guard is per PLOT, not per registration,
  // and that is the whole of the viewof contract: a plot whose tip, crosshair
  // rule and crosshair text all move onto the same datum in one pointermove
  // reports ONE change, not one per consumer. Mirroring it here rather than
  // relying on dispatchValue's own check is what lets the React prop obey the
  // identical rule; the two cannot drift, because dispatchValue is the only
  // thing that ever writes figure.value.
  //
  // `undefined` initially, exactly as an untouched element's `.value` is, so
  // the first selection — a datum or a null — always reports.
  let lastValue: unknown = undefined;

  // The DOM half of the contract, installed by <Replot> once per commit and
  // resolved through the plot's CURRENT context. Per-plot rather than
  // per-record because the value is per-plot: a record's own context is the one
  // it registered under, and the two places a clearing value has to be reported
  // are exactly the two where that context is the wrong one — a slot that has
  // unmounted holds the previous recompute's context, and a commit that swaps
  // the root between a bare <svg> and a <figure> replaces the figure holder
  // that context dispatches through, so the report would land on an element the
  // plot no longer uses, or on none at all.
  //
  // null in the store's own unit tests, which drive records with no plot around
  // them; the record's context is the fallback there.
  let valueSink: ((value: unknown) => void) | null = null;

  function dispatch(value: unknown, reg?: Registration): void {
    if (value === lastValue) return;
    lastValue = value;
    // Assigns `figure.value` and dispatches a bubbling `input` event, for
    // viewof and for plain addEventListener users.
    (valueSink ?? reg?.context?.dispatchValue)?.(value);
    // …and the React half. <Replot> has no onInput wiring on the <svg>, so the
    // prop is called here and only here, and cannot fire twice.
    onValue(value);
  }

  // The move path: a search, then upstream's exclusivity rules.
  function select(x: number, y: number): void {
    // Defensive, and the invariant's real home: a selection must never be
    // written by a MOVE while sticky. move() already guards, but a pointerdown
    // can land in the same task as a pointermove whose frame is still pending,
    // and the selection is written HERE. (down() cancels that frame as well.)
    if (isSticky()) return;
    resolve(x, y);
  }

  // One pass over every registration, then upstream's exclusivity rules. This
  // is the single-pass replacement for upstream's second animation frame: one
  // listener sees every slot, so exclusivity resolves within the move-coalescing
  // frame instead of a frame later. Identical steady state, one fewer frame.
  //
  // Both entry points run it: a pointer move, and settle()'s re-resolution of a
  // recomputed plot at the unmoved pointer. There is deliberately no difference
  // between them — that is the design. The one thing settle() needs that a move
  // does not is the pin below, because a move cannot happen while pinned.
  function resolve(x: number, y: number): void {
    // A PIN IS A PIN ON A PLACE. The user pinned the datum that was under the
    // pointer, so re-resolving at that same point and handing the pin back to
    // the record that held it is what keeps the pin meaning what it meant: an
    // unrelated re-render leaves it exactly where it was, and a recompute that
    // moves the data under it moves the pinned tip with them rather than
    // leaving it stranded on an index that now names something else.
    //
    // The pin is released — `win == null` below — when nothing is under the
    // pointer any more. It has to be: a sticky selection with no index would
    // make isSticky() true with nothing to show, and move(), leave() and down()
    // all return early on sticky, so the plot could never be recovered.
    const pinned = regs.find((reg) => reg.sel.sticky);

    const hits: Hit[] = regs.map((reg) => ({reg, ...nearest(reg, x, y)}));
    markSearchedFacets(hits);

    const globalPool = globallyPooled();
    const groupOf = (reg: Registration): unknown => (globalPool ? GLOBAL : reg.fi != null ? reg.mark : reg);

    // MISSES COMPETE. upstream's update() writes every result into the pool,
    // hit or miss (pointer.js:134), scores a miss at maxRadius squared, and
    // picks the winner with `if (!best || c.ri < best.ri)` over the whole map
    // (pointer.js:139) — no skip. So a miss can be the winner, and because the
    // final loop renders `c === best ? c.ii : null` with best.ii null, a
    // winning miss blanks every member of its group. Excluding misses here (as
    // an earlier revision did) makes a group show its nearest datum wherever
    // upstream shows nothing: over a faceted anisotropic mark a differential
    // oracle put that at a third of the frame.
    const best = new Map<unknown, Hit>();
    for (const h of hits) {
      const g = groupOf(h.reg);
      const cur = best.get(g);
      // Strictly less-than, scanning in `order`: the first entry wins a tie.
      if (cur === undefined || h.ri < cur.ri) best.set(g, h);
    }

    const changed: Registration[] = [];
    for (const h of hits) {
      const winner = best.get(groupOf(h.reg));
      // `winner.ii` rather than `h.ii`: when the winner is a miss, every member
      // of the group renders nothing, the winner included.
      const win = winner === h ? winner.ii : null;
      if (publish(h.reg, win, h.reg === pinned && win != null)) changed.push(h.reg);
    }

    // pointer.js:172 — upstream's stated intent is that when simultaneously
    // leaving one facet and entering another, the entering facet's dispatch
    // wins; slot order then gives its last writer. See
    // suppressesClearingDispatch for how much wider the rule it actually wrote
    // is, and why that width is reproduced.
    for (const reg of changed) {
      const i = reg.sel.i;
      if (i == null && suppressesClearingDispatch(reg)) continue;
      dispatch(i == null ? null : datumOf(reg, i), reg);
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
      dispatch(null, reg);
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
    settle,

    /**
     * How many marks currently have a retained searched-facet set. Exposed for
     * the leak test in test/pointer-store-test.ts: the count is bounded by the
     * marks that are actually registered, never by how many times the plot has
     * recomputed.
     */
    retainedSearchedMarks(): number {
      return searchedFacets.size;
    },

    /** Sets the callback backing the <Plot onValue> prop. */
    setOnValue(fn: (v: unknown) => void): void {
      onValue = fn;
    },

    /**
     * Sets the plot-level sink for the DOM half of the value contract — the
     * current context's dispatchValue, which assigns `.value` on the plot's
     * root and fires the bubbling `input` event there. <Replot> installs it
     * once per commit, from the same layout effect that fills the figure holder
     * and calls settle(), so that a report made during that settle lands on the
     * element the plot is using NOW.
     */
    setValueSink(fn: ((value: unknown) => void) | null): void {
      valueSink = fn;
    },

    get sticky(): boolean {
      return isSticky();
    },

    move(svg: SVGSVGElement, event: any): void {
      if (isSticky()) return;
      if (event.pointerType === "mouse" && event.buttons === 1) return; // dragging
      const [x, y] = svgPoint(svg, event);
      // Recorded at EVENT time, not in the frame below: the frame is coalesced
      // and may be discarded, but the pointer really is here, and a recompute
      // arriving before the frame runs must re-resolve against the newest
      // position rather than the last one that happened to be searched.
      last = {x, y};
      // Coalesce: only the last move of a frame is searched.
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        select(x, y);
      });
    },

    leave(event: any): void {
      if (event.pointerType !== "mouse") return;
      if (isSticky()) return;
      if (frame) cancelAnimationFrame(frame), (frame = 0);
      // FORGET WHERE THE POINTER WAS. The point outlives the selection
      // everywhere else, but not here: the pointer is outside the plot, so a
      // recompute must not re-resolve at the place it left through and hand a
      // datum to a user who is no longer pointing at anything. Cleared before
      // clear() only for symmetry with move(); nothing between them can read it.
      last = null;
      clear();
    },

    // upstream pointer.js:188-196. The `handledEvents` WeakSet means the
    // FIRST-registered handler claims the pointerdown and its own `i` decides —
    // including the case where it is not pointing, in which case nothing
    // toggles even though another mark is. `regs[0]` models that.
    //
    // But "first-registered" is only half of upstream's rule, because upstream
    // has an invariant it never has to state: WHENEVER THERE IS A PIN, THE
    // FIRST LISTENER IS THE RECORD HOLDING IT. Its listeners and its focused
    // index live together in one closure per mark, and its set of listeners is
    // fixed for the life of a render — a pin can only be taken while the first
    // listener was pointing (this very guard), pointermove returns early while
    // sticky so that `i` cannot move underneath it, and nothing can register in
    // front of it meanwhile. So upstream never has to choose between the two.
    //
    // Here the registry is React's, and it gains members under a live pin:
    // toggle a <Crosshair> on, or give an earlier mark a tip, and regs[0] is
    // suddenly a record that has never pointed. Reading first-registered
    // literally then returns at the guard below while isSticky() stays true —
    // the pin holder is still registered — and move() and leave() both return
    // early on sticky. No gesture could ever recover the plot: it is pinned for
    // good on a datum nobody can unpin.
    //
    // So the claimant is the pin holder while there is a pin, and regs[0]
    // otherwise. That is not a divergence: it is upstream's own rule restated
    // over a registry that can change membership, and the two agree in every
    // state upstream can reach. A pointerdown while pinned must always be able
    // to unpin.
    down(event: any): void {
      if (event.pointerType !== "mouse") return;
      const claimant = regs.find((r) => r.sel.sticky) ?? regs[0];
      if (!claimant || claimant.sel.i == null) return; // not pointing
      const sticky = isSticky();
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
        // clear() publishes every record unsticky, the claimant included, so
        // the modality goes with the pin that was holding it.
        clear();
      } else {
        // Upstream re-renders only the claiming slot (pointer.js:195); the
        // other slots keep their stale DOM, so do not republish them.
        if (publish(claimant, claimant.sel.i, true)) notify([claimant]);
      }
    },

    dispose(): void {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

export type PointerStore = ReturnType<typeof createPointerStore>;
