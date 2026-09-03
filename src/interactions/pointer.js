import {pointer as pointof} from "d3";
import {composeRender} from "../mark.js";
import {isArray} from "../options.js";
import {applyFrameAnchor} from "../style.js";

const states = new WeakMap(); // ownerSVGElement → per-plot pointer state
const handledEvents = new WeakSet();

// Three pieces of upstream’s closure are lifted out as pure functions below so
// that the React entry point (src/react/interactions/pointerHitTest.ts) and the
// imperative closure in this file share one implementation and cannot drift.
// Upstream’s own closure calls them, so re-syncing this file against a future
// Observable Plot release stays a small diff.

// For faceting, we want to compute the local coordinates of each point, which
// means subtracting out the facet translation, if any. (It’s tempting to do this
// using the local coordinates in SVG, but that’s complicated by mark-specific
// transforms such as dx and dy.) Also, since band scales return the upper bound
// of the band, we have to offset by half the bandwidth.
export function pointerOffsets(index, scales, dimensions) {
  const {x, y, fx, fy} = scales;
  let tx = fx ? fx(index.fx) - dimensions.marginLeft : 0;
  let ty = fy ? fy(index.fy) - dimensions.marginTop : 0;
  if (x?.bandwidth) tx += x.bandwidth() / 2;
  if (y?.bandwidth) ty += y.bandwidth() / 2;
  return [tx, ty];
}

// The order of precedence for the pointer position is: px & py; the middle of x1
// & y1 and x2 & y2; or x1 & y1 (e.g., area); or lastly x & y. If a dimension is
// unspecified, the frame anchor is used.
export function pointerAnchors(mark, values, dimensions) {
  const [cx, cy] = applyFrameAnchor(mark, dimensions);
  const {px: PX, py: PY} = values;
  return [PX ? (i) => PX[i] : anchorX(values, cx), PY ? (i) => PY[i] : anchorY(values, cy)];
}

// Select the closest point to the mouse in the current facet; for pointerX or
// pointerY, the orthogonal component of the distance is squashed, selecting
// primarily on the dominant dimension. Across facets, use unsquashed distance to
// determine the winner.
//
// xp and yp must already be corrected for facets and band scales (see
// pointerOffsets), because the kpx/kpy margin test compares them against the
// dimensions’ margins in that same corrected space.
//
// A datum missing a coordinate yields undefined from px(j) or py(j), hence NaN
// for rj, and `NaN <= ri` is false — that is precisely how upstream excludes it.
// Never coerce with `?? 0`: that would place the datum at the origin and let it
// win the search.
export function pointerSearch(index, px, py, xp, yp, kx, ky, maxRadius, dimensions) {
  const kpx = xp < dimensions.marginLeft || xp > dimensions.width - dimensions.marginRight ? 1 : kx;
  const kpy = yp < dimensions.marginTop || yp > dimensions.height - dimensions.marginBottom ? 1 : ky;
  let ii = null;
  let ri = maxRadius * maxRadius;
  for (const j of index) {
    const dx = kpx * (px(j) - xp);
    const dy = kpy * (py(j) - yp);
    const rj = dx * dx + dy * dy;
    if (rj <= ri) (ii = j), (ri = rj);
  }
  if (ii != null && (kx !== 1 || ky !== 1)) {
    const dx = px(ii) - xp;
    const dy = py(ii) - yp;
    ri = dx * dx + dy * dy;
  }
  return {ii, ri};
}

function pointerK(kx, ky, {x, y, px, py, maxRadius = 40, channels, render, ...options} = {}) {
  maxRadius = +maxRadius;
  // When px or py is used, register an extra channel that the pointer
  // interaction can use to control which point is focused; this allows pointing
  // to function independently of where the downstream mark (e.g., a tip) is
  // displayed. Also default x or y to null to disable maybeTuple etc.
  if (px != null) (x ??= null), (channels = {...channels, px: {value: px, scale: "x"}});
  if (py != null) (y ??= null), (channels = {...channels, py: {value: py, scale: "y"}});
  const pointerResult = {
    x,
    y,
    channels,
    ...options,
    // Unlike other composed transforms, the render transform must be the
    // outermost render function because it will re-render dynamically in
    // response to pointer events.
    render: composeRender(function (index, scales, values, dimensions, context, next) {
      context = {...context, pointerSticky: false};
      const svg = context.ownerSVGElement;
      const {data} = context.getMarkState(this);

      // Isolate state per-pointer, per-plot; if the pointer is reused by
      // multiple marks, they will share the same state (e.g., sticky modality).
      // The pool maps renderIndex → {ii, ri, render} for marks competing for
      // the pointer (e.g., tips); only the closest point is shown.
      let state = states.get(svg);
      if (!state) {
        state = {sticky: false, roots: [], renders: [], pool: this.pool ? {map: new Map()} : null};
        states.set(svg, state);
      }

      // This serves as a unique identifier of the rendered mark per-plot; it is
      // used to record the currently-rendered elements (state.roots) so that we
      // can tell when a rendered element is clicked on.
      let renderIndex = state.renders.push(render) - 1;

      const [tx, ty] = pointerOffsets(index, scales, dimensions);

      // For faceting, we also need to record the closest point per facet per
      // mark (!), since each facet has its own pointer event listeners; we only
      // want the closest point across facets to be visible.
      const faceted = index.fi != null;
      let facetPool;
      if (faceted) {
        let facetPools = state.facetPools;
        if (!facetPools) state.facetPools = facetPools = new Map();
        facetPool = facetPools.get(this);
        if (!facetPool) facetPools.set(this, (facetPool = {map: new Map()}));
      }

      const [px, py] = pointerAnchors(this, values, dimensions);

      let i; // currently focused index
      let g; // currently rendered mark
      let s; // currently rendered stickiness

      // When pooling or faceting, if more than one pointer would be visible,
      // only show the closest. We defer rendering using an animation frame to
      // allow all pointer events to be received before deciding which mark to
      // render; although when hiding, we render immediately.
      const pool = state.pool ?? facetPool;
      function update(ii, ri) {
        if (!pool) return void render(ii);
        if (ii == null) render(ii);
        pool.map.set(renderIndex, {ii, ri, render});
        if (pool.frame !== undefined) cancelAnimationFrame(pool.frame);
        pool.frame = requestAnimationFrame(() => {
          pool.frame = undefined;
          let best = null;
          for (const c of pool.map.values()) if (!best || c.ri < best.ri) best = c;
          for (const c of pool.map.values()) c.render(c === best ? c.ii : null);
        });
      }

      function render(ii) {
        if (i === ii && s === state.sticky) return; // the tooltip hasn’t moved
        i = ii;
        s = context.pointerSticky = state.sticky;
        const I = i == null ? [] : [i];
        if (faceted) (I.fx = index.fx), (I.fy = index.fy), (I.fi = index.fi);
        const r = next(I, scales, values, dimensions, context);
        if (g) {
          // When faceting, preserve swapped mark and facet transforms; also
          // remove ARIA attributes since these are promoted to the parent. This
          // is perhaps brittle in that it depends on how Plot renders facets,
          // but it produces a cleaner and more accessible SVG structure.
          if (faceted) {
            const p = g.parentNode;
            const ft = g.getAttribute("transform");
            const mt = r.getAttribute("transform");
            ft ? r.setAttribute("transform", ft) : r.removeAttribute("transform");
            mt ? p.setAttribute("transform", mt) : p.removeAttribute("transform");
            r.removeAttribute("aria-label");
            r.removeAttribute("aria-description");
            r.removeAttribute("aria-hidden");
          }
          g.replaceWith(r);
        }
        state.roots[renderIndex] = g = r;

        // Dispatch the value. When simultaneously exiting this facet and
        // entering a new one, prioritize the entering facet.
        if (!(i == null && facetPool?.map.size > 1)) {
          const value = i == null ? null : isArray(data) ? data[i] : data.get(i);
          context.dispatchValue(value);
        }

        return r;
      }

      function pointermove(event) {
        if (state.sticky || (event.pointerType === "mouse" && event.buttons === 1)) return; // dragging
        let [xp, yp] = pointof(event);
        (xp -= tx), (yp -= ty); // correct for facets and band scales
        const {ii, ri} = pointerSearch(index, px, py, xp, yp, kx, ky, maxRadius, dimensions);
        update(ii, ri);
      }

      function pointerdown(event) {
        if (handledEvents.has(event)) return; // ignore same event on a shared pointer
        handledEvents.add(event);
        if (event.pointerType !== "mouse") return;
        if (i == null) return; // not pointing
        if (state.sticky && state.roots.some((r) => r?.contains(event.target))) return; // stay sticky
        if (state.sticky) (state.sticky = false), state.renders.forEach((r) => r(null)); // clear all pointers
        else (state.sticky = true), render(i);
      }

      function pointerleave(event) {
        if (event.pointerType !== "mouse") return;
        if (!state.sticky) update(null);
      }

      // We listen to the svg element; listening to the window instead would let
      // us receive pointer events from farther away, but would also make it
      // hard to know when to remove the listeners. (Using a mutation observer
      // to watch the entire document is likely too expensive.)
      svg.addEventListener("pointerenter", pointermove);
      svg.addEventListener("pointermove", pointermove);
      svg.addEventListener("pointerdown", pointerdown);
      svg.addEventListener("pointerleave", pointerleave);

      return render(null);
    }, render)
  };
  // Replot-only tags. The React entry point never executes the closure above —
  // it reimplements the interaction on top of the pure helpers — so these tags
  // are how it recovers the state that composeRender otherwise buries.
  if (typeof pointerResult.render === "function") {
    pointerResult.render.pointer = true;
    // kx/ky are pointerK parameters and maxRadius is destructured off the
    // options, so this is the only place the React hit test can reach them.
    pointerResult.render.pointerK = {kx, ky, maxRadius};
    // composeRender wraps the user’s own render option inside the (unreachable)
    // pointer closure; the React path supplies its own pointer behaviour and
    // then runs this one itself.
    pointerResult.render.userRender = render ?? null;
  }
  return pointerResult;
}

export function pointer(options) {
  return pointerK(1, 1, options);
}

export function pointerX(options) {
  return pointerK(1, 0.01, options);
}

export function pointerY(options) {
  return pointerK(0.01, 1, options);
}

export function anchorX({x1: X1, x2: X2, x: X = X1}, cx) {
  return X1 && X2 ? (i) => (X1[i] + X2[i]) / 2 : X ? (i) => X[i] : () => cx;
}

export function anchorY({y1: Y1, y2: Y2, y: Y = Y1}, cy) {
  return Y1 && Y2 ? (i) => (Y1[i] + Y2[i]) / 2 : Y ? (i) => Y[i] : () => cy;
}
