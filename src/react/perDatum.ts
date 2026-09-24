// Per-datum element identity, for the event handlers registered in useMark.
//
// A mark's renderJSX returns a root whose direct children are usually one
// element per datum — but not always. Grouped marks (line, area, delaunayMesh)
// render one path per series, and several per-datum marks put a structural
// child (a marker's <defs>) among their elements. Counting those children
// against the index therefore says nothing about which child is which datum:
// a line with markers on three points in two series has three children and
// three data, so the count matched, the <defs> was handed datum 0, and every
// series path was shifted by one.
//
// So a mark tags the element it renders for a datum with that datum's index
// here, and the attachment (Replot.tsx's attachMarkHandlers) attaches per
// element only where a tag says which datum that element is. The tag is held
// in a WeakMap keyed by the element rather than in a prop, for two reasons: a
// prop would be serialized into the SVG, so the markup would depend on whether
// handlers were registered, and React drops symbol-keyed props and freezes
// elements in development. The tag is read only from the direct children of a
// mark's root, and the elements React renders are never mutated.
//
// Marks that render one element per datum call withDatumIndex as they build
// that element; a mark whose elements stand for a group of data (or for the
// mark as a whole) leaves them untagged, and its handlers attach at the mark
// level with no datum. Custom marks built on useMark do the same.
const indices = new WeakMap<object, number>();

// Tags `element` as the element rendered for datum `index`, and returns it, so
// a per-datum element can be built as `withDatumIndex(withHrefWrap(…), i)`.
export function withDatumIndex<T>(element: T, index: number): T {
  if (element !== null && typeof element === "object") indices.set(element as object, index);
  return element;
}

// The datum index of the element a mark tagged, or undefined for anything else
// — a <defs>, a grouped mark's per-series path, a text child.
export function datumIndexOf(element: unknown): number | undefined {
  return element !== null && typeof element === "object" ? indices.get(element as object) : undefined;
}
