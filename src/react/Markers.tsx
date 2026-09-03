// JSX wrappers for SVG <marker> defs. These mirror the imperative marker
// factories in src/marker.js but return React elements, so marks porting their
// imperative render() to renderJSX can include the <marker> definition inline
// alongside the <path> that references it (legal SVG: a <marker> is allowed
// anywhere a graphics element is, and resolves by id).
//
// We deliberately skip a Plot-level <defs> registry here. A registry would let
// identical (markerFn, color) pairs collapse to a single shared <marker>, but
// it requires Plot.tsx to provide a context and a post-render pass. Inlining
// per-mark is simpler, keeps each mark's renderJSX self-contained, and matches
// the imperative renderer closely enough for Phase 1. The registry is a
// follow-up optimisation in a Plot.tsx-level switch.
//
// Custom marker functions (the ones users pass via options.marker) still
// produce DOM nodes — those callers stay on the imperative path until a later
// unit replaces the MarkerFunction contract.

import type {ReactElement} from "react";
import type {Marker, MarkerName} from "../marker.js";

export interface MarkerJSX {
  /** Deterministic id derived from the marker shape + color. */
  id: string;
  /** The <marker> element to include as a sibling of the referencing path. */
  defJSX: ReactElement;
  /** The url(#id) string to set on markerStart / markerMid / markerEnd. */
  urlRef: string;
}

// Resolve the same shorthand as src/marker.js#maybeMarker, but return a
// canonical name we can render as JSX. Custom marker functions and the
// `none`/false/null cases return null so callers can fall back.
function resolveMarkerName(marker: Marker | "none" | boolean | null | undefined): MarkerName | null {
  if (marker == null || marker === false) return null;
  if (marker === true) return "circle-fill";
  if (typeof marker === "function") return null;
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

// FNV-1a hash, base36. The id only needs to be stable per shape + color
// within a single document; the `plot-m-` prefix avoids collisions with
// unrelated DOM ids.
function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; ++i) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function markerId(name: MarkerName, color: string): string {
  return `plot-m-${name}-${shortHash(color)}`;
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

/**
 * Resolve a marker option + stroke color to JSX for inline use. Returns null
 * for `none`/false/null/undefined so callers can short-circuit. Custom marker
 * functions (user-supplied) are not yet supported by the JSX path and also
 * return null — those plots stay on the imperative renderer.
 */
export function markerToJSX(marker: Marker | "none" | boolean | null | undefined, color: string): MarkerJSX | null {
  const name = resolveMarkerName(marker);
  if (!name) return null;
  const id = markerId(name, color);
  return {id, defJSX: renderMarker(name, color, id), urlRef: `url(#${id})`};
}
