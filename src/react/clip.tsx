import {createElement as h, cloneElement, type ReactElement, type ReactNode} from "react";

// Clip support for the JSX render paths, replacing the imperative applyClip /
// getFrameClip / getGeoClip (d3-selection) in src/style.js. A registry is
// created per plot render; clip <clipPath> defs are collected into `defs`
// (rendered once in the <svg>) and marks are wrapped/annotated via wrap().
//
// - clip === "frame": the mark is wrapped in an outer, untransformed <g> that
//   carries the aria attributes and the clip-path (so the clip is unaffected
//   by the mark's own transform); the aria attributes are removed from the
//   inner mark <g>.
// - clip is a GeoJSON geometry: the clip-path is applied directly to the mark
//   <g> (all spheres are coalesced to a single clip).

export interface ClipRegistry {
  defs: ReactNode[];
  // Pre-registers a mark's clip (allocating its <clipPath> def + id) so the
  // defs are known before the <svg> renders them. Idempotent per dimensions/geo.
  register(mark: any, dims: any, context: any): void;
  // Wraps/annotates a rendered mark node with its clip-path, if any.
  wrap(node: ReactElement | null, mark: any, dims: any, context: any): ReactNode;
  // The next clip id for this render. A mark that emits its OWN <clipPath>
  // defs — the difference mark, whose clip geometries are the areas it is
  // differencing — must take its ids from here rather than from style.js's
  // module-global counter: that counter is not reset per render, so a fresh
  // process hands the mark the id this registry already gave the frame clip,
  // and two elements sharing an id make url(#…) resolve to whichever one the
  // document reaches first (the frame clip, for a difference plot) instead of
  // the mark's own. Allocating here is also what makes the ids stable across
  // re-renders: the registry is created per render and allocates in render
  // order, so a re-render of the same computed plot reproduces the same ids.
  clipId(): string;
}

// Pre-registers every mark's clip so the <clipPath> defs are populated before
// the <svg> renders them (the interactive path wraps marks during React's
// render, which is too late to feed the defs back up the tree).
export function registerClips(computed: any, clipReg: ClipRegistry): void {
  const {marks, facets, superdimensions, subdimensions, context} = computed;
  for (const mark of marks) {
    const dims = facets === undefined || mark.facet === "super" ? superdimensions : subdimensions;
    clipReg.register(mark, dims, context);
  }
}

const SPHERE = {type: "Sphere"};

// Creates the clip registry for ONE render of a plot. `context` is the plot's
// context (src/plot.ts's computePlot), which the registry exposes itself on:
// a mark's renderJSX is handed the context and nothing else, so it is the only
// channel a mark has back to the render building the <svg>, and a mark that
// emits its own <clipPath> defs needs the render's id counter (see clipId).
export function createClipRegistry(context?: any): ClipRegistry {
  const defs: ReactNode[] = [];
  let nextId = 0;
  const frameCache = new Map<any, string>();
  const geoCache = new Map<any, string>();

  function clipId(): string {
    return `plot-clip-${++nextId}`;
  }

  function frameClipUrl(dims: any): string {
    let url = frameCache.get(dims);
    if (url === undefined) {
      const id = clipId();
      const {width, height, marginLeft, marginRight, marginTop, marginBottom} = dims;
      defs.push(
        h(
          "clipPath",
          {key: id, id},
          h("rect", {
            x: marginLeft,
            y: marginTop,
            width: width - marginRight - marginLeft,
            height: height - marginTop - marginBottom
          })
        )
      );
      url = `url(#${id})`;
      frameCache.set(dims, url);
    }
    return url;
  }

  function geoClipUrl(geo: any, context: any): string {
    if (geo.type === "Sphere") geo = SPHERE; // coalesce all spheres
    let url = geoCache.get(geo);
    if (url === undefined) {
      const id = clipId();
      defs.push(h("clipPath", {key: id, id}, h("path", {d: context.path()(geo)})));
      url = `url(#${id})`;
      geoCache.set(geo, url);
    }
    return url;
  }

  function clipOf(mark: any, context: any): any {
    // maybeClip(false) stores null; only an undefined clip (never specified)
    // falls back to the plot-level default, matching upstream style.js.
    return mark.clip === undefined ? context?.clip : mark.clip;
  }

  const registry: ClipRegistry = {
    defs,
    clipId,
    register(mark, dims, context) {
      const clip = clipOf(mark, context);
      if (!clip) return;
      if (clip === "frame") frameClipUrl(dims);
      else geoClipUrl(clip, context);
    },
    wrap(node, mark, dims, context) {
      const clip = clipOf(mark, context);
      if (!clip || node == null) return node;
      if (clip === "frame") {
        const props: Record<string, any> = {clipPath: frameClipUrl(dims)};
        if (mark.ariaLabel != null) props["aria-label"] = mark.ariaLabel;
        if (mark.ariaDescription != null) props["aria-description"] = mark.ariaDescription;
        if (mark.ariaHidden != null) props["aria-hidden"] = mark.ariaHidden;
        // The aria attributes move to the outer wrapper; strip them from the
        // inner mark <g> to match the imperative applyClip output.
        const inner = cloneElement(node, {
          "aria-label": undefined,
          "aria-description": undefined,
          "aria-hidden": undefined
        } as any);
        return h("g", props, inner);
      }
      // Geo clip: apply clip-path directly to the mark <g>.
      return cloneElement(node, {clipPath: geoClipUrl(clip, context)} as any);
    }
  };
  if (context != null) context.clipRegistry = registry;
  return registry;
}
