import {useId, useLayoutEffect, useRef} from "react";
import type {MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent} from "react";
import {usePlotContext} from "./PlotContext.js";
import {useTransformContext} from "./TransformContext.js";
import type {Mark, Markish} from "../mark.js";

export type MarkFactory = () => Mark | Markish[];

// Per-mark event handlers. `datum` is the mark's (transformed) data element at
// the rendered index; both are undefined when the handler is attached at the
// mark level because per-element recovery isn't possible (e.g. grouped marks
// rendering one path per series).
export type MarkMouseEventHandler = (
  event: ReactMouseEvent<Element>,
  datum: unknown,
  index: number | undefined
) => void;

export type MarkPointerEventHandler = (
  event: ReactPointerEvent<Element>,
  datum: unknown,
  index: number | undefined
) => void;

export interface MarkEventHandlers {
  onClick?: MarkMouseEventHandler;
  onPointerEnter?: MarkPointerEventHandler;
  onPointerLeave?: MarkPointerEventHandler;
  onPointerMove?: MarkPointerEventHandler;
}

export const markEventNames = ["onClick", "onPointerEnter", "onPointerLeave", "onPointerMove"] as const;

export interface UseMarkOptions {
  // Mark name folded into the stamp (e.g. "dot").
  name: string;
  // Mark data; a new reference forces a rebuild (contents aren't hashed).
  data?: unknown;
  // Mark options as passed to the component, before transform wrapping.
  options: Record<string, any>;
  // Builds the imperative mark(s). Called per computePlot run with the options
  // after any enclosing transform wrappers have been applied.
  create: (data: any, options: Record<string, any>) => Mark | Markish[];
}

// Registers an imperative mark factory with the enclosing <Plot>. The factory
// closure is re-evaluated each time <Plot> rebuilds, so it can freely close
// over the latest props without forcing a re-registration. Any enclosing
// transform wrapper's wrap is applied inside that re-evaluation — never at
// render time — because transforms allocate lazy column() cells that
// computePlot fills per run.
export function useMark({name, data, options, create}: UseMarkOptions): void {
  const id = useId();
  const {registerMark, unregisterMark} = usePlotContext();
  const transform = useTransformContext();
  // The stamp can't cheaply hash array/object data contents, so track data
  // identity with a sequence number: any new reference bumps the stamp. The
  // bump happens in the registration effect rather than in render, because a
  // render can be discarded — StrictMode renders every component twice, and a
  // concurrent render can be thrown away before it commits — and a bump from a
  // render nobody kept would rebuild the plot for data it never received.
  const dataRef = useRef({data, seq: 0});
  // Event handler props are stripped before the options reach the imperative
  // mark factory (and any transform wrappers); they travel through the
  // registration instead. The stamp is taken over the FULL options, so handler
  // presence (stamped as "function", never identity) forces a rebuild that
  // lets <Plot> attach or detach the handlers.
  let handlers: MarkEventHandlers | undefined;
  let markOptions = options;
  for (const key of markEventNames) {
    if (typeof options[key] !== "function") continue;
    if (!handlers) (handlers = {}), (markOptions = {...options});
    (handlers as Record<string, unknown>)[key] = options[key];
    delete markOptions[key];
  }
  // Registration is effect-based, NOT render-phase: StrictMode's simulated
  // unmount runs the cleanup below with no re-render to follow it, so a
  // render-phase registration is simply lost, and re-registering anyway would
  // depend on something else re-rendering the mark. It is also depless, so the
  // registration is refreshed on every commit: a same-stamp re-registration
  // only swaps in the latest factory and handlers in place (a handler identity
  // change must not rebuild the plot), while a stamp change dirties the plot.
  // The effect runs before <Plot>'s own layout effects — children first — so a
  // plot always computes against the registrations of the commit it is in.
  useLayoutEffect(() => {
    if (dataRef.current.data !== data) dataRef.current = {data, seq: dataRef.current.seq + 1};
    const stamp = `${transform.stamp}${stampOptions(name, data, options)}|d${dataRef.current.seq}`;
    registerMark(id, stamp, () => create(data, transform.wrap(markOptions)), handlers);
  });
  // Removal is unmount-driven — <Plot> can't infer it, because bailed-out
  // children don't re-register.
  useLayoutEffect(() => () => unregisterMark(id), [unregisterMark, id]);
}

// Build a stable stamp from the mark name, data identity, and options. Option
// primitives (string/number/boolean) are included by value so e.g. a
// thresholds or field-name change forces a rebuild; arrays contribute their
// element values (recursively) so e.g. an explicit thresholds or domain array
// change forces a rebuild too. Plain objects contribute their entries
// (recursively, up to the depth and entry caps below, past which they fall
// back to shape only) so e.g. a sort or tip-format change forces a rebuild.
// Function identities are EXCLUDED so inline accessors don't force a
// rebuild — the factory closure already captures the latest functions.
export function stampOptions(name: string, data: unknown, options: Record<string, unknown>): string {
  const dataKey = data == null ? "null" : typeof data === "object" ? "obj" : String(data);
  const shape = Object.keys(options)
    .sort()
    .map((k) => `${k}:${stampValue(options[k])}`)
    .join(",");
  return `${name}|${dataKey}|${shape}`;
}

// Stamps run every render for every mark, so nested-object stamping is capped:
// past this depth, or for objects with more entries than the cap, the stamp
// degrades to shape only rather than walking arbitrarily large structures.
const stampDepthCap = 3;
const stampEntryCap = 32;

function stampValue(v: unknown, depth = 0): string {
  return v == null
    ? "null"
    : Array.isArray(v)
    ? `[${v.map((d) => stampValue(d, depth + 1)).join(",")}]`
    : typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    ? JSON.stringify(v)
    : v instanceof Date
    ? `date${+v}`
    : isPlainObject(v)
    ? stampObject(v as Record<string, unknown>, depth)
    : typeof v;
}

function stampObject(v: Record<string, unknown>, depth: number): string {
  const keys = Object.keys(v);
  if (depth >= stampDepthCap || keys.length > stampEntryCap) return "object";
  return `{${keys
    .sort()
    .map((k) => `${k}:${stampValue(v[k], depth + 1)}`)
    .join(",")}}`;
}

// Only plain objects are walked; class instances (scales, intervals, typed
// arrays' buffers, etc.) keep the shape-only stamp since their entries aren't
// guaranteed to be cheap or enumerable-stable.
function isPlainObject(v: unknown): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
