import {useMark} from "../useMark.js";
import type {MarkProps} from "../markProps.js";
import {tip} from "../../marks/tip.js";
import type {TipOptions} from "../../marks/tip.js";

// Mark-specific options come from the imperative options interface; the
// shared MarkProps base contributes data and keeps the surface open (see
// markProps.ts for the openness rationale).
export interface TipProps extends MarkProps, TipOptions {}

// Registers the imperative Tip mark with the enclosing <Plot>. A tip is a
// pointer consumer, so <Replot>'s renderMarks routes it through
// <PointerMarkSlot> (see ./PointerContext.tsx and ./pointerStore.ts): with no
// pointer hover it renders an empty `<g aria-label="tip">` group, and on hover
// the slot substitutes the selected datum's index and tip.renderJSX produces
// the tooltip content.
export function Tip({data, ...options}: TipProps) {
  useMark({name: "tip", data, options, create: tip});
  return null;
}
