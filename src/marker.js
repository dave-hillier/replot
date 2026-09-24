// Markers are resolved here to a canonical name — or passed through as a custom
// marker function — together with a scope that keeps their ids apart; the
// actual <marker> SVG defs are produced as JSX by markerToJSX
// (src/react/Markers.tsx) inline alongside the referencing path. The resolved
// shape is ResolvedMarker, declared there.

export function markers(mark, {marker, markerStart = marker, markerMid = marker, markerEnd = marker} = {}) {
  // One scope per mark. A def resolves currentColor — and any CSS variable —
  // against its own ancestors, not against the path that references it, so two
  // marks sharing a def id would draw whichever of them comes first in the
  // document. markerToJSX mints its ids from this scope, which is why the scope
  // has to travel with the resolved marker rather than with the mark.
  const scope = {};
  mark.markerStart = maybeMarker(markerStart, scope);
  mark.markerMid = maybeMarker(markerMid, scope);
  mark.markerEnd = maybeMarker(markerEnd, scope);
}

function maybeMarker(marker, scope) {
  if (marker == null || marker === false) return null;
  if (marker === true) return {marker: "circle-fill", scope};
  if (typeof marker === "function") return {marker, scope}; // custom marker function
  const name = `${marker}`.toLowerCase();
  switch (name) {
    case "none":
      return null;
    case "circle":
      return {marker: "circle-fill", scope};
    case "arrow":
    case "arrow-reverse":
    case "dot":
    case "circle-fill":
    case "circle-stroke":
    case "tick":
    case "tick-x":
    case "tick-y":
      return {marker: name, scope};
  }
  throw new Error(`invalid marker: ${marker}`);
}
