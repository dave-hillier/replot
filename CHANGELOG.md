# Replot - Changelog

## Unreleased

The pointer transform now reports the focused datum the way Observable Plot does: the plot element (the `<figure>` when there is one, else the `<svg>`) carries the focused datum as its `value`, and a bubbling *input* event fires whenever that value changes. The **onValue** prop follows the same contract and is called once per value change, rather than once per pointer-driven mark.

A pointer selection now survives a re-render that rebuilds the mark's data array around the same rows, so a controlled plot whose state is driven by **onValue** keeps its tip. What survives a recompute is the pointer position rather than the index, so the tip follows the datum drawn under it — a reorder, a filter or a transform moves it with the data — and it is dropped, clearing the reported value with it, only when nothing is drawn under the pointer any more.

**Breaking:** `<Replot>` no longer attaches a React `onInput` handler to its `<svg>`, so a React `onInput` on a wrapper around the plot no longer fires; `element.addEventListener("input", …)` still receives the event, which is what Observable Plot dispatches.

**Breaking:** the pointer hook and the helpers that went with it are gone — **usePointer**, **findNearest**, the **PointerState** and **UsePointerOptions** types, and **formatTip** are no longer exported from `replot/react`. A pointer consumer is declared the way Observable Plot declares one: the **tip** option on a mark, or a **`<Tip>`** or **`<Crosshair>`** component, with the tooltip’s contents coming from the tip mark’s own **channels** and **format** options.

### Marks

`<AreaY line />` and `<AreaX line />` now draw an area’s topline: a stroke-only path over the fill, carrying the mark’s markers, as upstream’s **line** option does. The option was accepted and ignored, so a translucent area could not get a crisp edge without a second mark.

Custom marker functions now draw. A **marker** given as a function was accepted and then dropped, because the resolver only knew marker names. Marker defs are also scoped to the mark that draws them: two marks sharing a marker name and colour used to share one def, and since a def resolves **currentColor** against its own ancestors rather than against the path that references it, the second mark drew the first mark’s colours. Marker ids change shape accordingly, to **plot-marker-N**.

A mark’s channel-driven `<title>` is now a child of the element it describes rather than a sibling of it. Hovering a contour band showed the group’s first title, or none at all, and a frame title, the frame having no group, landed on the `<svg>` and described the whole plot. A titled dot no longer emits a wrapping `<g>`: the title goes on the circle, as upstream writes it.

The shared title, href and marker helpers now match upstream as well. A mark with a **tip** set omits its native `<title>`, so the two no longer compete on hover. An **href** channel is written on the wrapping `<a>` instead of on the shape inside it as well. The arrow, circle and tick markers carry `stroke-dasharray="none"`, so they no longer inherit a dashed line’s pattern.

`linearRegressionX` and `linearRegressionY` now carry their title on the confidence band as well as on the line, and `hexgrid` applies its channel styles, title and href to the grid path. A **rotate** channel with a zero value, and a zero-length vector, now emit their (identity) **rotate** and anchor **translate** as upstream writes them; replot tested the values for truthiness and silently omitted them.

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

`plot.scale("projection")` answers with the projection, applying and inverting as the other scales do. **hasX**, **hasY** and **hasXY** no longer throw when asked about an options object that was never given: a missing object reads as none of these channels.

### Packaging

**react** and **react-dom** are now required peers. `plot()` and `legend()` statically import `react-dom/server`, so importing the package at all needs both, and an optional peer only deferred the failure to runtime.

Two entry-point bugs are fixed, both of which broke the published package for consumers: `main`, `module` and the default export condition pointed at `src/index.js`, which does not exist, and the **jsdelivr**, **unpkg** and **umd** conditions pointed at `dist/plot.umd.min.js` while the bundle is built as `dist/replot.umd.min.js`. A pack-and-install smoke test now imports both entry points through a bundler, through TypeScript and from the UMD bundle, and runs as part of `yarn test`.

### Documentation

`plot()` is documented as static by design. It renders through `renderToStaticMarkup`, so it has no React root, no pointer listeners are attached, a **tip** or **crosshair** renders with nothing selected, and the returned element never carries a `.value` or dispatches a bubbling *input* event. Upstream Observable Plot is interactive here; in replot that belongs to the React API and its **onValue** prop.

The docs are React-only again: the imperative API sections, the `useRef` pane and the remaining imperative code fences are gone, along with the inherited Observable Plot changelogs and their images, the duplicated `.md` twins of every docs page, and the VitePress site config and theme. PLAN.md is cut to the design notes that are still current.

### Repository

Coverage now measures the TypeScript sources as well as the JavaScript ones, and the React layer is linted with the React hooks rules. The dead rollup config and its plugins are gone, agent scratch directories such as `.claude/worktrees/` are ignored, and the docs conversion script and VitePress leftovers that the MDX port orphaned have been removed. A `yarn parity` report canonicalises each committed snapshot against its Observable Plot counterpart and reports what still differs.
