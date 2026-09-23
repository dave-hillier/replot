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
// closure is re-evaluated each time <Plot> rebuilds, so it always sees the
// latest props — but a rebuild is scheduled only when a stamp changes, so a
// prop the stamp can see through is also what makes the new closure reach the
// plot at all. That is why functions, and every other value the stamp cannot
// read, are stamped by identity (#146, #149). Any enclosing transform wrapper's
// wrap is applied inside that re-evaluation — never at render time — because
// transforms allocate lazy column() cells that computePlot fills per run.
export function useMark({name, data, options, create}: UseMarkOptions): void {
  const id = useId();
  const {registerMark, unregisterMark, serverRender} = usePlotContext();
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
  // PRESENCE forces a rebuild that lets <Plot> attach or detach the handlers —
  // while their identity does not, and must not: an inline `onClick={…}` is a
  // new function on every render, and a handler is read live off the
  // registration at dispatch time, so its identity can never recompute the
  // plot. stampOptions enforces that by stamping a handler-named key by
  // presence, whichever way the value would otherwise be stamped.
  let handlers: MarkEventHandlers | undefined;
  let markOptions = options;
  for (const key of markEventNames) {
    if (typeof options[key] !== "function") continue;
    if (!handlers) (handlers = {}), (markOptions = {...options});
    (handlers as Record<string, unknown>)[key] = options[key];
    delete markOptions[key];
  }
  // The registration this commit (or this render, on a server) makes. The
  // stamp is the same either way, data-sequence bump included, so the two
  // paths cannot describe the same mark differently.
  const registration = () => {
    if (dataRef.current.data !== data) dataRef.current = {data, seq: dataRef.current.seq + 1};
    return `${transform.stamp}${stampOptions(name, data, options)}|d${dataRef.current.seq}`;
  };
  // THE EXCEPTION TO THE RULE BELOW, and it is a narrow one: a server render
  // (renderToString) runs no effects at all, so a registration taken in this
  // component's layout effect is never taken, and a plot that would have drawn
  // this mark draws an empty host instead (#147). There is no commit to be
  // discarded and no simulated unmount to survive there, so the reasons the
  // effect path exists do not apply: the registration is taken while this
  // component renders. The ordering contract is the one renderMarksWith
  // relies on — tree order — and it holds for a different reason than it does
  // in the browser: a first server pass renders each component exactly once,
  // in depth-first order, so the registrations arrive in the order the marks
  // are written (see ServerPlot, which is where the plot is computed from
  // them, and only after this render has finished).
  if (serverRender) {
    registerMark(id, registration(), () => create(data, transform.wrap(markOptions)), handlers);
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
    // Called unconditionally, because hooks are; a server render never runs
    // it. Which path a render takes is decided per render, from the
    // environment: a client render of a tree that was server-rendered
    // registers here, in the effect, like any other client render.
    if (serverRender) return;
    registerMark(id, registration(), () => create(data, transform.wrap(markOptions)), handlers);
  });
  // Removal is unmount-driven — <Plot> can't infer it, because bailed-out
  // children don't re-register.
  useLayoutEffect(() => () => unregisterMark(id), [unregisterMark, id]);
}

// Build a stable stamp from the mark name, data identity, and options. Option
// primitives (string/number/boolean) are included by value so e.g. a
// thresholds or field-name change forces a rebuild; arrays up to the element
// cap contribute their element values (recursively) so e.g. an explicit
// thresholds or domain array change forces a rebuild too. Plain objects
// contribute their entries (recursively, up to the depth and entry caps below,
// past which they fall back to shape only) so e.g. a sort or tip-format change
// forces a rebuild. Everything else is stamped by IDENTITY — functions, Map,
// Set, typed arrays, d3 scales and intervals, class instances, and arrays past
// the element cap — because nothing about their content can be read cheaply or
// soundly, and a value the stamp cannot see through is a value whose change
// never reaches the plot (#146, #149).
export function stampOptions(name: string, data: unknown, options: Record<string, unknown>): string {
  const dataKey = data == null ? "null" : typeof data === "object" ? "obj" : String(data);
  const shape = Object.keys(options)
    .sort()
    .map((k) => stampPair(k, options[k], 0))
    .join(",");
  return `${name}|${dataKey}|${shape}`;
}

// One `key:value` entry of an option object. A handler-named key whose value is
// a function stamps by PRESENCE only — "function", never identity — because an
// inline handler is a new function on every render of the caller while the
// handler the plot should call is read live off the registration at dispatch
// time; its identity is not allowed to recompute the plot. Every other value
// (function or not) is stamped as itself.
function stampPair(key: string, v: unknown, depth: number): string {
  const handler = typeof v === "function" && (markEventNames as readonly string[]).includes(key);
  return `${key}:${handler ? "function" : stampValue(v, depth)}`;
}

// Stamps run every render for every mark, so the walk is capped: past this
// depth, or for objects with more entries than the cap, the stamp degrades to
// shape only rather than walking arbitrarily large structures, and an array
// longer than the cap is not walked at all — a long array is data-like, and is
// tracked by identity exactly as `data` is.
const stampDepthCap = 3;
const stampEntryCap = 32;

function stampValue(v: unknown, depth = 0): string {
  return v == null
    ? "null"
    : Array.isArray(v)
    ? v.length > stampEntryCap
      ? stampIdentity(v)
      : `[${v.map((d) => stampValue(d, depth + 1)).join(",")}]`
    : typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    ? JSON.stringify(v)
    : v instanceof Date
    ? `date${+v}`
    : isPlainObject(v)
    ? stampObject(v, depth)
    : stampIdentity(v as object);
}

function stampObject(v: Record<string, unknown>, depth: number): string {
  const keys = Object.keys(v);
  if (depth >= stampDepthCap || keys.length > stampEntryCap) return "object";
  return `{${keys
    .sort()
    .map((k) => stampPair(k, v[k], depth + 1))
    .join(",")}}`;
}

// A value the stamp cannot read is stamped by IDENTITY instead: a sequence
// number per reference, stable for as long as the value is. Any reference-based
// stamping is safe in a render React then discards (transform wrappers stamp
// during render, unlike useMark, which stamps in an effect): a number is only
// ever compared for equality against the number the same reference produced, so
// numbering a value nobody kept changes no stamp. It is also the only sound
// option for these values — a d3 interval, a scale or a Map has no cheap,
// stable serialization, and neither does a closure over React state, whose
// captured values are not inspectable and whose source text is the same for
// `(d) => d.y * k` whatever k is. Probing a function by calling it is the
// tempting alternative and is not sound (one call cannot show two functions
// equal) nor safe (it would run a user's filter, tickFormat or render for
// whatever side effects it has). The cost is the mirror image: a NEW function
// every render recomputes the plot every render, so an accessor whose identity
// is stable — declared outside the component, or held with useCallback — is
// what keeps a render that changes nothing else free.
function stampIdentity(v: object): string {
  return `#${identityKey(v)}`;
}

// The identity sequence behind it. A WeakMap, so a value the plot has stopped
// using is not held alive by having been stamped once.
const identityKeys = new WeakMap<object, number>();
let identityKeySeq = 0;

function identityKey(value: object): number {
  const found = identityKeys.get(value);
  if (found !== undefined) return found;
  const next = ++identityKeySeq;
  identityKeys.set(value, next);
  return next;
}

// Only plain objects are walked by content. Everything else is a class instance
// of some kind — a d3 scale or interval, a Map, Set or typed array, a symbol
// factory — and goes to stampIdentity.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
