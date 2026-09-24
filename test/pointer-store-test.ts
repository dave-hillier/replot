import assert from "assert";
import {computeAnchors, nearest, pointerKOf} from "../src/react/interactions/pointerHitTest.js";
import {
  createPointerStore,
  NONE,
  type PointerStore,
  type Registration
} from "../src/react/interactions/pointerStore.js";

// The store's semantics, driven directly with hand-built registration records:
// no React and no jsdom, because every rule being pinned here (arbitration,
// pooling, sticky, notification) is a property of the object graph rather than
// of any rendering. The React wiring is exercised separately.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DIMS = {width: 200, height: 200, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0};

// d3.pointer falls back to getBoundingClientRect when the node has no
// createSVGPoint, so an SVG-shaped object with an origin at (0, 0) makes
// clientX/clientY the SVG coordinates directly.
const SVG = {
  getBoundingClientRect: () => ({left: 0, top: 0}),
  clientLeft: 0,
  clientTop: 0
} as unknown as SVGSVGElement;

// A queueing requestAnimationFrame, installed for this file only. It must be a
// queue rather than a synchronous shim: the store cancels the previous frame on
// every move, and a synchronous shim would run searches the real implementation
// discards.
function installFrameClock() {
  const pending = new Map<number, () => void>();
  let id = 0;
  const g = globalThis as any;
  const saved = {raf: g.requestAnimationFrame, caf: g.cancelAnimationFrame};
  g.requestAnimationFrame = (fn: () => void) => (pending.set(++id, fn), id); // ids start at 1: the store tests truthiness
  g.cancelAnimationFrame = (h: number) => void pending.delete(h);
  const flush = () => {
    const generation = [...pending.values()];
    pending.clear();
    for (const fn of generation) fn();
  };
  const uninstall = () => {
    g.requestAnimationFrame = saved.raf;
    g.cancelAnimationFrame = saved.caf;
  };
  // How many frames are outstanding, so a test can tell "the search ran and
  // decided nothing" from "no search was ever scheduled".
  const pending_ = () => pending.size;
  return {flush, uninstall, pending: pending_};
}

interface FakeRegistration {
  order: number;
  mark?: any;
  fi?: number | null;
  tx?: number;
  ty?: number;
  /** Anisotropy, as pointerX (ky 0.01) and pointerY (kx 0.01) set it. */
  kx?: number;
  ky?: number;
  points: [number, number][];
  data?: unknown;
  dispatched?: unknown[];
}

/** Builds and registers one record whose data are its own point objects. */
function register(store: PointerStore, options: FakeRegistration): {reg: Registration; unregister: () => void} {
  const {order, mark = {}, fi = null, tx = 0, ty = 0, kx = 1, ky = 1, points, data, dispatched = []} = options;
  const reg = store.createRegistration();
  Object.assign(reg, {
    order,
    mark,
    fi,
    tx,
    ty,
    kx,
    ky,
    index: points.map((_, i) => i),
    data: data ?? points.map((_, i) => ({datum: i})),
    dimensions: DIMS,
    context: {dispatchValue: (v: unknown) => dispatched.push(v)},
    px: (i: number) => points[i][0],
    py: (i: number) => points[i][1]
  });
  return {reg, unregister: store.add(reg)};
}

/**
 * Re-points a record at new data, exactly as a plot recompute does: the index,
 * the anchors and the data are all rebuilt together, because they all come out
 * of the same computePlot pass. Nothing here may set one without the others —
 * a fixture whose points stay put while its data are reordered is a plot that
 * cannot exist.
 */
function recompute(reg: Registration, points: [number, number][], data?: unknown[]): void {
  Object.assign(reg, {
    index: points.map((_, i) => i),
    data: data ?? points.map((_, i) => ({datum: i})),
    px: (i: number) => points[i][0],
    py: (i: number) => points[i][1]
  });
}

/** Counts how many times a record has notified its subscribers. */
function counter(reg: Registration): () => number {
  let n = 0;
  reg.subscribe(() => void n++);
  return () => n;
}

const mouse = (clientX: number, clientY: number, buttons = 0) => ({pointerType: "mouse", buttons, clientX, clientY});

const mouseDown = (target: unknown = null) => ({pointerType: "mouse", target});

describe("pointer store", () => {
  let clock: ReturnType<typeof installFrameClock>;

  beforeEach(() => (clock = installFrameClock()));
  afterEach(() => clock.uninstall());

  /** Moves the pointer and runs the coalesced frame. */
  function hover(store: PointerStore, x: number, y: number, buttons = 0): void {
    store.move(SVG, mouse(x, y, buttons));
    clock.flush();
  }

  it("gives each record its own winner — there is no cross-mark winner", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    // Two unfaceted marks that do not pool: each is its own arbitration group,
    // so the fact that A is nearer must not suppress B's own nearest datum.
    const {reg: a} = register(store, {order: 0, points: [[10, 10]], dispatched});
    const {reg: b} = register(store, {
      order: 1000,
      points: [
        [100, 100],
        [12, 12]
      ],
      dispatched
    });

    hover(store, 10, 10);

    assert.strictEqual(a.sel.i, 0);
    assert.strictEqual(b.sel.i, 1); // b's own nearest, not a's winner
    // Dispatch runs in `order`, and both mechanisms fire for each record.
    assert.deepStrictEqual(dispatched, [{datum: 0}, {datum: 1}]);
    assert.deepStrictEqual(values, [{datum: 0}, {datum: 1}]);
  });

  it("keeps records with identically-labelled marks independent, including on unregistration", () => {
    const store = createPointerStore();
    // Identity is the record object, never a key derived from the mark, so two
    // marks sharing an aria-label (two tips; a crosshair's two "crosshair rule"
    // sub-marks) cannot collide or evict each other.
    const {reg: a, unregister: unregisterA} = register(store, {
      order: 0,
      mark: {ariaLabel: "tip"},
      points: [
        [10, 10],
        [30, 10]
      ]
    });
    const {reg: b} = register(store, {
      order: 1000,
      mark: {ariaLabel: "tip"},
      points: [
        [14, 10],
        [60, 10]
      ]
    });

    hover(store, 10, 10);
    assert.strictEqual(a.sel.i, 0);
    assert.strictEqual(b.sel.i, 0); // both hold a selection at once
    const departed = a.getSnapshot();

    unregisterA();

    // The next hover is deliberately WITHIN a's maxRadius of a's second point
    // (28px), so a would move to index 1 were it still being searched: this is
    // what makes the removal observable rather than vacuously true.
    hover(store, 58, 10);
    assert.strictEqual(b.sel.i, 1); // the survivor still arbitrates
    assert.strictEqual(a.getSnapshot(), departed); // and a is no longer searched
    assert.strictEqual(a.sel.i, 0);
  });

  it("keeps a record's selection across unregistration, so a re-registering slot survives", () => {
    const store = createPointerStore();
    const {reg, unregister: first} = register(store, {
      order: 0,
      points: [
        [10, 10],
        [60, 10]
      ]
    });

    hover(store, 10, 10);
    store.down(mouseDown());
    const pinned = reg.getSnapshot();
    assert.deepStrictEqual({...pinned}, {i: 0, sticky: true});

    // Exactly what the slot's layout effect does whenever mark.filter
    // reallocates the index: tear the registration down, then add the SAME
    // record back. The record must come through with its selection intact.
    first();
    assert.strictEqual(reg.getSnapshot(), pinned);
    store.add(reg);
    assert.strictEqual(reg.getSnapshot(), pinned);

    // And the plot is still alive. Were the record reset to {i: null, sticky:
    // true} on unregistration, this click would return early because the
    // claimant is not pointing — and so would every later move and leave,
    // leaving nothing that could ever unstick the plot.
    store.down(mouseDown());
    assert.strictEqual(store.sticky, false);
    assert.strictEqual(reg.sel, NONE);
    hover(store, 58, 10);
    assert.strictEqual(reg.sel.i, 1);
  });

  it("releases the plot's sticky modality when the record holding the pin departs for good", () => {
    const store = createPointerStore();
    // Two records, so the store survives the first one's departure; the pin is
    // claimed by the lowest-order record, exactly as upstream's handledEvents
    // WeakSet gives the pointerdown to the first-registered handler.
    const {reg: a, unregister: removeA} = register(store, {order: 0, points: [[10, 10]]});
    const {reg: b} = register(store, {order: 1000, points: [[100, 100]]});

    hover(store, 10, 10);
    store.down(mouseDown());
    assert.strictEqual(store.sticky, true);
    assert.strictEqual(a.sel.sticky, true);

    // The pinning slot unmounts and never comes back — its data went empty,
    // its tip was toggled off, its mark was dropped. Nothing in that path
    // inspects the pin, so a stored flag would stay raised with no owner and
    // no gesture could lower it again: move() and leave() return on sticky,
    // and down() returns because the new first record is not pointing.
    removeA();

    assert.strictEqual(store.sticky, false);
    hover(store, 100, 100);
    assert.strictEqual(b.sel.i, 0); // the plot still answers the pointer
    store.leave({pointerType: "mouse"});
    assert.strictEqual(b.sel.i, null);
  });

  it("re-resolves a re-registered record at the pointer, whatever the new rows are made of", () => {
    const store = createPointerStore();
    // The store asks WHERE THE POINTER IS and nothing else, so the rows may be
    // rebuilt from nothing in common with the old ones — which is what a parent
    // re-render (`rows.map(d => ({...d}))`) and every grouping transform do —
    // and the selection still lands on what is drawn under the pointer. A rule
    // over the datum's identity dropped the selection here, and dropped it on
    // the very render a controlled plot's own onValue had just caused.
    const points: [number, number][] = [
      [10, 10],
      [110, 10]
    ];
    const {reg, unregister} = register(store, {order: 0, points, data: [{datum: "a"}, {datum: "b"}]});

    hover(store, 10, 10);
    store.down(mouseDown());
    assert.deepStrictEqual({...reg.sel}, {i: 0, sticky: true});

    unregister();
    recompute(reg, points, [{datum: "a"}, {datum: "b"}]); // equal-looking, wholly new objects
    store.add(reg);
    store.settle();

    assert.deepStrictEqual({...reg.sel}, {i: 0, sticky: true}); // and the pin survives with it
    assert.strictEqual(store.sticky, true);
  });

  it("follows the datum under the pointer when the rows are reordered", () => {
    const store = createPointerStore();
    // Membership of the index proves nothing: `index` holds DATA indices, so a
    // reorder (or a deletion before the selected datum) leaves the old index a
    // member while it names something else, and the tip silently changes datum
    // under a pointer that has not moved. Re-resolving asks the only question
    // that survives a recompute — what is drawn HERE — so the index moves and
    // the datum does not.
    const a = {datum: "a"};
    const b = {datum: "b"};
    const c = {datum: "c"};
    const points: [number, number][] = [
      [10, 10],
      [60, 10],
      [110, 10]
    ];
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const {reg, unregister} = register(store, {order: 0, points, data: [a, b, c]});

    hover(store, 110, 10);
    assert.strictEqual(reg.sel.i, 2);
    assert.deepStrictEqual(values, [c]);

    // The data reverse, and so do the positions they are drawn at: c is still
    // the datum at (110, 10), and is now index 0.
    unregister();
    recompute(reg, [...points].reverse() as [number, number][], [c, b, a]);
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel.i, 0);
    assert.strictEqual(reg.data[reg.sel.i!], c);
    assert.deepStrictEqual(values, [c], "the reported datum did not change, so nothing was reported");
  });

  it("drops a retained selection, and its pin, when a sibling mark's data slides under the record", () => {
    const store = createPointerStore();
    // The fiber-reuse case: React assigns useId at MOUNT, so removing the first
    // of two unkeyed sibling marks hands the survivor the first one's fiber and
    // therefore its registration record, its selection and its pin. Nothing
    // about the record can tell that it changed hands — and nothing has to.
    // The survivor draws its own datum in its own place, the pointer is not
    // there, so the search misses and the pin goes with the selection it was
    // holding. (A sibling that happened to draw a datum at the very same point
    // would keep the pin, and would be showing what the pointer is over.)
    const theirs = [{datum: "theirs"}];
    const {reg, unregister} = register(store, {order: 0, points: [[10, 10]], data: [{datum: "mine"}]});

    hover(store, 10, 10);
    store.down(mouseDown());
    assert.deepStrictEqual({...reg.sel}, {i: 0, sticky: true});

    unregister();
    recompute(reg, [[150, 150]], theirs);
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel, NONE);
    assert.strictEqual(store.sticky, false);
    hover(store, 150, 150);
    assert.strictEqual(reg.sel.i, 0); // and it selects afresh
  });

  it("reports the clearing value when the data under the pointer go away", () => {
    const store = createPointerStore();
    // Ceasing to show a datum is not only a rendering change: the record stops
    // SHOWING it, so the plot has to stop REPORTING it. Leaving the value
    // behind left `figure.value` holding the vanished datum, left the last
    // onValue call un-followed by a null, and left the store's own lastValue
    // guard holding that datum — so a later genuine re-selection of it
    // dispatched nothing at all.
    const dispatched: unknown[] = [];
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const rows = [{datum: "a"}];
    const {reg, unregister} = register(store, {order: 0, points: [[10, 10]], data: rows, dispatched});

    hover(store, 10, 10);
    assert.deepStrictEqual(dispatched, [rows[0]]);
    assert.deepStrictEqual(values, [rows[0]]);

    // The parent sets the data to []. The slot still renders, and still
    // registers: an empty index is a search that always misses, and skipping
    // the registration is what used to leave the plot reporting a row it had
    // stopped drawing.
    unregister();
    recompute(reg, [], []);
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel, NONE);
    assert.deepStrictEqual(dispatched, [rows[0], null]);
    assert.deepStrictEqual(values, [rows[0], null]);

    // …and the guard is not poisoned: the data come back and the same datum
    // reports again, with no pointer movement of any kind.
    unregister();
    recompute(reg, [[10, 10]], rows);
    store.add(reg);
    store.settle();
    assert.strictEqual(reg.sel.i, 0);
    assert.deepStrictEqual(values, [rows[0], null, rows[0]]);
  });

  it("reports the clearing value when the record holding the selection unmounts", () => {
    const store = createPointerStore();
    // The other half of the same failure. A slot that unmounts never
    // re-registers, so there is no re-resolution to clear it and — before this
    // — nothing dispatched at all: the tip vanished with its mark while
    // svg.value, onValue and the duplicate-value guard all went on holding its
    // datum. `regs` is empty afterwards, so the store cannot ask a record what
    // to report; the rule is the plot-level one, that a plot showing nothing
    // reports nothing.
    const dispatched: unknown[] = [];
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const rows = [{datum: "a"}];
    const {unregister} = register(store, {order: 0, points: [[10, 10]], data: rows, dispatched});

    hover(store, 10, 10);
    assert.deepStrictEqual(values, [rows[0]]);

    unregister(); // the mark was removed from the plot, tip and all
    store.settle();

    assert.deepStrictEqual(dispatched, [rows[0], null]);
    assert.deepStrictEqual(values, [rows[0], null]);
  });

  it("does not report a clearing value for a record that is only re-registering", () => {
    const store = createPointerStore();
    // Every recompute unregisters and re-registers the same record, so the
    // clearing report above must be reserved for records that do not come
    // back. Reporting on the way out would put a null between every pair of
    // values a hovered plot ever reports, and a controlled plot would see its
    // own state blanked on every render it performed.
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const rows = [{datum: "a"}];
    const {reg, unregister} = register(store, {order: 0, points: [[10, 10]], data: rows});

    hover(store, 10, 10);
    unregister();
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel.i, 0);
    assert.deepStrictEqual(values, [rows[0]]);
  });

  it("does not re-resolve at a position the pointer has left", () => {
    const store = createPointerStore();
    // The one place the remembered position is forgotten. Everywhere else it
    // outlives the selection, because the pointer is still there; on
    // pointerleave it is not, and re-resolving at the point it left through
    // would hand a datum to a user who is pointing somewhere else entirely.
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const points: [number, number][] = [[10, 10]];
    const {reg, unregister} = register(store, {order: 0, points, data: [{datum: "a"}]});

    hover(store, 10, 10);
    store.leave({pointerType: "mouse"});
    assert.strictEqual(reg.sel, NONE);

    unregister();
    recompute(reg, points, [{datum: "a"}]);
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel, NONE);
    assert.deepStrictEqual(values, [{datum: "a"}, null]);
  });

  it("does not re-resolve before the pointer has ever entered the plot", () => {
    const store = createPointerStore();
    // A plot that recomputes under a pointer that has never touched it — the
    // ordinary case of a live-updating chart nobody is looking at — must not
    // conjure a selection out of the origin, or out of anywhere else.
    const values: unknown[] = [];
    store.setOnValue((v) => values.push(v));
    const {reg, unregister} = register(store, {order: 0, points: [[0, 0]], data: [{datum: "a"}]});
    store.settle();

    unregister();
    store.add(reg);
    store.settle();

    assert.strictEqual(reg.sel, NONE);
    assert.deepStrictEqual(values, []);
  });

  it("lets a pointerdown unpin when a consumer has mounted ahead of the pin holder", () => {
    const store = createPointerStore();
    // Upstream gives the pointerdown to the first-registered handler and lets
    // its own `i` decide, but it also guarantees — without ever having to say
    // so — that the first handler IS the pin holder whenever there is a pin:
    // its listener set is fixed for the life of a render, and a pin can only be
    // taken while that first handler was pointing. A React registry gains
    // members under a live pin (a <Crosshair> toggled on, a tip added to an
    // earlier mark), so first-registered read literally hands the decision to a
    // record that has never pointed — down() would return, isSticky() would
    // stay true because the pin holder is still registered, and move() and
    // leave() both return early on sticky. The plot would be pinned for good.
    const {reg: pinned} = register(store, {order: 1000, points: [[10, 10]]});

    hover(store, 10, 10);
    store.down(mouseDown());
    assert.strictEqual(pinned.sel.sticky, true);

    // A consumer mounts AHEAD of the pin holder, with no selection of its own.
    const {reg: ahead} = register(store, {order: 0, points: [[190, 190]]});
    assert.strictEqual(ahead.sel.i, null);
    assert.strictEqual(store.sticky, true);

    store.down(mouseDown());
    assert.strictEqual(store.sticky, false);
    assert.strictEqual(pinned.sel, NONE);

    // …and the plot answers the pointer again.
    hover(store, 10, 10);
    assert.strictEqual(pinned.sel.i, 0);
  });

  it("re-resolves a pinned record too, and releases the pin when nothing is under it", () => {
    const store = createPointerStore();
    // A pin is a pin on a PLACE: the user pinned what was under the pointer,
    // and the pointer has not moved, so the pinned record is re-resolved like
    // every other and hands its pin back to itself. What it must never do is
    // keep a pin over nothing — a sticky selection with no index makes
    // isSticky() true with nothing to show, and move(), leave() and down() all
    // return early on sticky, so the plot would be pinned for good on a datum
    // nobody can see or dismiss.
    const points: [number, number][] = [[10, 10]];
    const {reg, unregister} = register(store, {order: 0, points, data: [{datum: "a"}]});

    hover(store, 10, 10);
    store.down(mouseDown());
    assert.strictEqual(store.sticky, true);

    // An unrelated recompute: the pin stays exactly where it was.
    unregister();
    recompute(reg, points, [{datum: "a"}]);
    store.add(reg);
    store.settle();
    assert.deepStrictEqual({...reg.sel}, {i: 0, sticky: true});

    // And now the datum under it goes.
    unregister();
    recompute(reg, [], []);
    store.add(reg);
    store.settle();
    assert.strictEqual(reg.sel, NONE);
    assert.strictEqual(store.sticky, false);
    hover(store, 10, 10); // the plot answers the pointer again
    assert.strictEqual(reg.sel.i, null);
  });

  it("pools the facets of one mark, so only the nearest facet keeps a datum", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    // One mark, two facets. Channel values are facet-local, so facet 1's record
    // carries the facet translate as tx and the pointer is corrected by it.
    const mark = {ariaLabel: "dot"};
    const {reg: f0} = register(store, {
      order: 1000,
      mark,
      fi: 0,
      tx: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });
    const {reg: f1} = register(store, {
      order: 1001,
      mark,
      fi: 1,
      tx: 20,
      points: [[10, 10]],
      data: [{f: 1}],
      dispatched
    });

    hover(store, 14, 10); // 4px from facet 0's point, 16px from facet 1's
    assert.strictEqual(f0.sel.i, 0);
    assert.strictEqual(f1.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}]);

    hover(store, 26, 10); // now 16px and 4px: the facets swap
    assert.strictEqual(f0.sel, NONE);
    assert.strictEqual(f1.sel.i, 0);
    // Leaving one facet while entering another suppresses the leaving facet's
    // clearing dispatch, so the value never blinks through null.
    assert.deepStrictEqual(dispatched, [{f: 0}, {f: 1}]);
  });

  it("stops dispatching a clearing value once every facet of a mark has been searched", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const mark = {ariaLabel: "dot"};
    const {reg: f0} = register(store, {
      order: 1000,
      mark,
      fi: 0,
      tx: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });
    register(store, {order: 1001, mark, fi: 1, tx: 100, points: [[10, 10]], data: [{f: 1}], dispatched});

    // Upstream skips the clearing dispatch when facetPool.map.size > 1
    // (pointer.js:172), and update() writes a map entry on EVERY pointermove
    // including a miss (pointer.js:134) — so the count is of facets that have
    // ever been searched, not of facets currently hitting. Every facet listens
    // on the same <svg>, so one move is enough to reach size 2 and upstream
    // then essentially never clears svg.value for this mark again.
    hover(store, 10, 10); // facet 0 hits; facet 1, corrected to -90, misses
    assert.strictEqual(f0.sel.i, 0);
    assert.deepStrictEqual(dispatched, [{f: 0}]);

    // pointerleave goes through clear(), which must apply the very same skip:
    // upstream reaches render(null) by the same route (pointer.js:200).
    store.leave({pointerType: "mouse"});
    assert.strictEqual(f0.sel, NONE); // the mark still stops rendering...
    assert.deepStrictEqual(dispatched, [{f: 0}]); // ...but the value is stale

    // Re-entering the facet re-renders it, but reports NOTHING: the clearing
    // dispatch above was suppressed, so the plot's value never stopped being
    // this datum, and upstream's dispatchValue returns on `figure.value ===
    // value` (plot.js:180-184). The two quirks compound exactly as upstream's
    // do — that is the point of this case.
    hover(store, 10, 10);
    assert.deepStrictEqual(dispatched, [{f: 0}]);
    hover(store, 190, 190); // out of range of every facet, this time via select()
    assert.strictEqual(f0.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}]);
  });

  it("does not retain a searched-facet set for a mark the plot has rebuilt", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    // useMark rebuilds its mark instances on every stamp change, so a pointer
    // plot bound to changing data walks through a fresh mark object per
    // recompute. Each generation below is one such recompute: the slots
    // unregister and re-register around a brand-new mark, exactly as React's
    // layout-effect cleanup and create pair does.
    for (let generation = 0; generation < 5; ++generation) {
      const mark = {ariaLabel: "dot"};
      const f0 = register(store, {order: 1000, mark, fi: 0, points: [[10, 10]], data: [{f: 0}], dispatched});
      const f1 = register(store, {order: 1001, mark, fi: 1, tx: 100, points: [[10, 10]], data: [{f: 1}], dispatched});

      hover(store, 10, 10);
      assert.strictEqual(f0.reg.sel.i, 0);
      store.leave({pointerType: "mouse"});
      assert.strictEqual(f0.reg.sel, NONE);

      // One live mark, however many recomputes have gone by.
      assert.strictEqual(store.retainedSearchedMarks(), 1);
      f0.unregister();
      f1.unregister();
    }

    // …and the retention that IS wanted is untouched: within each generation
    // both facets were searched before the pointerleave, so every clearing
    // dispatch was suppressed and the value never blinked through null.
    assert.deepStrictEqual(dispatched, [{f: 0}, {f: 0}, {f: 0}, {f: 0}, {f: 0}]);
  });

  it("still dispatches a clearing value for a mark with a single searched facet", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    // The control for the test above: the rule is size > 1, not "is faceted".
    const {reg} = register(store, {
      order: 1000,
      mark: {ariaLabel: "dot"},
      fi: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });

    hover(store, 10, 10);
    assert.strictEqual(reg.sel.i, 0);
    store.leave({pointerType: "mouse"});
    assert.deepStrictEqual(dispatched, [{f: 0}, null]);
  });

  it("lets the lowest-order record's pool infect every other record", () => {
    const store = createPointerStore();
    // Upstream builds state.pool from the FIRST-rendered pointer mark and then
    // resolves everyone through `state.pool ?? facetPool`; a pooled tip
    // rendered first therefore suppresses marks that do not pool themselves.
    const {reg: pooled} = register(store, {order: 0, mark: {pool: true}, points: [[100, 100]]});
    const {reg: b} = register(store, {order: 1000, mark: {pool: false}, points: [[10, 10]]});
    const {reg: c} = register(store, {order: 2000, mark: {pool: false}, points: [[12, 12]]});

    hover(store, 10, 10);

    assert.strictEqual(pooled.sel, NONE); // out of range
    assert.strictEqual(b.sel.i, 0); // nearest across the whole plot
    assert.strictEqual(c.sel, NONE); // unpooled, yet suppressed by the contagion
    assert.strictEqual([pooled, b, c].filter((r) => r.sel.i != null).length, 1);
  });

  it("does not pool when the lowest-order record's mark does not pool", () => {
    const store = createPointerStore();
    // The mirror image: pooling marks registered later than a non-pooling one
    // (a crosshair rendered before a tip) leave every record independent.
    const {reg: a} = register(store, {order: 0, mark: {pool: false}, points: [[10, 10]]});
    const {reg: b} = register(store, {order: 1000, mark: {pool: true}, points: [[12, 12]]});
    const {reg: c} = register(store, {order: 2000, mark: {pool: true}, points: [[14, 14]]});

    hover(store, 10, 10);

    assert.deepStrictEqual(
      [a, b, c].map((r) => r.sel.i),
      [0, 0, 0]
    );
  });

  it("gives a tie within a group to the lowest order, not to the registration order", () => {
    const store = createPointerStore();
    // Registered high-order first, so only the sort can produce upstream's
    // answer. The comparison is strictly `<`, so the first entry keeps the win.
    const {reg: high} = register(store, {order: 1000, mark: {pool: true}, points: [[20, 10]]});
    const {reg: low} = register(store, {order: 0, mark: {pool: true}, points: [[0, 10]]});

    hover(store, 10, 10); // both exactly 10px away
    assert.strictEqual(low.sel.i, 0);
    assert.strictEqual(high.sel, NONE);

    // Swapping the orders swaps the winner: it is `order` that decides.
    const swapped = createPointerStore();
    const {reg: first} = register(swapped, {order: 0, mark: {pool: true}, points: [[20, 10]]});
    const {reg: second} = register(swapped, {order: 1000, mark: {pool: true}, points: [[0, 10]]});
    swapped.move(SVG, mouse(10, 10));
    clock.flush();
    assert.strictEqual(first.sel.i, 0);
    assert.strictEqual(second.sel, NONE);
  });

  it("lets an earlier registration's miss beat a datum sitting at exactly maxRadius", () => {
    const store = createPointerStore();
    // The boundary case of upstream's arbitration, and it is upstream's answer,
    // not a nicer one. pointerSearch scores a miss at maxRadius squared and
    // update() stores it in the pool like any hit (pointer.js:134); a datum at
    // exactly maxRadius scores maxRadius squared too, so `c.ri < best.ri`
    // (pointer.js:139) leaves the win with the earlier entry — the miss — and
    // the final loop renders `c === best ? c.ii : null` with best.ii null, so
    // every pooled mark shows nothing.
    const {reg: missed} = register(store, {order: 0, mark: {pool: true}, points: [[300, 300]]});
    const {reg: boundary} = register(store, {order: 1000, mark: {pool: true}, points: [[50, 10]]});

    hover(store, 10, 10); // exactly maxRadius (40px) from the boundary datum
    assert.strictEqual(missed.sel, NONE);
    assert.strictEqual(boundary.sel, NONE);

    // One pixel closer and the datum beats the miss outright.
    hover(store, 11, 10);
    assert.strictEqual(boundary.sel.i, 0);
  });

  it("blanks every member of a group whose winner is a miss", () => {
    const store = createPointerStore();
    // The rule the boundary case above is an instance of, and where it bites:
    // an ANISOTROPIC mark. pointerX squashes the orthogonal distance to decide
    // WHETHER a datum is within maxRadius, then recomputes ri unsquashed for
    // the cross-facet comparison (pointer.js:154-157), so a hit's ri can be far
    // greater than maxRadius squared — and a plain miss, scored at exactly
    // maxRadius squared, then beats it. Upstream lets that miss win the pool
    // and renders `c === best ? c.ii : null` with best.ii null, so the whole
    // group goes blank. Skipping misses instead shows the far datum wherever
    // upstream shows nothing: a differential oracle over a faceted lineY with a
    // tip put that at 125 of 357 probe points.
    const mark = {ariaLabel: "tip"};
    const facet = {mark, kx: 1, ky: 0.01, points: [[10, 10]] as [number, number][]};
    const {reg: near} = register(store, {order: 0, fi: 0, ...facet});
    const {reg: far} = register(store, {order: 1, fi: 1, tx: 500, ...facet});

    // 140px below facet 0's datum: squashed to 1.4px it is a hit, but its
    // unsquashed ri is 19600 — worse than facet 1's miss at 1600.
    hover(store, 10, 150);
    assert.strictEqual(near.sel, NONE);
    assert.strictEqual(far.sel, NONE);

    // The control: 30px below, ri 900, and facet 0 beats the miss.
    hover(store, 10, 40);
    assert.strictEqual(near.sel.i, 0);
    assert.strictEqual(far.sel, NONE);
  });

  it("keeps the identical snapshot and does not notify when the selection is unchanged", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const {reg} = register(store, {
      order: 0,
      points: [
        [10, 10],
        [60, 10]
      ],
      dispatched
    });
    const notified = counter(reg);

    assert.strictEqual(reg.getSnapshot(), NONE);
    assert.strictEqual(reg.getServerSnapshot(), NONE);

    hover(store, 10, 10);
    const first = reg.getSnapshot();
    assert.strictEqual(first.i, 0);
    assert.strictEqual(first.sticky, false);
    assert.ok(Object.isFrozen(first));
    assert.strictEqual(notified(), 1);

    // getServerSnapshot must keep returning the shared NONE now that a live
    // selection exists — that is its whole job. It is what React reads under
    // renderToStaticMarkup, which is how the imperative plot() path renders,
    // and neither has a pointer.
    assert.strictEqual(reg.getServerSnapshot(), NONE);
    assert.notStrictEqual(reg.getServerSnapshot(), reg.getSnapshot());

    hover(store, 11, 10); // moved, same winner
    assert.strictEqual(reg.getSnapshot(), first); // identical object: no re-render
    assert.strictEqual(notified(), 1);
    assert.deepStrictEqual(dispatched, [{datum: 0}]); // and no repeat dispatch

    hover(store, 58, 10); // a real change
    assert.notStrictEqual(reg.getSnapshot(), first);
    assert.strictEqual(reg.getSnapshot().i, 1);
    assert.strictEqual(notified(), 2);
  });

  it("toggles nothing on pointerdown when the lowest-order record is not pointing", () => {
    const store = createPointerStore();
    // Upstream's handledEvents WeakSet means the first-registered handler claims
    // the event outright; if it is not pointing, nothing becomes sticky even
    // though a later mark is pointing.
    const {reg: a} = register(store, {order: 0, points: [[100, 100]]});
    const {reg: b} = register(store, {order: 1000, points: [[10, 10]]});

    hover(store, 10, 10);
    assert.strictEqual(a.sel, NONE);
    assert.strictEqual(b.sel.i, 0);

    store.down({pointerType: "mouse", target: null});

    assert.strictEqual(store.sticky, false);
    assert.strictEqual(b.sel.sticky, false);
  });

  it("stays sticky when a pointerdown lands inside ANY rendered root, not just the claimant's", () => {
    const store = createPointerStore();
    const {reg: claimant} = register(store, {order: 0, points: [[10, 10]]});
    const {reg: other} = register(store, {order: 1000, points: [[12, 12]]});
    hover(store, 10, 10);

    store.down(mouseDown());
    assert.strictEqual(store.sticky, true);
    const pinned = claimant.getSnapshot();
    assert.strictEqual(pinned.sticky, true);

    // Upstream tests state.roots.some (pointer.js:193) — every rendered root,
    // not only the claiming slot's. That is what keeps the plot sticky when the
    // click lands inside a SECOND pointer mark's output, and it is what makes a
    // sticky tip's text selectable when a crosshair claimed the pointerdown.
    const insideOther = {};
    claimant.rootRef({contains: () => false} as unknown as Element);
    other.rootRef({contains: (n: unknown) => n === insideOther} as unknown as Element);
    store.down(mouseDown(insideOther));
    assert.strictEqual(store.sticky, true);
    assert.strictEqual(claimant.getSnapshot(), pinned);

    // Clicking outside every root does unpin, and clears every record.
    store.down(mouseDown({}));
    assert.strictEqual(store.sticky, false);
    assert.strictEqual(claimant.sel, NONE);
    assert.strictEqual(other.sel, NONE);
  });

  it("ignores a pointer move while sticky, without even scheduling a search", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const {reg} = register(store, {
      order: 0,
      points: [
        [10, 10],
        [60, 10]
      ],
      dispatched
    });
    hover(store, 10, 10);
    store.down(mouseDown());
    const pinned = reg.getSnapshot();
    dispatched.length = 0;
    const notified = counter(reg);

    // Squarely on the OTHER datum: were the selection still live it would move.
    store.move(SVG, mouse(58, 10));
    assert.strictEqual(clock.pending(), 0); // move() bails before scheduling a frame
    clock.flush();

    assert.strictEqual(reg.getSnapshot(), pinned);
    assert.strictEqual(reg.sel.i, 0);
    assert.deepStrictEqual(dispatched, []);
    assert.strictEqual(notified(), 0);
  });

  it("ignores a pointerdown from a non-mouse pointer", () => {
    const store = createPointerStore();
    const {reg} = register(store, {order: 0, points: [[10, 10]]});
    hover(store, 10, 10);

    // upstream pointer.js:191 returns before touching state.sticky for any
    // non-mouse pointer, so a touch tap must never pin the plot.
    store.down({pointerType: "touch", target: null});
    assert.strictEqual(store.sticky, false);
    assert.strictEqual(reg.sel.sticky, false);

    store.down(mouseDown());
    assert.strictEqual(store.sticky, true);
  });

  it("cancels a pending move frame on pointerdown, so setting sticky touches the claimant only", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const {reg: claimant} = register(store, {order: 0, points: [[10, 10]], dispatched});
    const {reg: other} = register(store, {order: 1000, points: [[12, 12]], dispatched});
    const notifiedOther = counter(other);

    hover(store, 10, 10);
    const beforeOther = other.getSnapshot();
    dispatched.length = 0;
    const baseOther = notifiedOther();

    // The ordinary click gesture: a pointermove and a pointerdown arrive in the
    // same task, so the move's coalescing frame is still outstanding when down()
    // runs. Left to run afterwards it would re-publish every non-claimant with
    // sticky true and re-dispatch its value, where upstream re-renders the
    // claiming slot alone (pointer.js:195).
    store.move(SVG, mouse(11, 10));
    assert.strictEqual(clock.pending(), 1);
    store.down(mouseDown());
    assert.strictEqual(clock.pending(), 0);
    clock.flush();

    assert.strictEqual(store.sticky, true);
    assert.strictEqual(claimant.sel.sticky, true);
    assert.strictEqual(other.getSnapshot(), beforeOther); // stale DOM kept
    assert.strictEqual(other.sel.sticky, false);
    assert.strictEqual(notifiedOther() - baseOther, 0);
    assert.deepStrictEqual(dispatched, []);
  });

  it("republishes only the claiming record when a pointerdown sets sticky", () => {
    const store = createPointerStore();
    const {reg: a} = register(store, {order: 0, points: [[10, 10]]});
    const {reg: b} = register(store, {order: 1000, points: [[12, 12]]});
    const notifiedA = counter(a);
    const notifiedB = counter(b);

    hover(store, 10, 10);
    assert.strictEqual(a.sel.i, 0);
    assert.strictEqual(b.sel.i, 0);
    const beforeB = b.getSnapshot();
    const baseA = notifiedA();
    const baseB = notifiedB();

    store.down({pointerType: "mouse", target: null});

    // Upstream re-renders the claiming slot only; the others keep their DOM,
    // stale sticky flag and all.
    assert.strictEqual(a.sel.sticky, true);
    assert.strictEqual(notifiedA() - baseA, 1);
    assert.strictEqual(b.getSnapshot(), beforeB);
    assert.strictEqual(b.sel.sticky, false);
    assert.strictEqual(notifiedB() - baseB, 0);
  });

  it("ignores pointerleave while sticky, and otherwise clears and dispatches null", () => {
    const sticky = createPointerStore();
    const stickyDispatched: unknown[] = [];
    const {reg} = register(sticky, {order: 0, points: [[10, 10]], dispatched: stickyDispatched});
    sticky.move(SVG, mouse(10, 10));
    clock.flush();
    sticky.down({pointerType: "mouse", target: null});
    const pinned = reg.getSnapshot();
    stickyDispatched.length = 0;

    sticky.leave({pointerType: "mouse"});
    assert.strictEqual(sticky.sticky, true);
    assert.strictEqual(reg.getSnapshot(), pinned);
    assert.deepStrictEqual(stickyDispatched, []);

    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const {reg: a} = register(store, {order: 0, points: [[10, 10]], dispatched});
    const {reg: b} = register(store, {order: 1000, points: [[12, 12]], dispatched});
    const notifiedA = counter(a);
    hover(store, 10, 10);
    dispatched.length = 0;

    store.leave({pointerType: "touch"}); // non-mouse pointers never clear
    assert.strictEqual(a.sel.i, 0);

    store.leave({pointerType: "mouse"});
    assert.strictEqual(a.sel, NONE);
    assert.strictEqual(b.sel, NONE);
    // Both records clear, but the plot reports ONE null: the value lives on the
    // plot element, and upstream's dispatchValue compares against it by
    // reference (plot.js:180-184), so the second record's null is a no-op.
    assert.deepStrictEqual(dispatched, [null]);
    assert.strictEqual(notifiedA(), 2); // selected, then cleared
  });

  it("suppresses a mouse move made with the primary button down", () => {
    const store = createPointerStore();
    const {reg} = register(store, {
      order: 0,
      points: [
        [10, 10],
        [60, 10]
      ]
    });

    hover(store, 10, 10, 1); // dragging: no frame is even scheduled
    assert.strictEqual(reg.sel, NONE);

    // The guard is mouse-specific: a touch contact reporting buttons === 1 is a
    // normal pointer, not a drag.
    store.move(SVG, {pointerType: "touch", buttons: 1, clientX: 10, clientY: 10});
    clock.flush();
    assert.strictEqual(reg.sel.i, 0);

    hover(store, 58, 10);
    assert.strictEqual(reg.sel.i, 1);
  });

  it("cancels a pending move frame on pointerleave, so the stale search cannot re-select", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const {reg} = register(store, {order: 0, points: [[10, 10]], dispatched});

    hover(store, 10, 10);
    assert.strictEqual(reg.sel.i, 0);

    // The pointer leaves while a move's coalescing frame is still outstanding —
    // the ordinary flick off the plot. leave() must cancel it exactly as down()
    // does: allowed to run afterwards, the stale search would re-select the
    // datum the leave has just cleared and re-dispatch its value.
    store.move(SVG, mouse(11, 10));
    assert.strictEqual(clock.pending(), 1);
    store.leave({pointerType: "mouse"});
    assert.strictEqual(clock.pending(), 0);
    clock.flush();

    assert.strictEqual(reg.sel, NONE);
    assert.deepStrictEqual(dispatched, [{datum: 0}, null]);
  });

  it("dispatches a clearing value for a faceted mark when the plot pools globally", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    // A pooled mark with two facets: upstream resolves `state.pool ?? facetPool`
    // to state.pool (pointer.js:130), so facetPool.map is never written, its
    // size stays 0 and the facetPool.map.size > 1 skip at pointer.js:172 can
    // never fire. A faceted mark therefore DOES clear svg.value when pooling —
    // the opposite of the unpooled two-facet case above.
    const mark = {ariaLabel: "tip", pool: true};
    const {reg: f0} = register(store, {
      order: 0,
      mark,
      fi: 0,
      tx: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });
    const {reg: f1} = register(store, {order: 1, mark, fi: 1, tx: 100, points: [[10, 10]], data: [{f: 1}], dispatched});

    hover(store, 10, 10); // facet 0 hits; facet 1, corrected to -90, misses
    assert.strictEqual(f0.sel.i, 0);
    assert.strictEqual(f1.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}]);

    store.leave({pointerType: "mouse"});
    assert.strictEqual(f0.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}, null]);
  });

  it("records a facet as searched on the pointerleave path too, as update(null) does", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const mark = {ariaLabel: "dot"};
    const {reg: f0} = register(store, {
      order: 1000,
      mark,
      fi: 0,
      tx: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });

    hover(store, 10, 10); // only facet 0 exists yet, so only it is searched
    assert.strictEqual(f0.sel.i, 0);
    assert.deepStrictEqual(dispatched, [{f: 0}]);

    // Facet 1 arrives afterwards — a facet scale gaining a value on a re-render.
    const {unregister: unregisterF1} = register(store, {
      order: 1001,
      mark,
      fi: 1,
      tx: 100,
      points: [[10, 10]],
      data: [{f: 1}],
      dispatched
    });

    // Upstream's pointerleave runs update(null), which renders FIRST and writes
    // pool.map afterwards (pointer.js:200 → 132-134). So this leave still
    // dispatches — the map holds one entry when render(null) tests it — and
    // only then does facet 1 join the searched set.
    store.leave({pointerType: "mouse"});
    assert.strictEqual(f0.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}, null]);

    // Facet 1 goes away again. Its map entry does not: upstream keys the map by
    // renderIndex and never deletes, so the size stays 2 and the skip now holds
    // for good. Were the leave not recording, the set would still hold one
    // entry here and this second clearing value would be dispatched.
    unregisterF1();
    hover(store, 10, 10);
    assert.strictEqual(f0.sel.i, 0);
    store.leave({pointerType: "mouse"});
    assert.strictEqual(f0.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}, null, {f: 0}]);
  });

  it("keeps the searched facets of a mark after one of its facets unregisters", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    const mark = {ariaLabel: "dot"};
    const {reg: f0} = register(store, {
      order: 1000,
      mark,
      fi: 0,
      tx: 0,
      points: [[10, 10]],
      data: [{f: 0}],
      dispatched
    });
    const {unregister: unregisterF1} = register(store, {
      order: 1001,
      mark,
      fi: 1,
      tx: 100,
      points: [[10, 10]],
      data: [{f: 1}],
      dispatched
    });

    hover(store, 10, 10); // both facets searched, so the mark is past size 1
    assert.strictEqual(f0.sel.i, 0);
    assert.deepStrictEqual(dispatched, [{f: 0}]);

    // The searched set is cumulative across moves, not rebuilt per move: it
    // stands in for upstream's facetPool.map, which is only ever added to. Once
    // facet 1 is gone no move can re-search it, so a per-move set would fall
    // back to size 1 and start clearing svg.value again.
    unregisterF1();
    hover(store, 10, 10);
    assert.strictEqual(f0.sel.i, 0);

    store.leave({pointerType: "mouse"});
    assert.strictEqual(f0.sel, NONE);
    assert.deepStrictEqual(dispatched, [{f: 0}]); // still suppressed
  });

  it("gives two unfaceted records of the SAME mark their own arbitration groups", () => {
    const store = createPointerStore();
    // Upstream groups an unfaceted, non-pooling render with nothing at all:
    // `state.pool ?? facetPool` is null, so update() renders directly. Grouping
    // by mark would be wrong — a mark rendered twice unfaceted (two pointer
    // transforms sharing one mark object) must not have one render suppress the
    // other, exactly as two distinct marks do not.
    const mark = {ariaLabel: "dot"};
    const {reg: a} = register(store, {order: 0, mark, points: [[10, 10]]});
    const {reg: b} = register(store, {
      order: 1000,
      mark,
      points: [
        [100, 100],
        [12, 12]
      ]
    });

    hover(store, 10, 10);

    assert.strictEqual(a.sel.i, 0);
    assert.strictEqual(b.sel.i, 1); // b's own nearest, though a's is nearer
  });

  it("reads the dispatched datum out of Map-valued mark data", () => {
    const store = createPointerStore();
    const dispatched: unknown[] = [];
    // Upstream's dispatch is `isArray(data) ? data[i] : data.get(i)`
    // (pointer.js:173): a mark's data survives as whatever the user passed, and
    // an indexed Map keyed by the datum's index is not an array. Indexing it
    // with [] would silently dispatch undefined for every datum.
    const {reg} = register(store, {
      order: 0,
      points: [
        [10, 10],
        [60, 10]
      ],
      data: new Map<number, unknown>([
        [0, {m: 0}],
        [1, {m: 1}]
      ]),
      dispatched
    });

    hover(store, 10, 10);
    assert.strictEqual(reg.sel.i, 0);
    hover(store, 58, 10);
    assert.strictEqual(reg.sel.i, 1);
    store.leave({pointerType: "mouse"});

    assert.deepStrictEqual(dispatched, [{m: 0}, {m: 1}, null]);
  });
});

// ---------------------------------------------------------------------------
// The adapters the store searches through. The upstream arithmetic itself is
// pinned in test/pointer-hittest-test.ts; what matters here is that the React
// path reads the right state and corrects the pointer, not the data.
// ---------------------------------------------------------------------------

describe("pointer hit test adapters", () => {
  it("reads kx, ky and maxRadius off the mark, defaulting to isotropic 40px", () => {
    // A mark with no pointer transform on it at all (a tip's anchor mark before
    // the transform is applied, or a fake in a test) must still be searchable.
    assert.deepStrictEqual(pointerKOf({}), {kx: 1, ky: 1, maxRadius: 40});
    assert.deepStrictEqual(pointerKOf(undefined), {kx: 1, ky: 1, maxRadius: 40});

    // pointer() stamps these onto the composed render because kx/ky are closure
    // parameters and maxRadius is destructured: this is the only way out.
    const mark = {render: Object.assign(() => null, {pointer: true, pointerK: {kx: 1, ky: 0.01, maxRadius: "12"}})};
    assert.deepStrictEqual(pointerKOf(mark), {kx: 1, ky: 0.01, maxRadius: 12});
  });

  it("precomputes the facet and band correction together with the target accessors", () => {
    const index: any = [0];
    index.fx = "a";
    const scales = {x: Object.assign((d: unknown) => d, {bandwidth: () => 20}), fx: () => 100};
    const dims = {width: 200, height: 200, marginTop: 5, marginRight: 0, marginBottom: 0, marginLeft: 10};
    const {tx, ty, px, py} = computeAnchors({frameAnchor: "middle"}, scales, {px: [7], py: [9]}, dims, index);
    assert.strictEqual(tx, 100 - 10 + 20 / 2); // facet translate, then half a band
    assert.strictEqual(ty, 0);
    assert.strictEqual(px(0), 7);
    assert.strictEqual(py(0), 9);
  });

  it("corrects the pointer by the registration's own offsets and scores a miss at maxRadius squared", () => {
    const points: [number, number][] = [
      [10, 10],
      [80, 10]
    ];
    const reg = {
      index: [0, 1],
      px: (i: number) => points[i][0],
      py: (i: number) => points[i][1],
      tx: 20,
      ty: 0,
      kx: 1,
      ky: 1,
      maxRadius: 40,
      dimensions: DIMS
    };

    assert.deepStrictEqual(nearest(reg, 30, 10), {ii: 0, ri: 0}); // 30 - tx lands on the datum
    assert.deepStrictEqual(nearest(reg, 10, 10), {ii: 0, ri: 400});
    // maxRadius², upstream's own accumulator value when nothing came inside the
    // radius — NOT Infinity. The store enters it into the arbitration, exactly
    // as upstream's update() enters it into the pool (pointer.js:134), so a
    // miss can win a group and blank it.
    assert.deepStrictEqual(nearest(reg, 200, 200), {ii: null, ri: 1600});
    assert.deepStrictEqual(nearest({...reg, index: []}, 30, 10), {ii: null, ri: 1600});
  });
});
