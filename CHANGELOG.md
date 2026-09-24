# Replot - Changelog

## Unreleased

The pointer transform now reports the focused datum the way Observable Plot does: the plot element (the `<figure>` when there is one, else the `<svg>`) carries the focused datum as its `value`, and a bubbling *input* event fires whenever that value changes. The **onValue** prop follows the same contract and is called once per value change, rather than once per pointer-driven mark.

A pointer selection now survives a re-render that rebuilds the mark's data array around the same rows, so a controlled plot whose state is driven by **onValue** keeps its tip. What survives a recompute is the pointer position rather than the index, so the tip follows the datum drawn under it — a reorder, a filter or a transform moves it with the data — and it is dropped, clearing the reported value with it, only when nothing is drawn under the pointer any more.

**Breaking:** `<Replot>` no longer attaches a React `onInput` handler to its `<svg>`, so a React `onInput` on a wrapper around the plot no longer fires; `element.addEventListener("input", …)` still receives the event, which is what Observable Plot dispatches.

**Breaking:** the pointer hook and the helpers that went with it are gone — **usePointer**, **findNearest**, the **PointerState** and **UsePointerOptions** types, and **formatTip** are no longer exported from `replot/react`. A pointer consumer is declared the way Observable Plot declares one: the **tip** option on a mark, or a **`<Tip>`** or **`<Crosshair>`** component, with the tooltip’s contents coming from the tip mark’s own **channels** and **format** options.

### React integration

Plots now render on the server. `renderToString` returns the whole plot rather than an empty host: with no document available, marks, scales and legends register during render, and the plot computes the same tree the client would draw. A hydrating client redraws it, because on the client registration happens in an effect and the first render has nothing to draw yet.

An accessor that closes over React state now recomputes the plot. Function props were left out of the mark stamp on the assumption that the factory is re-evaluated on every run, which is only true when a run happens: changing `k` in `y={(d) => d.y * k}` left the dots and the axis where they were. Functions, and the other values a stamp cannot read by content — Map, Set, typed arrays, d3 scales and intervals, class instances, and arrays past the element cap — are now stamped by identity. The cost is that an inline accessor recomputes the plot on each render of its owner; give the accessor a stable identity, at module level or with `useCallback`, to avoid that.

`svg.scale` is the lookup function `plot()` exposes rather than the raw scales object, so `svg.scale("x")` answers with the scale instead of throwing. The plot’s className and style are set as React props instead of through the DOM, so a style key that is dropped is actually removed.

Per-datum event handlers now attach to the datum the element was drawn for. Coverage was decided by comparing the child count to the index length, which a `<defs>` child broke: a line with three points in two series matched the counts, and every datum was shifted by one, so the defs received datum 0.

A warning raised while a mark renders now belongs to the plot that raised it. The warning indicator drains the counter after the marks have rendered, where it used to drain before, which let a render-time warning leak into the next plot’s indicator.

### Marks

`<AreaY line />` and `<AreaX line />` now draw an area’s topline: a stroke-only path over the fill, carrying the mark’s markers, as upstream’s **line** option does. The option was accepted and ignored, so a translucent area could not get a crisp edge without a second mark.

Custom marker functions now draw. A **marker** given as a function was accepted and then dropped, because the resolver only knew marker names. Marker defs are also scoped to the mark that draws them: two marks sharing a marker name and colour used to share one def, and since a def resolves **currentColor** against its own ancestors rather than against the path that references it, the second mark drew the first mark’s colours. Marker ids change shape accordingly, to **plot-marker-N**.

A mark’s channel-driven `<title>` is now a child of the element it describes rather than a sibling of it. Hovering a contour band showed the group’s first title, or none at all, and a frame title, the frame having no group, landed on the `<svg>` and described the whole plot. A titled dot no longer emits a wrapping `<g>`: the title goes on the circle, as upstream writes it.

The shared title, href and marker helpers now match upstream as well. A mark with a **tip** set omits its native `<title>`, so the two no longer compete on hover. An **href** channel is written on the wrapping `<a>` instead of on the shape inside it as well. The arrow, circle and tick markers carry `stroke-dasharray="none"`, so they no longer inherit a dashed line’s pattern.

`linearRegressionX` and `linearRegressionY` now carry their title on the confidence band as well as on the line, and `hexgrid` applies its channel styles, title and href to the grid path. A **rotate** channel with a zero value, and a zero-length vector, now emit their (identity) **rotate** and anchor **translate** as upstream writes them; replot tested the values for truthiness and silently omitted them.

A faceted mark now announces itself once rather than once per facet. Its label, description, hidden state and transform move onto a single group per mark, as upstream writes them, so a screen reader hears the mark rather than the mark repeated for every facet.

### Dark mode

The **boxX**/**boxY** default fill and the **tree** link default stroke were fixed light-only greys, so they drew at the wrong contrast on a dark page. Both now answer the colour scheme with **light-dark()**, as upstream’s do.

### Tips

A **format** that returns null for one datum no longer throws as soon as that datum is hovered. Every datum is formatted first and the nulls dropped, and a tip whose items all format to null renders empty rather than hidden.

The tip box is no longer styled by the channels that feed it: those channels choose the tip’s contents, not its appearance, so a mark with a **fill** channel and **tip** set no longer colours its own tooltip background with the focused datum’s colour.

The box is measured where a layout engine exists. Each item renders once from an estimate and again from the text’s `getBBox`, which re-runs the fit: the box is oriented to stay inside the frame, the lines shift to the measured left edge, and a faceted tip is fitted to its own cell. The estimate remains what jsdom, the server and a static render see, so those outputs keep a stable box.

### Raster

The **colorSpace** option is now supported. Colours are parsed through a 1x1 canvas instead of **d3-color**, which cannot express a wide-gamut colour space, so syntax the CSS parser knows and d3-color does not, such as **oklch**, survives. The converter is cached on the mark, so a raster of one colour costs a single parse per render. Colour parsing previously ran per pixel on every render, and the image-rendering attribute was built as a hyphenated key, which React rejects on an SVG element and warns about on the console.

### Difference

The **render** option on a difference mark now composes onto the two areas only, as upstream composes it, rather than reaching the line as well; a difference mark with a render transform used to transform the wrong mark. The clip ids a difference mark allocates are stable across a React re-render instead of being rewritten on every pass.

### Scales and options

An aspect ratio that cannot be met because a domain is empty now warns, rather than falling back silently.

`plot.scale("projection")` answers with the projection, applying and inverting as the other scales do. **hasX**, **hasY** and **hasXY** no longer throw when asked about an options object that was never given: a missing object reads as none of these channels.

### Packaging

**react** and **react-dom** are now required peers. `plot()` and `legend()` statically import `react-dom/server`, so importing the package at all needs both, and an optional peer only deferred the failure to runtime.

Two entry-point bugs are fixed, both of which broke the published package for consumers: `main`, `module` and the default export condition pointed at `src/index.js`, which does not exist, and the **jsdelivr**, **unpkg** and **umd** conditions pointed at `dist/plot.umd.min.js` while the bundle is built as `dist/replot.umd.min.js`. A pack-and-install smoke test now imports both entry points through a bundler, through TypeScript and from the UMD bundle, and runs as part of `yarn test`.

The `replot/react` entry file is `src/react/api.tsx` rather than `src/react/index.tsx`. The published entry point is unchanged, so this affects only a deep import of the old path. **LegendProps** is now `LegendScales & {scale?: string}`: the **scale** prop was always read at runtime, and is now part of the type.

### Documentation

`plot()` is documented as static by design. It renders through `renderToStaticMarkup`, so it has no React root, no pointer listeners are attached, a **tip** or **crosshair** renders with nothing selected, and the returned element never carries a `.value` or dispatches a bubbling *input* event. Upstream Observable Plot is interactive here; in replot that belongs to the React API and its **onValue** prop.

Server rendering is now described as it works: `renderToString` returns the whole plot, and a hydrating client redraws it. The README’s claim of server-side rendering out of the box, and the same claim on the docs index and `what-is-plot`, overstated it.

The docs are React-only again: the imperative API sections, the `useRef` pane and the remaining imperative code fences are gone, along with the inherited Observable Plot changelogs and their images, the duplicated `.md` twins of every docs page, and the VitePress site config and theme. PLAN.md is cut to the design notes that are still current.

### Repository

Coverage now measures the TypeScript sources as well as the JavaScript ones, and the React layer is linted with the React hooks rules. The dead rollup config and its plugins are gone, agent scratch directories such as `.claude/worktrees/` are ignored, and the docs conversion script and VitePress leftovers that the MDX port orphaned have been removed. A `yarn parity` report canonicalises each committed snapshot against its Observable Plot counterpart and reports what still differs. The comparison now runs in CI against a pinned upstream checkout, and `parity-allow.json` records each plot’s expected divergence as a machine-checked signature rather than a bare plot name, so a listed plot that diverges further fails the build. `yarn parity --allow parity-allow.json --update` refreshes the signatures when a change legitimately moves them.
