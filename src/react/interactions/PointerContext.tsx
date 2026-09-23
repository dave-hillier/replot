import {createContext, useEffect, type ReactNode, type RefObject} from "react";
import {type PointerStore} from "./pointerStore.js";

// The React seam of the pointer interaction. Everything that decides WHICH
// datum is selected lives in the React-free store (./pointerStore.ts) over the
// pure hit test (./pointerHitTest.ts), which in turn calls the helpers
// extracted from upstream's own closure in src/interactions/pointer.js. This
// file does one thing and no more: it wires the <svg>'s pointer events into the
// store <Replot> owns, and publishes that store to the marks below it.
//
// The context value is the STORE ITSELF, created once and never replaced, so
// its identity never changes. Consuming the context therefore cannot re-render
// a mark: the only thing that reaches React on a pointer move is the
// useSyncExternalStore subscription in <PointerMarkSlot>, and only for the
// slots whose selection actually changed.
export const PointerContext = createContext<PointerStore | null>(null);

export interface PointerRootProps {
  /**
   * The plot's store. Owned by <Replot> rather than created here, because it
   * has to outlive this component — the last pointer consumer can be removed
   * from a plot that stays — and because the commit-settling call that
   * re-resolves it (settle) belongs in the layout effect that runs after the
   * plot's root element is attached, which is <Replot>'s, not this one's.
   */
  store: PointerStore;
  svgRef: RefObject<SVGSVGElement | null>;
  /** The current <Replot onValue> callback, read through a ref at dispatch time. */
  onValueRef?: RefObject<((value: any) => void) | undefined>;
  children?: ReactNode;
}

/**
 * Provides the pointer store to the marks rendered inside the plot's `<svg>`
 * and subscribes that `<svg>` to the pointer events that drive it. Renders no
 * DOM of its own.
 */
export function PointerRoot({store, svgRef, onValueRef, children}: PointerRootProps) {
  // A PASSIVE effect, deliberately. <PointerRoot> mounts INSIDE the <svg>, and
  // a child's LAYOUT effect runs before the parent host element's ref is
  // attached, so svgRef.current is still null at that point. Passive effects
  // run after the whole tree has committed, by which time it is populated.
  useEffect(() => {
    const svg = svgRef.current;
    // Assert rather than returning early: a silent bail-out here leaves a plot
    // that renders correctly and never responds to the pointer, which is the
    // hardest possible failure to notice.
    if (svg == null) throw new Error("PointerRoot: the plot's <svg> was not attached before the effect ran");
    store.setOnValue((value) => onValueRef?.current?.(value));
    const onMove = (event: Event) => store.move(svg, event);
    const onDown = (event: Event) => store.down(event);
    const onLeave = (event: Event) => store.leave(event);
    // One set of listeners per plot, where upstream attaches one set per
    // rendered (mark, facet). A single listener sees every registration, so
    // pool and facet exclusivity resolve inside the move-coalescing frame
    // instead of needing upstream's second animation frame.
    svg.addEventListener("pointerenter", onMove);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointerleave", onLeave);
    return () => {
      svg.removeEventListener("pointerenter", onMove);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointerleave", onLeave);
      store.dispose();
    };
  }, [store, svgRef, onValueRef]);

  return <PointerContext.Provider value={store}>{children}</PointerContext.Provider>;
}
