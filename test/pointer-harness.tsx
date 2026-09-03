// Shared test harness for the pointer/tip interaction tests.
//
// This file is deliberately named OUTSIDE mocha's `test/**/*-test.*` glob: it is
// imported by the pointer test files, never run as a suite of its own.
//
// Why a harness at all: jsdom (as constructed by test/jsdom.js, without
// `pretendToBeVisual`) provides none of the four browser facilities the pointer
// code needs — there is no requestAnimationFrame, no PointerEvent constructor,
// no SVGSVGElement.createSVGPoint/getScreenCTM, and no SVGElement.getBBox. Each
// one is shimmed here from a single explicit model so that a test can state what
// the browser is doing (a page offset, a CSS scale, a font metric) instead of
// discovering it.

import {pointer as d3pointer} from "d3";
import {act, type ReactElement} from "react";
import ReactDOM from "react-dom/client";

// ---------------------------------------------------------------------------
// The animation-frame clock
// ---------------------------------------------------------------------------

export type FlushFrames = () => Promise<void>;

// The installed clock, so repeated installs within one test share one queue.
// jsdom.js deletes global.requestAnimationFrame after every test (it saved
// `undefined`), so the identity check below fails on the next test and a fresh
// queue is built — the clock cannot leak between tests.
let activeClock: {raf: unknown; flush: FlushFrames} | null = null;

/**
 * Installs a *queueing* requestAnimationFrame/cancelAnimationFrame pair on the
 * global object and returns a flush.
 *
 * Deliberately a queue rather than a synchronous shim (`fn => fn()`): the store
 * coalesces pointer moves into one frame and cancels the previous one, so a
 * synchronous shim would run work the real implementation would have discarded,
 * and the tests could never observe the coalescing at all.
 *
 * Each call to the returned flush runs exactly ONE generation of callbacks:
 * anything queued from inside a callback stays pending for the next flush, so a
 * component that re-arms a frame on every tick cannot spin here.
 */
export function installFrameClock(): FlushFrames {
  const g = globalThis as any;
  if (activeClock !== null && g.requestAnimationFrame === activeClock.raf) return activeClock.flush;

  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 0;

  const raf = (callback: FrameRequestCallback): number => {
    const id = ++nextId;
    pending.set(id, callback);
    return id;
  };
  const caf = (id: number): void => void pending.delete(id);

  const flush: FlushFrames = async () => {
    const due = Array.from(pending.values());
    pending.clear();
    // act() so that the setState a frame callback performs (via
    // useSyncExternalStore's listener) is committed before the test asserts.
    await act(async () => {
      const time = performance.now();
      for (const callback of due) callback(time);
    });
  };

  g.requestAnimationFrame = raf;
  g.cancelAnimationFrame = caf;
  // Keep window and global in step so code that qualifies the call still sees
  // the same queue. jsdom's window is recreated per test, so this cannot leak.
  if (g.window != null && g.window !== g) {
    try {
      g.window.requestAnimationFrame = raf;
      g.window.cancelAnimationFrame = caf;
    } catch {
      // Some jsdom builds make these read-only; the global pair is what the
      // implementation actually resolves, so this is not fatal.
    }
  }

  activeClock = {raf, flush};
  return flush;
}

// ---------------------------------------------------------------------------
// Geometry: getBoundingClientRect, createSVGPoint and getScreenCTM
// ---------------------------------------------------------------------------

export interface GeometryOptions {
  /** Client x of the svg's top-left corner. */
  left?: number;
  /** Client y of the svg's top-left corner. */
  top?: number;
  /** CSS scale: one user-space unit is this many client pixels. */
  scale?: number;
  /** User-space width; defaults to the svg's width attribute. */
  width?: number;
  /** User-space height; defaults to the svg's height attribute. */
  height?: number;
}

/** Converts an SVG user-space point to the client coordinates of an event. */
export type ToClient = (x: number, y: number) => {clientX: number; clientY: number};

/**
 * Shims the three geometry entry points on one svg element from a single
 * `{left, top, scale}` model, and returns the matching user-space → client
 * mapping.
 *
 * All three are derived from the same model on purpose. Hit testing that reads
 * `getBoundingClientRect` and hit testing that reads `getScreenCTM().inverse()`
 * agree exactly when `scale` is 1 and disagree exactly when it is not — which is
 * what lets a single test prove that the implementation works in user space
 * rather than in CSS pixels, without the test knowing which API it uses.
 */
export function shimGeometry(svg: any, {left = 0, top = 0, scale = 1, width, height}: GeometryOptions = {}): ToClient {
  const w = width ?? numberAttribute(svg, "width");
  const h = height ?? numberAttribute(svg, "height");
  const rect = {
    x: left,
    y: top,
    left,
    top,
    width: w * scale,
    height: h * scale,
    right: left + w * scale,
    bottom: top + h * scale
  };

  define(svg, "getBoundingClientRect", () => ({...rect, toJSON: () => rect}));
  // d3.pointer prefers createSVGPoint + getScreenCTM().inverse() and only falls
  // back to the rect when createSVGPoint is missing; jsdom defines neither.
  define(svg, "createSVGPoint", () => createPoint());
  define(svg, "getScreenCTM", () => createMatrix(scale, left, top));

  return (x, y) => ({clientX: left + x * scale, clientY: top + y * scale});
}

function numberAttribute(element: any, name: string): number {
  const value = Number(element?.getAttribute?.(name));
  return Number.isFinite(value) ? value : 0;
}

function define(target: any, name: string, value: unknown): void {
  Object.defineProperty(target, name, {value, writable: true, configurable: true});
}

// The minimum of SVGPoint that d3.pointer uses.
function createPoint(): any {
  return {
    x: 0,
    y: 0,
    matrixTransform(m: any) {
      return {x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f};
    }
  };
}

// The minimum of DOMMatrix that d3.pointer uses: the six affine components and
// a working inverse(). user → client is (x*scale + left, y*scale + top).
function createMatrix(scale: number, left: number, top: number): any {
  return {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    e: left,
    f: top,
    inverse: () => createMatrix(1 / scale, -left / scale, -top / scale)
  };
}

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------

export interface TextMetrics {
  /** Advance width of one character. */
  charWidth?: number;
  /** Baseline-to-baseline distance of one line. */
  lineHeight?: number;
}

/**
 * Defines SVGElement.prototype.getBBox as a monospace grid over an element's
 * DIRECT `<tspan>` children (upstream's tip emits exactly one tspan per line),
 * with the leading zero-width space stripped so it does not count as a glyph.
 * Returns a teardown that removes it again.
 *
 * This is opt-in per test and MUST NOT be installed globally in test/jsdom.js:
 * act() flushes layout effects synchronously, so a global stub would make every
 * tip in the snapshot suite take the *measured* path and diverge from upstream's
 * 30 committed unmeasured baselines.
 */
export function shimTextMeasurement(win: any, {charWidth = 6, lineHeight = 15}: TextMetrics = {}): () => void {
  const proto = win.SVGElement.prototype;
  const had = Object.prototype.hasOwnProperty.call(proto, "getBBox");
  const previous = proto.getBBox;

  proto.getBBox = function (this: any) {
    const lines = Array.from(this.childNodes as ArrayLike<any>)
      .filter(isTspan)
      .map((node: any) => stripZeroWidth(node.textContent ?? ""));
    const columns = lines.reduce((max: number, line: string) => Math.max(max, line.length), 0);
    return {x: 0, y: 0, width: columns * charWidth, height: lines.length * lineHeight};
  };

  return () => {
    if (had) proto.getBBox = previous;
    else delete proto.getBBox;
  };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface PointerEventOptions {
  clientX?: number;
  clientY?: number;
  buttons?: number;
  bubbles?: boolean;
  pointerType?: string;
  pointerId?: number;
}

/**
 * Builds a pointer event. jsdom 26 has NO PointerEvent constructor, so this is a
 * MouseEvent with `pointerType` and `pointerId` defined on the instance — the
 * pointer code bails out of down/leave unless `pointerType === "mouse"`, so the
 * property genuinely has to be there.
 */
export function pointerEvent(win: any, type: string, options: PointerEventOptions = {}): Event {
  const {clientX = 0, clientY = 0, buttons = 0, bubbles = true, pointerType = "mouse", pointerId = 1} = options;
  const event = new win.MouseEvent(type, {view: win, bubbles, cancelable: true, clientX, clientY, buttons});
  Object.defineProperty(event, "pointerType", {value: pointerType, configurable: true});
  Object.defineProperty(event, "pointerId", {value: pointerId, configurable: true});
  return event;
}

// ---------------------------------------------------------------------------
// Mounting
// ---------------------------------------------------------------------------

export interface PointerHarness {
  container: any;
  svg: any;
  /** Maps SVG user space to client coordinates under the current geometry. */
  toClient: ToClient;
  /** Runs one generation of queued animation frames inside act(). */
  flushFrames: FlushFrames;
  /** Re-shims the geometry (e.g. to introduce a CSS scale) and returns the new mapping. */
  setGeometry: (options: GeometryOptions) => ToClient;
  /** Renders another element into the same root, flushing the compute pass. */
  rerender: (element: ReactElement) => Promise<void>;
  cleanup: () => Promise<void>;
}

/**
 * Mounts a plot element into a fresh jsdom container and flushes the two-phase
 * render (mark registration → scale computation → mark rendering), matching
 * test/plot.js. Installs the frame clock first, because a mark may consult
 * requestAnimationFrame during its very first render.
 */
export async function mountPlot(
  element: ReactElement,
  {geometry}: {geometry?: GeometryOptions} = {}
): Promise<PointerHarness> {
  const flushFrames = installFrameClock();
  const document = (globalThis as any).document;
  const container = document.createElement("div");
  document.body.appendChild(container);

  let root: any;
  await act(async () => {
    root = ReactDOM.createRoot(container);
    root.render(element);
  });
  await act(async () => {});
  await act(async () => {});

  const svg = container.querySelector("svg");
  if (svg == null) throw new Error("mountPlot: the element did not render an <svg>");

  const harness: PointerHarness = {
    container,
    svg,
    flushFrames,
    toClient: shimGeometry(svg, geometry),
    setGeometry(options) {
      return (harness.toClient = shimGeometry(svg, options));
    },
    async rerender(next) {
      await act(async () => {
        root.render(next);
      });
      await act(async () => {});
    },
    async cleanup() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
  return harness;
}

// ---------------------------------------------------------------------------
// Gestures
// ---------------------------------------------------------------------------

/**
 * Dispatches a pointer move at an SVG USER-SPACE point and flushes the frame the
 * pointer code coalesces it into. Coordinates are user space, never client
 * pixels, so a test reads the same whatever geometry it mounted under.
 */
export async function hover(harness: PointerHarness, x: number, y: number, type = "pointermove"): Promise<void> {
  const win = harness.svg.ownerDocument.defaultView;
  await act(async () => {
    harness.svg.dispatchEvent(pointerEvent(win, type, harness.toClient(x, y)));
  });
  await harness.flushFrames();
}

/**
 * Dispatches a pointerdown — the sticky toggle. `target` defaults to the svg;
 * pass a rendered element (the tip's own `<path>`, say) to exercise the
 * click-inside-a-sticky-mark rule. The event bubbles, as a real one does.
 *
 * No frame is flushed: the toggle is synchronous upstream, and flushing here
 * would run a move frame the down should not have consumed.
 */
export async function click(
  harness: PointerHarness,
  {x = 0, y = 0, target = harness.svg}: {x?: number; y?: number; target?: any} = {}
): Promise<void> {
  const win = harness.svg.ownerDocument.defaultView;
  await act(async () => {
    target.dispatchEvent(pointerEvent(win, "pointerdown", {...harness.toClient(x, y), buttons: 1}));
  });
}

/** Dispatches a pointerleave on the svg. The pointer code cancels its own pending frame. */
export async function leave(harness: PointerHarness, {x = 0, y = 0}: {x?: number; y?: number} = {}): Promise<void> {
  const win = harness.svg.ownerDocument.defaultView;
  await act(async () => {
    harness.svg.dispatchEvent(pointerEvent(win, "pointerleave", harness.toClient(x, y)));
  });
}

// ---------------------------------------------------------------------------
// Reading the result
// ---------------------------------------------------------------------------

/** Every `g[aria-label="tip"]` in the plot, in document order. */
export function tipGroups(svg: any): any[] {
  return Array.from(svg.querySelectorAll('g[aria-label="tip"]'));
}

/**
 * The text lines of the *k*th tip, one string per `<tspan>` line, with the
 * leading zero-width space stripped. Empty when that tip is not showing.
 */
export function tipLines(svg: any, k = 0): string[] {
  const text = tipGroups(svg)[k]?.querySelector("text");
  if (text == null) return [];
  return Array.from(text.childNodes as ArrayLike<any>)
    .filter(isTspan)
    .map((node: any) => stripZeroWidth(node.textContent ?? ""));
}

/** The user-space point d3.pointer would report for a client point. */
export function svgPointOf(svg: any, event: Event): [number, number] {
  return d3pointer(event, svg) as [number, number];
}

function isTspan(node: any): boolean {
  return node?.nodeType === 1 && String(node.tagName).toLowerCase() === "tspan";
}

// Upstream prefixes every tip line with U+200B so an empty line still occupies
// its full height; it is not part of the label the test is asserting on.
function stripZeroWidth(text: string): string {
  return text.replace(/\u200b/g, "");
}
