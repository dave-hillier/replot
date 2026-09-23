import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type ReactElement
} from "react";
import {computePlot} from "../plot.js";
import type {MarkOptions} from "../mark.js";
import {consumeWarnings} from "../warnings.js";
import {PlotContext, type PlotContextValue} from "./PlotContext.js";
import {markEventNames, useMark, type MarkEventHandlers, type MarkFactory} from "./useMark.js";
import {PointerRoot, PointerContext} from "./interactions/PointerContext.js";
import {computeAnchors, pointerKOf} from "./interactions/pointerHitTest.js";
import {createPointerStore, type PointerStore} from "./interactions/pointerStore.js";
import {buildAutoLegends, LegendDisplay} from "./legends/Legend.js";
import {createClipRegistry, registerClips, type ClipRegistry} from "./clip.js";
import {domToJsx, isDomNode} from "./domToJsx.js";
import {hasRenderTransform, renderTransformJSX} from "./renderTransform.js";
import {FigureLayout} from "./FigureLayout.js";

// <Plot> renders a JSX <svg> populated entirely by each mark's renderJSX();
// there is no imperative (d3-selection) render fallback.
//
// Children's <Mark> components register their factories into marksRef from
// their own layout effects; a useLayoutEffect here then runs computePlot and
// stores the result in state. The component re-renders with <PlotSvg> as a
// normal React child so the JSX tree participates in the parent root's act()
// scope under JSDOM.
//
// Effects rather than render because a render can be discarded: StrictMode
// renders (and mounts) everything twice, and a concurrent render can be thrown
// away before it commits, so a registration written during render can be
// recorded for a tree that never appears — and, since the cleanup that follows
// a simulated unmount has no re-render to restore it, lost entirely (#148).
// The cost of doing it in effects is that a registry's Map insertion order
// freezes at MOUNT order, while the plot must draw in CHILDREN order, so each
// effect also records this commit's order and the layout effect below
// reconciles the two (#145). Three registries share that machinery: marks,
// scales, legends.
export interface ReplotProps {
  children?: ReactNode;
  width?: number;
  height?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  aspectRatio?: number | boolean;
  x?: any;
  y?: any;
  color?: any;
  opacity?: any;
  r?: any;
  symbol?: any;
  length?: any;
  fx?: any;
  fy?: any;
  inset?: number;
  insetTop?: number;
  insetRight?: number;
  insetBottom?: number;
  insetLeft?: number;
  round?: boolean;
  nice?: boolean | number;
  clamp?: boolean;
  zero?: boolean;
  align?: number;
  padding?: number;
  label?: string;
  projection?: any;
  facet?: any;
  className?: string;
  style?: any;
  ariaLabel?: string;
  ariaDescription?: string;
  axis?: any;
  grid?: any;
  clip?: MarkOptions["clip"];
  title?: string;
  subtitle?: string;
  caption?: string;
  // Controls the <figure> wrapper. "auto" (default) wraps only when there's a
  // title/subtitle/caption/legend to show; "always" forces it; "never"
  // suppresses it even when those are present. Booleans are accepted as
  // legacy aliases for "always"/"never".
  figure?: boolean | "auto" | "always" | "never";
  onValue?: (value: any) => void;
  [key: string]: any;
}

interface Registration {
  stamp: string;
  factory: MarkFactory;
  // Handler identities are excluded from the stamp; same-stamp re-registration
  // refreshes them in place so event closures always call the latest ones.
  handlers?: MarkEventHandlers;
}

interface LegendRegistration {
  stamp: string;
  props: Record<string, any>;
}

interface ScaleRegistration {
  stamp: string;
  // Plot-level option key the registration merges into ("x", "y", "color", …,
  // and the scale-adjacent "facet" and "projection" options).
  scaleName: string;
  config: Record<string, any>;
}

interface ResolvedScales {
  scaleDescriptors: Record<string, any>;
  context: any;
  // The options computePlot actually received: the <Plot> props with scale
  // registrations merged in. Legend resolution reads these so scale options
  // declared via components are visible as defaults.
  plotOptions: Record<string, any>;
}

type Mode =
  | {kind: "empty"}
  | {
      kind: "jsx";
      computed: any;
      onSvgRef: (svg: SVGSVGElement | null) => void;
      pointerEnabled: boolean;
      warnings: number;
    };

export function Replot({
  children,
  title,
  subtitle,
  caption,
  figure,
  onValue,
  className: classNameProp,
  style,
  ...options
}: ReplotProps) {
  const marksRef = useRef<Map<string, Registration>>(new Map());
  const scalesRef = useRef<Map<string, ScaleRegistration>>(new Map());
  const registrationByMarkRef = useRef<Map<any, Registration>>(new Map());
  // Set once the first compute has run. After that, a registration change wakes
  // <Plot> with a version bump; before it, the mount commit computes anyway, so
  // a bump there would compute (and emit warnings) twice.
  const computedRef = useRef(false);
  const legendsRef = useRef<Map<string, LegendRegistration>>(new Map());
  // Registration order for this commit, one list per registry, reconciled in
  // the layout effect below. See recordOrder and adoptOrder for why the order
  // has to be recorded per commit rather than read off the Map.
  const pendingLegendOrderRef = useRef<string[]>([]);
  const pendingMarkOrderRef = useRef<string[]>([]);
  const pendingScaleOrderRef = useRef<string[]>([]);
  // Registrations whose component unmounted this commit. They are held until
  // the reconciliation below, rather than deleted on the spot, so that a
  // StrictMode simulated unmount — which destroys and recreates every effect
  // (create, destroy, create) — is told apart from a real unmount. See
  // sweepRetired.
  const retiredLegendRef = useRef<Set<string>>(new Set());
  const retiredMarkRef = useRef<Set<string>>(new Set());
  const retiredScaleRef = useRef<Set<string>>(new Set());
  // Re-render fodder, deliberately unread: a registration that changes a stamp
  // bumps one of these so <Plot> renders again at all. The inputs key in the
  // compute effect, not the counter, decides whether that render recomputes.
  const [, setVersion] = useState(0);
  const [, setLegendsVersion] = useState(0);
  const [resolved, setResolved] = useState<ResolvedScales | null>(null);
  // The same resolved values, readable from a closure that cannot see state.
  // Written in the compute effect immediately before setResolved, so the two
  // always name the same pass.
  const resolvedRef = useRef<ResolvedScales | null>(null);
  const [mode, setMode] = useState<Mode>({kind: "empty"});

  // The pointer selection store, created here rather than in <PointerRoot>
  // because two of the three things it needs are only available at this level.
  // It has to outlive the <svg> — a plot whose last pointer consumer is removed
  // unmounts <PointerRoot> with the slot that was showing a datum, and the
  // clearing value still has to be reported — and its settle() has to run after
  // the plot's ROOT ELEMENT has been attached, which is this component's own
  // layout effect and nothing lower. <PointerRoot> keeps the rest: the store is
  // handed to it, and it wires the <svg>'s listeners into it and disposes it.
  const [pointerStore] = useState(createPointerStore);

  // The options this render was given, for the plotOptions accessor below, which
  // has no other way to see them. Assigned during render, like onValueRef: it is
  // a read-only mirror of a prop, not a side effect.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // The context value, built ONCE and never rebuilt. Everything in it closes
  // over refs and state setters and nothing else, so the first render's copies
  // stay correct for the life of the plot — which is what lets the value keep
  // its identity across renders. That identity is load-bearing twice over: a
  // consumer re-renders when the plot resolves something new for it rather than
  // on every render of the plot (#148), and StrictMode's simulated unmount is
  // survivable because marks and scales re-register from their own effects,
  // instead of depending on a changed context re-rendering them into doing it.
  const [ctx] = useState<PlotContextValue>(() => ({
    registerMark: (id, stamp, factory, handlers) => {
      recordOrder(pendingMarkOrderRef, id);
      const prev = marksRef.current.get(id);
      // A changed stamp is the plot's cue to rebuild: the registration is
      // replaced and <Plot> is woken. Same-stamp re-registration happens on
      // every commit, so it only refreshes the factory and handlers in place
      // (a handler identity change must not rebuild the plot). The wake is
      // skipped before the first compute, which this same commit performs
      // anyway; bumping would compute — and emit warnings — twice on mount.
      if (!prev || prev.stamp !== stamp) {
        marksRef.current.set(id, {stamp, factory, handlers});
        if (computedRef.current) setVersion((v) => v + 1);
      } else {
        prev.factory = factory;
        prev.handlers = handlers;
      }
    },
    // Removal is unmount-driven (useMark's cleanup), NOT inferred from who
    // re-registered this commit: when <Plot> re-renders from its own state,
    // unchanged children bail out of rendering and never call registerMark, so
    // any presence-based sweep would wrongly drop live marks. Retirement is
    // deferred to the reconciliation below, which can tell a real unmount from
    // the destroy half of StrictMode's simulated one; see sweepRetired. Waking
    // <Plot> is what makes that reconciliation happen at all when nothing else
    // re-rendered this component.
    unregisterMark: (id) => {
      if (retireRegistration(retiredMarkRef, marksRef, id)) setVersion((v) => v + 1);
    },
    // Scale components register like marks: from their own layout effect,
    // stamped by prop values so a prop change wakes the plot, with same-stamp
    // re-registration refreshing the stored config in place (function
    // identities are excluded from the stamp).
    registerScale: (id, stamp, scaleName, config) => {
      recordOrder(pendingScaleOrderRef, id);
      const prev = scalesRef.current.get(id);
      if (!prev || prev.stamp !== stamp) {
        scalesRef.current.set(id, {stamp, scaleName, config});
        if (computedRef.current) setVersion((v) => v + 1);
      } else {
        prev.config = config;
      }
    },
    // Unmount-driven removal, mirroring unregisterMark.
    unregisterScale: (id) => {
      if (retireRegistration(retiredScaleRef, scalesRef, id)) setVersion((v) => v + 1);
    },
    // Legends register from their own layout effect, like marks and scales do
    // now. Legend registrations do NOT feed computePlot, so they bump their own
    // version rather than the plot's. A changed stamp stores a fresh
    // registration; same-stamp re-registration only refreshes the stored props
    // (function identities are excluded from the stamp). Each call also records
    // this commit's registration order, which the layout effect below
    // reconciles against the registry: Map insertion order alone would freeze
    // legends at mount order, because React moves keyed instances without
    // remounting them. Last-wins dedupe keeps the order correct under
    // StrictMode double-invocation and heals stale entries from partial commits
    // that <Plot>'s effect never observed.
    registerLegend: (id, stamp, props) => {
      recordOrder(pendingLegendOrderRef, id);
      const prev = legendsRef.current.get(id);
      if (!prev || prev.stamp !== stamp) {
        legendsRef.current.set(id, {stamp, props});
        setLegendsVersion((v) => v + 1);
      } else {
        prev.props = props;
      }
    },
    // Unmount-driven removal, mirroring unregisterMark.
    unregisterLegend: (id) => {
      if (retireRegistration(retiredLegendRef, legendsRef, id)) setLegendsVersion((v) => v + 1);
    },
    // Accessors rather than fields: the values are replaced by the compute
    // effect and read on demand, so the value object around them can stay
    // identical. Read during render — they are a snapshot of the last pass, not
    // a subscription.
    get scaleDescriptors() {
      return resolvedRef.current?.scaleDescriptors;
    },
    get context() {
      return resolvedRef.current?.context;
    },
    get plotOptions() {
      return resolvedRef.current?.plotOptions ?? optionsRef.current;
    }
  }));

  // Reads the CURRENT handlers for a built mark instance. Stable identity so
  // passing it down doesn't churn props; event closures call it at dispatch
  // time, so a handler-identity update takes effect without any rebuild.
  const getMarkHandlers = useRef(
    (mark: any): MarkEventHandlers | undefined => registrationByMarkRef.current.get(mark)?.handlers
  ).current;

  // THE REGISTRATION RECONCILIATION, and the first of this component's two
  // layout effects. No dependency array: a registry can change in any commit of
  // this component, and the adoption is a no-op in the ones where nothing did.
  useLayoutEffect(() => {
    // Child effects run before this one, so both the recorded registration
    // order and the retirements are complete for this commit. Sweep first:
    // deleting can remove the entry an adoption would have ordered, and the
    // sweep is also what reports the change. A legend registry change is not
    // otherwise visible to this component, hence its own version; marks and
    // scales need none — the inputs key below is taken over the registries as
    // they are once this effect has run, so a deletion or a reorder differs
    // from the last key and the compute runs in this same commit.
    if (sweepRetired(retiredLegendRef, pendingLegendOrderRef, legendsRef)) setLegendsVersion((v) => v + 1);
    sweepRetired(retiredMarkRef, pendingMarkOrderRef, marksRef);
    sweepRetired(retiredScaleRef, pendingScaleOrderRef, scalesRef);
    // When every registered entry re-registered (a full re-render of the
    // children), adopt that order: this is what makes reordering keyed
    // <Legend> children reorder the output, and what makes the mark list
    // follow the children rather than the order they happened to mount in
    // (#145 — a rule written before the dots but mounted a commit later used to
    // draw on top of them). Partial commits (a lone mark re-rendered or
    // mounted by its wrapper) can't reveal sibling order, so they keep the
    // existing order, appending new registrations.
    if (adoptOrder(pendingLegendOrderRef, legendsRef)) setLegendsVersion((v) => v + 1);
    adoptOrder(pendingMarkOrderRef, marksRef);
    adoptOrder(pendingScaleOrderRef, scalesRef);
  });

  const lastInputsRef = useRef<string | null>(null);
  const onValueRef = useRef(onValue);
  onValueRef.current = onValue;
  const figureRef = useRef<HTMLElement | null>(null);
  const svgElementRef = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    computedRef.current = true;
    // Recompute directly when the effective inputs changed, rather than bumping
    // a version and waiting for the next commit's effect to notice: the
    // registrations this pass must see were taken by children in THIS commit,
    // and a registration change wakes <Plot> with a version bump of its own, so
    // there is nothing left for a dirty flag to add.
    //
    // Registration ids change when children remount without any real change —
    // e.g. when the tree gains a <figure> once auto-legends resolve — waking
    // <Plot> while every stamp stays the same. Recomputing then would be wasted
    // work and would re-emit computePlot warnings, so skip when the effective
    // inputs are unchanged; that guard is also what stops a commit that only
    // setMode or setResolved caused from computing again. (onValue is excluded
    // entirely, like functions in mark stamps: the pointer store reads it
    // through a ref at dispatch time, so neither its identity nor its presence
    // changes anything computePlot produces.)
    const inputsKey = [
      ...[...marksRef.current.values()].map((r) => r.stamp),
      ...[...scalesRef.current.values()].map((r) => r.stamp),
      stableKey(options),
      String(classNameProp),
      stableKey({style})
    ].join("\u0000");
    if (inputsKey === lastInputsRef.current) return;
    lastInputsRef.current = inputsKey;
    const flat: any[] = [];
    // Maps each built mark instance to its registration so <MarkSlot> can read
    // the registration's CURRENT handlers at render and event time (handler
    // identity changes refresh the registration without a recompute, so the
    // instances — and this map — stay valid).
    const registrationByMark = new Map<any, Registration>();
    const markKeys = new Map<any, string>();
    for (const [id, registration] of marksRef.current) {
      const m = registration.factory();
      const built = Array.isArray(m) ? m : [m];
      for (const one of built) {
        flat.push(one);
        if (registration.handlers) registrationByMark.set(one, registration);
      }
      // useMark's id comes from useId, which survives every rebuild of the mark
      // objects a registration produces, so the key does not move when a mark's
      // data or options change. The suffix is the leaf's position within this
      // one registration's own output — a crosshair yields a rule and a text —
      // which is fixed by the factory, not by what the rest of the plot
      // contains. What useId does NOT give is component identity: React assigns
      // it at MOUNT from a global counter and keeps it in the fiber's hook
      // state, so it names a POSITION that a reused fiber inherits. Removing
      // the first of two unkeyed sibling marks hands the survivor the first
      // one's id, and with it this key. No key scheme can defend against that,
      // because React genuinely considers the reused fiber to be the same
      // component instance; what defends the pointer selection is that the
      // store re-resolves it against the mark the record now holds (see settle
      // in pointerStore.ts), which is a search the pointer is nowhere near.
      (built as any[]).flat(Infinity).forEach((one: any, k: number) => {
        if (one != null) markKeys.set(one, `m${id}#${k}`);
      });
    }
    registrationByMarkRef.current = registrationByMark;
    // Merge scale-component registrations (<ScaleY>, <ScaleColor>, …) into
    // the plot-level options. Multiple components for the same scale merge in
    // registration order (later wins per key). Precedence on conflict: an
    // explicit object-form prop on <Plot> itself (e.g. y={{type: "log"}})
    // wins over scale components per conflicting key, and a non-object
    // explicit prop (e.g. projection="albers-usa") replaces them entirely.
    let effectiveOptions: Record<string, any> = options;
    if (scalesRef.current.size > 0) {
      effectiveOptions = {...options};
      const merged = new Map<string, Record<string, any>>();
      for (const {scaleName, config} of scalesRef.current.values()) {
        merged.set(scaleName, {...merged.get(scaleName), ...config});
      }
      for (const [scaleName, config] of merged) {
        const explicit = (options as Record<string, any>)[scaleName];
        effectiveOptions[scaleName] =
          explicit === undefined ? config : isPlainOptionsObject(explicit) ? {...config, ...explicit} : explicit;
      }
    }
    let computed: any;
    try {
      // Always run computePlot, even with zero marks: declared position scales
      // (e.g. x={{type: "log", …}}) infer implicit axis marks, so a markless
      // <Plot> can still render axes — matching the imperative plot().
      computed = computePlot({...effectiveOptions, marks: flat, style});
    } catch (e) {
      console.error("Plot: computePlot failed.", e);
      setMode((prev) => (prev.kind === "empty" ? prev : {kind: "empty"}));
      return;
    }

    // Nothing to render (no marks and no inferred axes); keep the empty host.
    if (!computed.marks.length) {
      setMode((prev) => (prev.kind === "empty" ? prev : {kind: "empty"}));
      return;
    }

    // Slot keys are React fiber identity, and a pointer slot's fiber carries the
    // registration record holding its selection. Keying by position in
    // computed.marks would hand that record to whatever pointer consumer
    // shifted into the slot whenever a mark was added or removed anywhere in
    // the plot, so the key names the registration the mark came from instead —
    // and the mark object cannot supply it, because useMark rebuilds its
    // instances on every stamp change. This narrows the problem; it does not
    // close it (see the useId note above), which is why the store re-resolves
    // every record at the pointer once a commit has settled.
    computed.markKeys = markKeysOf(computed.marks, markKeys);

    // Published to the stable context value's accessors and, for the parts
    // <Plot> itself renders from, to state. Both are written together, so they
    // always name the same pass.
    const nextResolved = {
      scaleDescriptors: computed.scaleDescriptors,
      context: computed.context,
      plotOptions: effectiveOptions
    };
    resolvedRef.current = nextResolved;
    setResolved(nextResolved);

    // Drain the global warning counter just as the imperative plot() does, so
    // the warn() dedupe state (lastMessage) doesn't leak across plots and we
    // can render the ⚠️ indicator. computePlot emits warnings during mark
    // initialization above.
    const warnings = consumeWarnings();

    const onSvgRef = (svg: SVGSVGElement | null) => {
      if (!svg) return;
      // Expose scale on the svg, matching imperative API.
      (svg as any).scale = computed.scales?.scales ?? null;
      if (classNameProp) svg.classList.add(classNameProp);
      // Apply the plot-level style option to the <svg>, mirroring
      // applyInlineStyles on the imperative path (string or object).
      if (typeof style === "string") svg.setAttribute("style", style);
      else if (style != null) Object.assign(svg.style, style as any);
    };

    // Carry the plot's root element onto the NEW context's figureHolder here,
    // rather than leaving it to the holder effect below. computePlot builds a
    // fresh context per recompute, and so a fresh holder whose `current` is
    // null, which a dispatch cannot reach `.value` through. The pointer's own
    // reports are settled from a layout effect below, after the holder effect
    // has filled it; this earlier assignment covers a plain pointer move that
    // arrives in the window between this compute pass and that commit. The root
    // element does not change across a recompute, so it is not a guess; the
    // effect below still owns the case where the root itself changes, which is
    // figure mode appearing or going away.
    if (computed.context?.figureHolder != null) {
      computed.context.figureHolder.current = figureRef.current ?? svgElementRef.current;
    }

    const pointerEnabled = computed.marks.some(isPointerConsumer);
    setMode({kind: "jsx", computed, onSvgRef, pointerEnabled, warnings});
    // No dependency array: the inputs key above is the guard, and it is taken
    // over the registries as the reconciliation above just ordered them.
  });

  // The plot's root ELEMENTS, for the viewof contract below. The <svg> arrives
  // through the compute effect's own ref callback (which applies the className
  // and the plot-level style), so this wrapper records it on the way past.
  const setSvgElement = (svg: SVGSVGElement | null) => {
    svgElementRef.current = svg;
    if (mode.kind === "jsx") mode.onSvgRef(svg);
  };

  // Auto-legends (color/opacity/symbol scales with legend requested) render
  // via the React legend components and force figure mode, matching the
  // imperative plot()'s createLegends behavior.
  const autoLegends = resolved?.scaleDescriptors
    ? buildAutoLegends(resolved.scaleDescriptors, resolved.context, resolved.plotOptions ?? options)
    : [];

  // Explicit <Legend> descendants register via PlotContext (like marks via
  // useMark) and render visibly here as <LegendDisplay>, matching the
  // imperative plot()'s createLegends/exposeLegends placement above the
  // <svg>. The <Legend> instances themselves render null inside the hidden
  // children div, so any composition (memo, wrapper components, fragments)
  // still surfaces the legend. Any registered legend forces figure mode.
  // Registry order tracks the children's render order via the layout-effect
  // reconciliation above, so keyed reorders update the visible order.
  const explicitLegends: ReactElement[] = [...legendsRef.current.entries()].map(([id, r]) => (
    <LegendDisplay key={id} {...r.props} />
  ));

  // "always"/true forces a figure; "never"/false suppresses it; "auto" (or
  // undefined) infers it from whether there's anything to wrap.
  const autoFigure = Boolean(title || subtitle || caption || autoLegends.length > 0 || explicitLegends.length > 0);
  const wantsFigure =
    figure === "always" || figure === true ? true : figure === "never" || figure === false ? false : autoFigure;

  // Upstream reports the pointer selection through context.dispatchValue
  // (src/plot.ts:189-194, verbatim from plot.js): it assigns `.value` on the
  // plot's root element and dispatches a bubbling `input` event there. That
  // root is the <figure> when the plot has one and the <svg> otherwise —
  // upstream's plot() sets figureHolder.current in exactly those two places
  // (plot.js:157/333/340) — and until this effect existed nothing on the React
  // path ever filled the holder, so dispatchValue returned at its first line
  // and viewof was dead. A layout effect is the right seam: React attaches a
  // child's host refs before running a parent's layout effects, so both refs
  // are populated here, and the assignment lands before any pointer event can
  // be delivered.
  useLayoutEffect(() => {
    const holder = mode.kind === "jsx" ? mode.computed.context?.figureHolder : null;
    if (holder == null) return;
    holder.current = figureRef.current ?? svgElementRef.current;
  }, [mode, wantsFigure]);

  // THE POINTER'S SETTLING POINT, and the last thing to run in any commit of
  // this plot: React runs layout effects child first, so every pointer slot has
  // registered by now, and the effect above has just pointed the context's
  // figure holder at the root element this commit produced.
  //
  // Both orderings are why it is here rather than beside the slots or inside
  // <PointerRoot>. Re-resolving as each slot registers would arbitrate against
  // the half-populated registry a commit passes through — React runs every
  // layout-effect cleanup before any of the creates — and report values for
  // winners that lose again in the same commit. Reporting from any earlier
  // effect would dispatch through a figure holder that this commit has just
  // replaced, which is why a plot that gained or lost its <figure> in the same
  // commit used to drop its clearing value in silence.
  //
  // No dependency array: a registration can change in any commit of this
  // component, and settle() is a no-op in the ones where nothing did.
  useLayoutEffect(() => {
    pointerStore.setValueSink(mode.kind === "jsx" ? mode.computed.context?.dispatchValue ?? null : null);
    pointerStore.settle();
  });

  // In figure mode, wrap the plot in a div.plot-host inside the figure to
  // match the imperative API's structure (figure > h2/h3 > div.plot-host > svg
  // > figcaption). In non-figure mode, return the SVG directly (matching the
  // existing .svg-snapshot test expectations) or the imperatively-mounted
  // host div.
  const plotElement =
    mode.kind === "jsx" ? (
      <PlotSvg
        computed={mode.computed}
        svgRef={setSvgElement}
        className={classNameProp}
        pointerEnabled={mode.pointerEnabled}
        pointerStore={pointerStore}
        onValueRef={onValueRef}
        warnings={mode.warnings}
        getHandlers={getMarkHandlers}
      />
    ) : (
      <div className="plot-host" />
    );

  // The hidden registration div keeps a stable position in the tree across
  // figure-mode changes: if it moved inside <FigureLayout> when a figure
  // appears, React would remount the children subtree, wiping descendant
  // state — a legend mounted by a stateful wrapper would flip figure mode,
  // remount (and so reset) that wrapper, and immediately unregister itself.
  return (
    <PlotContext.Provider value={ctx}>
      {wantsFigure ? (
        <FigureLayout
          title={title}
          subtitle={subtitle}
          caption={caption}
          autoLegends={autoLegends}
          explicitLegends={explicitLegends}
          plotElement={plotElement}
          isJsx={mode.kind === "jsx"}
          figureRef={figureRef}
        />
      ) : (
        <>
          {explicitLegends}
          {plotElement}
        </>
      )}
      <div style={{display: "none"}}>{wrapFunctionChildren(children)}</div>
    </PlotContext.Provider>
  );
}

// A bare function child of <Plot> is a function mark (Observable Plot's
// mark-as-a-render-function): plot.ts's markify wraps it in a Render mark
// whose output — possibly a detached DOM node, e.g. htl svg`<defs>…` — is
// inlined into the <svg>.
function FunctionMark({render}: {render: (...args: unknown[]) => unknown}) {
  useMark({name: "render", options: {}, create: () => [render as any]});
  return null;
}

// React drops (or warns on) function children, so replace each with a
// <FunctionMark> registration. Untouched trees pass through unchanged; a
// transformed array gets index keys (the children are positional anyway).
function wrapFunctionChildren(node: unknown): ReactNode {
  if (typeof node === "function") return <FunctionMark render={node as (...args: unknown[]) => unknown} />;
  if (!Array.isArray(node) || !node.some(containsFunctionChild)) return node as ReactNode;
  return node.map((child, i) =>
    typeof child === "function" ? (
      <FunctionMark key={i} render={child} />
    ) : Array.isArray(child) ? (
      <Fragment key={i}>{wrapFunctionChildren(child)}</Fragment>
    ) : isValidElement(child) && child.key == null ? (
      cloneElement(child, {key: i})
    ) : (
      (child as ReactNode)
    )
  );
}

function containsFunctionChild(node: unknown): boolean {
  return typeof node === "function" || (Array.isArray(node) && node.some(containsFunctionChild));
}

// Renders the whole plot as a JSX <svg> tree.
function PlotSvg({
  computed,
  svgRef,
  className: classNameProp,
  pointerEnabled,
  pointerStore,
  onValueRef,
  warnings,
  getHandlers
}: any) {
  const {className, ariaLabel, ariaDescription, dimensions} = computed;
  const {width, height} = dimensions;
  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  const setSvgRef = (el: SVGSVGElement | null) => {
    internalSvgRef.current = el;
    if (typeof svgRef === "function") svgRef(el);
  };
  const styleText = `:where(.${className}) {
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
  // Render the ⚠️ warning indicator after the marks, matching the imperative
  // plot() (font-family="initial" fixes emoji rendering in Chrome).
  const warningIndicator =
    warnings > 0 ? (
      <text x={width} y={20} dy="-1em" textAnchor="end" fontFamily="initial">
        {"⚠️"}
        <title>{`${warnings.toLocaleString("en-US")} warning${
          warnings === 1 ? "" : "s"
        }. Please check the console.`}</title>
      </text>
    ) : null;
  // Allocate clip-path defs up front (pre-pass) so they're known before the
  // marks that reference them are rendered, then render them in the <svg>.
  const clipReg = createClipRegistry();
  registerClips(computed, clipReg);
  const inner = (
    <>
      <style>{styleText}</style>
      {clipReg.defs}
      {renderMarks(computed, clipReg, getHandlers)}
      {warningIndicator}
    </>
  );
  return (
    <svg
      ref={setSvgRef}
      className={[className, classNameProp].filter(Boolean).join(" ") || undefined}
      fill="currentColor"
      fontFamily="system-ui, sans-serif"
      fontSize={10}
      textAnchor="middle"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={ariaLabel ?? undefined}
      aria-description={ariaDescription ?? undefined}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      {pointerEnabled ? (
        <PointerRoot store={pointerStore} svgRef={internalSvgRef} onValueRef={onValueRef}>
          {inner}
        </PointerRoot>
      ) : (
        inner
      )}
    </svg>
  );
}

// Computes the per-facet transform string by invoking the imperative
// facetTranslator against a minimal element shim (it sets a "transform"
// attribute for <g> hosts). Returns undefined when there is no offset.
function facetTransform(facetTranslate: any, f: any): string | undefined {
  if (typeof facetTranslate !== "function") return undefined;
  let transform: string | undefined;
  facetTranslate.call(
    {
      tagName: "g",
      setAttribute: (k: string, v: string) => {
        if (k === "transform") transform = v;
      }
    },
    f
  );
  return transform;
}

// Completes the registered marks' keys with the marks computePlot creates for
// itself. Two kinds reach here: tips inferred from a `tip` option, which carry
// the mark they were inferred from (plot.ts's inferTips) and are keyed under
// it — these are pointer consumers, so they are exactly the ones a positional
// key would shuffle on every mark added or removed elsewhere in the plot; and
// implicit axis and grid marks, which are not pointer consumers and fall back
// to their position, in a namespace that cannot collide with a registration
// key.
function markKeysOf(marks: readonly any[], registered: Map<any, string>): Map<any, string> {
  const keys = new Map(registered);
  marks.forEach((mark, i) => {
    if (keys.has(mark)) return;
    const source = mark.tipFor === undefined ? undefined : keys.get(mark.tipFor);
    keys.set(mark, source === undefined ? `x${i}` : `${source}#tip`);
  });
  return keys;
}

// A callback that renders one mark instance (a mark at a given facet/index)
// to a ReactNode. Shared between the interactive React path (<MarkSlot>) and
// the static renderer used by the imperative plot() entry point.
export type RenderOne = (
  mark: any,
  index: any,
  values: any,
  dims: any,
  scales: any,
  context: any,
  key: string,
  // Render order of this (mark, facet) slot: markIndex * facetCount +
  // facetOrdinal, which cannot collide however many facets the plot has.
  // It is the pointer store's sort key, standing in for upstream's
  // renderIndex, so that the two order-sensitive pointer behaviours (whose
  // pooling infects the plot, and which slot claims a pointerdown) are decided
  // by render order rather than by the order React fires effects in.
  order: number,
  // Set only for one facet of a PROMOTED group (see renderMarksWith): the cell
  // transform this facet's node must carry in place of the mark transform,
  // which the walker has hoisted onto the shared parent along with the mark's
  // ARIA attributes. Undefined everywhere else, including every facet of an
  // unpromoted mark, whose node the walker wraps in its own <g transform>.
  facetTransform?: string
) => ReactNode;

// Walks the computed marks, resolving each mark's per-facet index and (for
// faceted marks) wrapping each facet in a <g transform> at its cell. The
// per-mark rendering is delegated to `renderOne` so the interactive and
// static paths share identical structure.
export function renderMarksWith(computed: any, renderOne: RenderOne, clipReg?: ClipRegistry): ReactNode[] {
  const {
    marks,
    stateByMark,
    facetStateByMark,
    scales,
    superdimensions,
    subdimensions,
    context,
    facets,
    facetDomains,
    facetTranslate
  } = computed;
  const out: ReactNode[] = [];
  // The slot order packs (markIndex, facetOrdinal) into one sortable number.
  // The stride is the plot's own facet count rather than a fixed 1000, because
  // f.i indexes `facets`: with a fixed stride a 32-by-32 grid already overflows
  // it and two different slots collide, which silently drops the pool
  // contagion and the pointerdown claimant back to effect-firing order.
  const stride = Math.max(1, facets?.length ?? 1);
  const keyOf = (mark: any, i: number): string => computed.markKeys?.get(mark) ?? `x${i}`;
  marks.forEach((mark: any, i: number) => {
    const {channels, values, facets: indexes} = stateByMark.get(mark);
    if (facets === undefined || mark.facet === "super") {
      let index: any = null;
      if (indexes) {
        index = indexes[0];
        index = mark.filter(index, channels, values);
        if (index.length === 0) return;
      }
      const node = renderOne(mark, index, values, superdimensions, scales, context, keyOf(mark, i), i * stride);
      if (node != null) out.push(node);
    } else {
      const facetMarks: ReactNode[] = [];
      // Upstream announces a faceted mark ONCE: it hoists aria-label,
      // aria-description, aria-hidden and the mark transform off the per-facet
      // nodes onto a single shared <g> per mark, then writes each facet's cell
      // transform onto the children in the vacated transform's place
      // (plot.js:313-325). Replot does that for pointer consumers only — the
      // same promotion for axes and every other faceted mark is a far larger
      // baseline change that this work does not own. The two-level target is
      // upstream's own tipDotFacets.svg baseline: an outer
      // <g aria-label="tip" transform="translate(0.5,0.5)"> holding one plain
      // <g fill=… stroke=… pointer-events=… transform="translate(295,148)">
      // per facet.
      // The facetTranslate guard is what makes `cell` a string for every facet
      // below, and the promotion is all-or-nothing per mark: a facet left with
      // its own ARIA attributes would defeat the whole point.
      const promote = isPointerConsumer(mark) && typeof facetTranslate === "function";
      for (const f of facets) {
        if (!(mark.facetAnchor?.(facets, facetDomains, f) ?? !f.empty)) continue;
        let index: any = null;
        if (indexes) {
          const faceted = facetStateByMark.has(mark);
          index = indexes[faceted ? f.i : 0];
          index = mark.filter(index, channels, values);
          if (index.length === 0) continue;
          if (!faceted && index === indexes[0]) index = subarray(index);
          (index.fx = f.x), (index.fy = f.y), (index.fi = f.i);
        }
        const cell = facetTransform(facetTranslate, f);
        const inner = renderOne(
          mark,
          index,
          values,
          subdimensions,
          scales,
          context,
          `${keyOf(mark, i)}-${f.i}`,
          i * stride + f.i,
          promote ? cell : undefined
        );
        if (inner == null) continue;
        // Translate each facet's marks to its cell, mirroring the imperative
        // pipeline's per-facet <g transform> (facetTranslator). Without this
        // wrapper every facet would render at the same origin (overlapping).
        // A promoted mark needs no wrapper: renderOne has written the cell
        // transform onto the mark's own node instead.
        facetMarks.push(
          promote ? (
            inner
          ) : (
            <g key={f.i} transform={cell}>
              {inner}
            </g>
          )
        );
      }
      if (facetMarks.length > 0) {
        out.push(
          <g
            key={keyOf(mark, i)}
            {...(promote ? promotedProps(mark, values, subdimensions, scales, context, clipReg) : null)}
          >
            {facetMarks}
          </g>
        );
      }
    }
  });
  return out;
}

// The four attributes upstream hoists from the per-facet nodes onto the shared
// group (plot.js:318-321), read off the mark as it renders AT REST.
//
// Upstream reads them back off a real DOM node it has just appended. Here the
// interactive path's facets are <PointerMarkSlot> COMPONENT elements, whose
// output the walker cannot inspect at all, so the mark is rendered once more
// with an empty index purely to read its root. That is sound because none of
// the four depends on the index — the transform is the crispness offset plus
// dx/dy plus any band offset — and cheap because an empty index is exactly
// what a pointer consumer renders until something is hovered. The clip wrap is
// reproduced because it is the OUTERMOST node upstream reads: a frame-clipped
// mark's wrapper carries the ARIA attributes and no transform, so the mark
// transform correctly stays inside.
function promotedProps(
  mark: any,
  values: any,
  dims: any,
  scales: any,
  context: any,
  clipReg?: ClipRegistry
): Record<string, any> {
  if (typeof mark.renderJSX !== "function") return {};
  let jsx: ReactNode;
  if (hasRenderTransform(mark)) {
    jsx = renderTransformJSX(mark, [], scales, values, dims, context) as ReactNode;
  } else {
    jsx = mark.renderJSX([], scales, values, dims, context) as ReactNode;
    if (isDomNode(jsx)) jsx = domToJsx(jsx);
  }
  if (!isValidElement(jsx)) return {};
  const node = clipReg ? clipReg.wrap(jsx as ReactElement, mark, dims, context) : jsx;
  if (!isValidElement(node)) return {};
  const props = (node as ReactElement).props as Record<string, any>;
  const promoted: Record<string, any> = {};
  for (const name of promotedNames) if (props[name] != null) promoted[name] = props[name];
  return promoted;
}

const promotedNames = ["aria-label", "aria-description", "aria-hidden", "transform"] as const;

// One facet of a promoted group: the attributes the walker hoisted onto the
// shared parent are removed here (upstream removeAttribute, plot.js:321) and
// the facet's cell transform is written in the vacated transform's place
// (upstream's facetTranslate pass, plot.js:325).
export function promoteFacetChild(node: ReactNode, cell: string): ReactNode {
  if (!isValidElement(node)) return node;
  return cloneElement(
    node as ReactElement<any>,
    {
      "aria-label": undefined,
      "aria-description": undefined,
      "aria-hidden": undefined,
      transform: cell
    } as any
  );
}

function renderMarks(
  computed: any,
  clipReg: ClipRegistry,
  getHandlers?: (mark: any) => MarkEventHandlers | undefined
): ReactNode[] {
  return renderMarksWith(
    computed,
    (mark, index, values, dims, scales, context, key, order, facetTransform) => {
      // The split is on the component TYPE, not on a prop or a branch inside
      // one component: <MarkSlot> holds no useContext(PointerContext) and no
      // pointer state at all, so an ordinary mark is structurally incapable of
      // re-rendering because the pointer moved.
      const Slot = isPointerConsumer(mark) ? PointerMarkSlot : MarkSlot;
      return (
        <Slot
          key={key}
          order={order}
          mark={mark}
          index={index}
          scales={scales}
          values={values}
          dims={dims}
          context={context}
          clipReg={clipReg}
          getHandlers={getHandlers}
          markData={getHandlers?.(mark) ? computed.stateByMark.get(mark)?.data : undefined}
          facetTransform={facetTransform}
        />
      );
    },
    clipReg
  );
}

// Renders one ordinary (non-pointer) mark via its renderJSX into pure React
// SVG. It holds no hooks and reads no context, so nothing about the pointer
// interaction can reach it: a plot of ten thousand dots is not rebuilt because
// a tip moved. Pointer consumers go through <PointerMarkSlot> instead, chosen
// by component type in renderMarks.
function MarkSlot({mark, index, scales, values, dims, context, clipReg, getHandlers, markData}: any) {
  if (typeof mark.renderJSX !== "function") return null;
  const arrayIndex = plainIndex(index);
  // renderJSX usually returns its own <g> wrapper; we don't add another, to
  // keep the DOM structure identical to the imperative output. Clip wrapping
  // (frame/geo) is applied via the clip registry. A user render option (a
  // render transform) executes against the imperative contract instead, with
  // the default renderJSX output supplied as `next`.
  let jsx: ReactElement;
  if (hasRenderTransform(mark)) {
    jsx = renderTransformJSX(mark, arrayIndex, scales, values, dims, context) as ReactElement;
  } else {
    jsx = mark.renderJSX(arrayIndex, scales, values, dims, context) as ReactElement;
    // Function marks (wrapped by plot.ts's Render) may return a detached DOM
    // node (htl's svg`…`); convert it so React can render it.
    if (isDomNode(jsx)) jsx = domToJsx(jsx) as ReactElement;
  }
  if (jsx == null) return null;
  // Per-mark event handlers attach as React event props (no DOM-structure
  // change): per element when the mark renders one element per datum,
  // mark-level otherwise. Presence changes rebuild the plot (stamped), so
  // this render-time decision stays in sync with the registration.
  const handlers = getHandlers?.(mark);
  if (handlers) jsx = attachMarkHandlers(jsx, arrayIndex, markData, handlers, () => getHandlers(mark));
  return <>{clipReg ? clipReg.wrap(jsx, mark, dims, context) : jsx}</>;
}

// Renders one pointer-consumer mark (a tip, a crosshair sub-mark, or any
// pointer()-wrapped mark) for one facet — exactly upstream's renderIndex slot.
// The slot owns a registration record in the plot's pointer store and renders
// only the datum that record has been awarded, which is an empty index until
// something is hovered.
function PointerMarkSlot({
  mark,
  index,
  scales,
  values,
  dims,
  context,
  clipReg,
  getHandlers,
  markData,
  order,
  facetTransform
}: any) {
  const store = pointerStoreOf(useContext(PointerContext));

  // Created once and kept for the life of the slot. The record OBJECT is the
  // registration's identity — there is no string key anywhere — so two tips,
  // or a crosshair's two identically-labelled rules, cannot collide. What it
  // does NOT carry across a recompute is any claim about the data: the store
  // re-resolves every registered record at the last pointer position once the
  // commit is over (see settle in interactions/pointerStore.ts), so a record
  // handed to a different mark by a reused fiber simply resolves against that
  // mark, at a position it is nowhere near, and shows nothing.
  const [reg] = useState(() => store.createRegistration());

  const sel = useSyncExternalStore(reg.subscribe, reg.getSnapshot, reg.getServerSnapshot);

  // `index` is reallocated by mark.filter on most plot re-renders, so this
  // effect DOES re-run whenever the plot recomputes — which is how the anchors,
  // the data and the facet correction stay in step with the scales. It is
  // deliberately not run on a pointer move: nothing it computes depends on the
  // pointer. It writes the record only from an effect, so the store (which
  // reads it from event handlers) can never see a half-filled record.
  //
  // WHATEVER THE INDEX IS, IT REGISTERS. An earlier revision also returned
  // early on an EMPTY index, on the reasoning that a slot which can draw no
  // datum has nothing to register — and that is exactly how a record goes
  // missing: it never comes back to the store, so nothing re-resolves it and
  // the plot goes on reporting a datum it has stopped drawing. An empty index
  // is simply a search that always misses, so it registers like any other, and
  // the store decides. (In practice one never arrives: renderMarksWith drops a
  // mark whose filtered index is empty, exactly as upstream's plot.js does at
  // 290/307, so the slot unmounts instead — which the store's departed-record
  // path reports. The guard here is for the channel-less mark, whose index is
  // null and which has nothing to hit-test at all.)
  useLayoutEffect(() => {
    if (index == null) return;
    Object.assign(reg, {
      order,
      mark,
      fi: index.fi ?? null,
      index: Array.from(index as ArrayLike<number>),
      dimensions: dims,
      context,
      data: context.getMarkState(mark).data,
      ...pointerKOf(mark),
      ...computeAnchors(mark, scales, values, dims, index)
    });
    return store.add(reg);
  }, [store, reg, order, mark, index, values, scales, dims, context]);

  if (typeof mark.renderJSX !== "function") return null;

  // The substituted index: upstream's `const I = i == null ? [] : [i]`, with
  // the facet markers carried across so a faceted mark still knows its cell —
  // a tip reads index.fx/index.fy to report the facet channels. The marker is
  // `fi`, exactly as upstream tests it (`const faceted = index.fi != null`):
  // a plot faceted only by fy has no fx at all.
  let renderIndex: any = index;
  if (index != null) {
    renderIndex = sel.i != null ? [sel.i] : [];
    if (index.fi != null) (renderIndex.fx = index.fx), (renderIndex.fy = index.fy), (renderIndex.fi = index.fi);
  }

  // No plainIndex() here: a pointer consumer's index is one this slot built,
  // so it is already a plain Array (or the null a channel-less mark was given).
  //
  // A user `render` option composed under pointer() runs HERE, over the
  // substituted index, so it sees exactly the datum the pointer has selected —
  // which is what upstream's composed closure does when it calls next(). Its
  // own render is recovered from the pointer tag (see userRenderOf).
  let jsx: ReactElement;
  if (hasRenderTransform(mark)) {
    jsx = renderTransformJSX(mark, renderIndex, scales, values, dims, context) as ReactElement;
  } else {
    jsx = mark.renderJSX(renderIndex, scales, values, dims, context) as ReactElement;
    if (isDomNode(jsx)) jsx = domToJsx(jsx) as ReactElement;
  }
  if (jsx == null) return null;
  // While the pointer is not sticky, a pointer-driven mark must not intercept
  // the very events that drive it (upstream defaults pointer-events to "none"
  // when context.pointerSticky === false). AFTER the transform branch on
  // purpose: upstream applies the default to everything rendered under a
  // pointer render, so a transform that wraps next()'s output must carry it on
  // that wrapper, which is the root this slot renders.
  if (!sel.sticky) jsx = defaultPointerEventsNone(jsx) as ReactElement;
  const handlers = getHandlers?.(mark);
  if (handlers) jsx = attachMarkHandlers(jsx, renderIndex, markData, handlers, () => getHandlers(mark));
  let out = (clipReg ? clipReg.wrap(jsx, mark, dims, context) : jsx) as ReactElement;
  // One facet of a promoted ARIA group (renderMarksWith's faceted branch):
  // drop the attributes now carried by the shared parent and take the facet's
  // cell transform instead of the mark transform.
  if (facetTransform !== undefined) out = promoteFacetChild(out, facetTransform) as ReactElement;
  // The store needs the rendered root to answer "was this pointerdown inside an
  // already-pinned mark?". rootRef is bound once per record, so attaching it
  // costs no detach/attach churn on a re-render.
  return cloneElement(out, {ref: reg.rootRef} as any);
}

// PlotSvg mounts a <PointerRoot> whenever the plot contains any pointer
// consumer, and renderMarks picks <PointerMarkSlot> by that very same
// predicate, so the context is always populated. Assert rather than degrade
// into a mark that renders correctly and can never be selected.
function pointerStoreOf(store: PointerStore | null): PointerStore {
  if (store == null) throw new Error("PointerMarkSlot: a pointer-consumer mark rendered outside a <PointerRoot>");
  return store;
}

// Coerces an index to a plain Array, preserving the facet markers. Marks call
// (index as number[]).map(...), but `index` is often a TypedArray (e.g.
// Uint32Array), whose .map() coerces the returned React elements back to
// numbers and corrupts the output.
function plainIndex(index: any): any {
  if (index == null || !ArrayBuffer.isView(index)) return index;
  const {fx, fy, fi} = index as any;
  return Object.assign(Array.from(index as any), {fx, fy, fi});
}

// Attaches the registered handlers to a mark's rendered JSX. Marks that
// render one element per datum (dot, bar, rect, cell, text, tick, …) emit
// their per-datum elements as the direct children of the mark's root <g>, in
// filtered-index order — so when the child count matches the index length,
// each child gets handlers with its datum index closed over. Otherwise
// (grouped marks like line/area render one path per series, and some marks
// nest further) the handlers attach at the mark level with datum/index
// undefined. Handler identity is read through `live` at dispatch time, so
// identity-only updates (which don't rebuild the plot) still take effect.
function attachMarkHandlers(
  jsx: ReactElement,
  index: number[] | null,
  data: any,
  attached: MarkEventHandlers,
  live: () => MarkEventHandlers | undefined
): ReactElement {
  if (!isValidElement(jsx)) return jsx;
  const children = Children.toArray((jsx.props as any).children);
  if (index != null && children.length === index.length && children.every((c) => isValidElement(c))) {
    return cloneElement(
      jsx,
      undefined,
      children.map((child, k) =>
        cloneElement(child as ReactElement, handlerProps(attached, live, data?.[index[k]], index[k]))
      )
    );
  }
  return cloneElement(jsx, handlerProps(attached, live, undefined, undefined));
}

function handlerProps(
  attached: MarkEventHandlers,
  live: () => MarkEventHandlers | undefined,
  datum: unknown,
  i: number | undefined
): Record<string, (event: any) => void> {
  const props: Record<string, (event: any) => void> = {};
  for (const type of markEventNames) {
    if (typeof attached[type] !== "function") continue;
    props[type] = (event: any) => {
      const handler = live()?.[type];
      if (typeof handler === "function") handler(event, datum, i);
    };
  }
  return props;
}

// Mirrors applyIndirectStyles' pointer-events default (upstream style.js):
// when the pointer context is not sticky, a pointer-driven mark's root group
// gets pointer-events="none" so it never intercepts the pointer events that
// drive it. An explicit mark-level pointerEvents (already emitted onto the
// root by renderJSX) wins.
export function defaultPointerEventsNone(jsx: ReactNode): ReactNode {
  if (!isValidElement(jsx)) return jsx;
  const props = jsx.props as Record<string, unknown>;
  if (props.pointerEvents != null || props["pointer-events"] != null) return jsx;
  return cloneElement(jsx as ReactElement<any>, {pointerEvents: "none"});
}

export function isPointerConsumer(mark: any): boolean {
  if (mark == null) return false;
  if (typeof mark.ariaLabel === "string" && mark.ariaLabel.startsWith("crosshair ")) return true;
  // Pointer-wrapped marks (Plot.pointer/pointerX/pointerY) tag their render
  // function; such marks render only the pointer-selected datum, so they start
  // empty until hover. (A bare `render` function alone is not enough — custom
  // render-prop marks have one too.)
  if (typeof mark.render === "function" && mark.render.pointer === true) return true;
  return false;
}

// Records that `id` registered in this commit, last-wins. React runs layout
// effects child first and siblings in tree order, so the recorded list is the
// registration order the children's own render produced; last-wins (rather
// than a plain push) keeps one entry per id when StrictMode double-invokes an
// effect and when a component's effect runs more than once in a commit.
function recordOrder(pendingRef: {current: string[]}, id: string): void {
  const pending = pendingRef.current;
  const at = pending.indexOf(id);
  if (at !== -1) pending.splice(at, 1);
  pending.push(id);
}

// Retires a registration whose component unmounted. It stays in the registry —
// and so keeps its place in the order — until the reconciliation below, which
// is the only stage that can tell the two ways a registration can be destroyed
// apart. StrictMode's simulated unmount destroys and recreates every effect it
// finds (create, destroy, create), so a mark that mounted in this commit is
// unregistered and re-registered within it; a real unmount is unregistered and
// left alone. Dropping the entry on the spot loses the first case's position:
// the entry leaves the middle of the registry and the re-registration appends
// it at the END, which is the children-order inversion #145 is about, arriving
// by the back door. Returns whether there was anything to retire.
function retireRegistration<T>(
  retiredRef: {current: Set<string>},
  registryRef: {current: Map<string, T>},
  id: string
): boolean {
  if (!registryRef.current.has(id)) return false;
  retiredRef.current.add(id);
  return true;
}

// Deletes the registrations that were retired in this commit and did not come
// back. A retirement counts as "came back" when the same commit also recorded a
// registration for the id — which child effects do before this effect runs, so
// the pending list is the register/destroy ledger for the commit. Returns
// whether the registry lost anything.
function sweepRetired<T>(
  retiredRef: {current: Set<string>},
  pendingRef: {current: string[]},
  registryRef: {current: Map<string, T>}
): boolean {
  const retired = retiredRef.current;
  if (retired.size === 0) return false;
  retiredRef.current = new Set();
  const pending = pendingRef.current;
  let changed = false;
  for (const id of retired) {
    if (pending.includes(id)) continue;
    if (registryRef.current.delete(id)) changed = true;
  }
  return changed;
}

// Adopts the order a commit recorded into a registry. A registry's Map key
// order freezes at MOUNT order — React moves keyed instances without
// remounting them, and every effect here is depless, so an instance's
// registration is only re-set when the instance itself re-renders — while the
// plot must draw in CHILDREN order (#145). The recorded order reveals that
// order only when the commit re-registered the WHOLE registry (i.e. every
// child re-rendered); a partial commit — one mark re-rendered, or a mark newly
// mounted by its wrapper — cannot see its siblings, so it keeps the existing
// order and the new registrations append. Returns whether the registry
// changed.
function adoptOrder<T>(pendingRef: {current: string[]}, registryRef: {current: Map<string, T>}): boolean {
  const pending = pendingRef.current;
  if (pending.length === 0) return false;
  pendingRef.current = [];
  const registry = registryRef.current;
  if (pending.length !== registry.size || !pending.every((id) => registry.has(id))) return false;
  const ordered = [...registry.keys()];
  if (!pending.some((id, i) => id !== ordered[i])) return false;
  registryRef.current = new Map(pending.map((id) => [id, registry.get(id)!]));
  return true;
}

// Only plain objects merge per-key with scale registrations; anything else
// (scale shorthand strings/booleans, projection names/factories, class
// instances) is taken wholesale.
function isPlainOptionsObject(v: unknown): v is Record<string, any> {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function subarray(index: any): any {
  return index.slice ? index.slice() : Array.from(index);
}

function stableKey(options: Record<string, any>): string {
  try {
    return JSON.stringify(options, (_k, v) => (typeof v === "function" ? "[fn]" : v));
  } catch {
    return String(Math.random());
  }
}
