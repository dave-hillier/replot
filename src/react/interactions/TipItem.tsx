// The measurement seam for one tip item.
//
// Upstream's tip renders every item once with placeholder text metrics and
// then, in postrender, reads the exact size off the committed element with
// getBBox, re-lays the box out and — when no anchor was given — re-orients it
// to fit the frame (tip.js:212-245). A mark's renderJSX has no postrender
// hook, so the equivalent runs here: a layout effect measures the committed
// text, and the item re-renders with the measurement, which renderJSX turns
// into exactly the geometry postrender would have written.
//
// The measurement travels as a render prop rather than through a wrapper
// element: the item element IS the tip box's <g> (it carries the transform
// and the direct styles), and an extra wrapper would appear in the output and
// in every snapshot. TipItem therefore attaches its ref to the element the
// caller returns, and measures through that.
//
// What is measured is the item's <text>, not the item: the item also holds the
// box's <path>, which is laid out FROM the measurement and so has no d
// attribute to measure in the first place. The text's box is the same
// {x, width, height} upstream reads off the group, because the un-laid-out
// path contributes nothing to the group's box.

import {
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from "react";

/** The measured size of one tip item's text, in the item's own coordinates. */
export interface TipItemSize {
  /** The left edge of the text, relative to the anchor point. */
  x: number;
  /** The width of the widest line, rounded (upstream rounds for crisp edges). */
  width: number;
  /** The height of all the lines, rounded. */
  height: number;
}

/**
 * Renders one tip item, passing the measured text size to `render` as soon as
 * a layout engine can produce one. `render` is called with null until then,
 * which is every render on the server, in jsdom, and in a static snapshot.
 */
export function TipItem({render}: {render: (measured: TipItemSize | null) => ReactNode}): ReactNode {
  const ref = useRef<SVGGElement | null>(null);
  const [measured, setMeasured] = useState<TipItemSize | null>(null);
  // No dependency array: the item re-renders when a different datum's text
  // arrives, and the measurement has to follow the committed text each time.
  useLayoutEffect(() => {
    const text = ref.current?.querySelector("text") as SVGTextElement | null;
    if (typeof text?.getBBox !== "function") return undefined;
    let box: {x: number; y: number; width: number; height: number};
    try {
      box = text.getBBox();
    } catch {
      return undefined; // there is no layout engine after all; keep the estimate
    }
    if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) return undefined;
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    // Only the first measurement sees the text where the caller put it: the
    // geometry the first render writes shifts every line by -x, so a later
    // measurement reads that shift back off (box.x + x). An unchanged size
    // returns the very same object, because a fresh one would re-render
    // forever.
    setMeasured((previous) =>
      previous != null && previous.width === width && previous.height === height
        ? previous
        : {x: box.x + (measured?.x ?? 0), width, height}
    );
  });
  const node = render(measured);
  // A host element is required — the caller's item is what gets measured — and
  // a non-element (a string, say) has nothing to attach to.
  return isValidElement(node) ? cloneElement(node as ReactElement, {ref} as any) : node;
}
