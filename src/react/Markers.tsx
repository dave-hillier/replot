// JSX wrappers for SVG <marker> defs. These mirror the imperative marker
// factories in src/marker.js but return React elements, so marks porting their
// imperative render() to renderJSX can include the <marker> definition inline
// alongside the <path> that references it (legal SVG: a <marker> is allowed
// anywhere a graphics element is, and resolves by id).
//
// We deliberately skip a Plot-level <defs> registry here. A registry would let
// identical (marker, color) pairs collapse to a single shared <marker>, but it
// requires Plot.tsx to provide a context and a post-render pass. Inlining
// per-mark is simpler, keeps each mark's renderJSX self-contained, and matches
// the imperative renderer closely enough for Phase 1. The registry is a
// follow-up optimisation in a Plot.tsx-level switch.
//
// Custom marker functions (the ones users pass via options.marker) are drawn
// too: the function receives the stroke color and the render context (as
// upstream's MarkerFunction contract promises) and returns a <marker> element,
// which we convert back into React elements.

import type {ReactElement} from "react";
import type {Marker, MarkerFunction, MarkerName} from "../marker.js";
import {domToJsx, isDomNode} from "./domToJsx.js";

export interface MarkerJSX {
  /** A document-unique id for this def. */
  id: string;
  /** The <marker> element to include as a sibling of the referencing path. */
  defJSX: ReactElement;
  /** The url(#id) string to set on markerStart / markerMid / markerEnd. */
  urlRef: string;
}

/**
 * A marker option as src/marker.js#markers stores it: the marker itself (a
 * canonical name, or the user's function) together with the scope that keeps
 * this mark's defs distinct from every other mark's.
 */
export interface ResolvedMarker {
  marker: MarkerName | MarkerFunction;
  scope: object;
}

// The document a custom marker function builds its element in. Upstream passes
// the render context through (context.document); callers that don't have one to
// hand fall back to the global document, as src/context.js does. The element is
// only ever read (domToJsx) and re-created by React in the plot's own document.
export interface MarkerContext {
  document?: Document;
  [key: string]: any;
}

// A marker option reaches us in either shape: marks store the resolved form
// (markers() in src/marker.js), while a raw value — a name, a boolean, or a
// user function — can still be handed in directly. A raw value has no scope of
// its own, so all raw values share one; that keeps their ids stable and deduped
// the way a caller that never went through markers() expects.
const unscoped: object = {};

function isResolvedMarker(value: any): value is ResolvedMarker {
  return typeof value === "object" && value !== null && "marker" in value && "scope" in value;
}

// Resolve the same shorthand as src/marker.js#maybeMarker — already-resolved
// markers pass straight through — but keep custom marker functions as functions
// so we can call them at render. The `none`/false/null cases return null so
// callers can fall back.
function resolveMarker(marker: any): MarkerName | MarkerFunction | null {
  if (isResolvedMarker(marker)) return marker.marker;
  if (marker == null || marker === false) return null;
  if (marker === true) return "circle-fill";
  if (typeof marker === "function") return marker;
  const k = `${marker}`.toLowerCase();
  if (k === "none") return null;
  if (k === "circle") return "circle-fill";
  if (
    k === "arrow" ||
    k === "arrow-reverse" ||
    k === "dot" ||
    k === "circle-fill" ||
    k === "circle-stroke" ||
    k === "tick" ||
    k === "tick-x" ||
    k === "tick-y"
  ) {
    return k;
  }
  throw new Error(`invalid marker: ${marker}`);
}

// Custom marker functions are identified by function identity: two different
// functions drawing different shapes must not share a def even when they are
// given the same color. Named markers are identified by their canonical name.
const markerFunctionIds = new WeakMap<MarkerFunction, number>();
let nextMarkerFunctionId = 0;

function markerIdentity(marker: MarkerName | MarkerFunction): string {
  if (typeof marker !== "function") return marker;
  let id = markerFunctionIds.get(marker);
  if (id === undefined) markerFunctionIds.set(marker, (id = ++nextMarkerFunctionId));
  return `fn${id}`;
}

// The identity of a (marker, color) pair, ignoring the scope: within one mark a
// pair draws one def, and every mark draws its own copy of it.
function markerKey(marker: MarkerName | MarkerFunction, color: string): string {
  return `${markerIdentity(marker)}|${color}`;
}

// Upstream mints a fresh id per <marker> node it inserts (marker.js). The ids
// are document-global and must not repeat: a def resolves currentColor — and
// any CSS variable — against its own ancestors, not against the path that
// references it, so a second mark resolving a colliding id would draw the first
// mark's colors. The scope therefore separates the marks, while the id itself
// is remembered per (scope, marker, color): an interactive mark re-renders on
// every pointer move, and an id that changed with each render would remount its
// defs. The plot-marker- prefix matches upstream, and is what the snapshot
// harness reindexes into a stable sequence.
let nextMarkerId = 0;
const markerIds = new WeakMap<object, Map<string, string>>();

function markerIdFor(scope: object, marker: MarkerName | MarkerFunction, color: string): string {
  let ids = markerIds.get(scope);
  if (ids === undefined) markerIds.set(scope, (ids = new Map()));
  const key = markerKey(marker, color);
  let id = ids.get(key);
  if (id === undefined) ids.set(key, (id = `plot-marker-${++nextMarkerId}`));
  return id;
}

const tickOrient = {tick: "auto", "tick-x": 90, "tick-y": 0} as const;

function renderMarker(name: MarkerName, color: string, id: string): ReactElement {
  if (name === "arrow" || name === "arrow-reverse") {
    return (
      <marker
        id={id}
        viewBox="-5 -5 10 10"
        markerWidth={6.67}
        markerHeight={6.67}
        orient={name === "arrow" ? "auto" : "auto-start-reverse"}
        fill="none"
        stroke={color}
        strokeDasharray="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-1.5,-3l3,3l-3,3" />
      </marker>
    );
  }
  if (name === "dot") {
    return (
      <marker id={id} viewBox="-5 -5 10 10" markerWidth={6.67} markerHeight={6.67} fill={color} stroke="none">
        <circle r={2.5} />
      </marker>
    );
  }
  if (name === "circle-fill" || name === "circle-stroke" || name === "circle") {
    const filled = name !== "circle-stroke";
    return (
      <marker
        id={id}
        viewBox="-5 -5 10 10"
        markerWidth={6.67}
        markerHeight={6.67}
        fill={filled ? color : "var(--plot-background)"}
        stroke={filled ? "var(--plot-background)" : color}
        strokeDasharray="none"
        strokeWidth={1.5}
      >
        <circle r={3} />
      </marker>
    );
  }
  // tick, tick-x, tick-y
  return (
    <marker
      id={id}
      viewBox="-3 -3 6 6"
      markerWidth={6}
      markerHeight={6}
      orient={tickOrient[name] as any}
      stroke={color}
      strokeDasharray="none"
    >
      <path d="M0,-3v6" />
    </marker>
  );
}

// The context handed to a user-supplied marker function: the caller's render
// context when it has one, else the global document (as src/context.js
// defaults), else null — a document-less render cannot build the element, so
// the marker is dropped rather than drawn wrong. A function needs a document to
// build anything at all, which is why the context is narrowed here.
function markerRenderContext(context?: MarkerContext): (MarkerContext & {document: Document}) | null {
  if (context?.document) return context as MarkerContext & {document: Document};
  const document = typeof window !== "undefined" ? window.document : undefined;
  return document ? {document} : null;
}

// Calls a user-supplied marker function and converts the element it builds back
// into React elements. Upstream sets the id on the node the function returns
// (marker.js), so we do the same before reading it. A function that returns
// something other than an element is dropped, like any other invalid channel
// value.
function renderMarkerFunction(
  markerFn: MarkerFunction,
  color: string,
  id: string,
  context: MarkerContext & {document: Document}
): ReactElement | null {
  const node = markerFn(color, context);
  if (!isDomNode(node)) return null;
  node.setAttribute("id", id);
  return domToJsx(node) as ReactElement;
}

/**
 * Resolve a marker option + stroke color to JSX for inline use. Returns null
 * for `none`/false/null/undefined so callers can short-circuit. The same
 * (marker, color) pair on the same mark always yields the same id, so a caller
 * that draws many references to one marker can dedupe on it; two different
 * marks never share an id.
 */
export function markerToJSX(
  marker: Marker | ResolvedMarker | "none" | boolean | null | undefined,
  color: string,
  context?: MarkerContext
): MarkerJSX | null {
  const resolved = resolveMarker(marker);
  if (!resolved) return null;
  const id = markerIdFor(isResolvedMarker(marker) ? marker.scope : unscoped, resolved, color);
  if (typeof resolved === "function") {
    const renderContext = markerRenderContext(context);
    if (!renderContext) return null;
    const defJSX = renderMarkerFunction(resolved, color, id, renderContext);
    if (!defJSX) return null;
    return {id, defJSX, urlRef: `url(#${id})`};
  }
  return {id, defJSX: renderMarker(resolved, color, id), urlRef: `url(#${id})`};
}
