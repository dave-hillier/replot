# Replot: design notes

Replot ports [Observable Plot](https://observablehq.com/plot/) to React. These
notes record the decisions behind the port: what it keeps from Plot, how a plot
and its marks cooperate, and the rules to follow when adding a mark or a
transform. Usage is documented in the [README](./README.md) and under
[`docs/`](./docs); where these notes and the code disagree, the code is the
authority.

Two entry points share one implementation. `replot` is the imperative API,
ported from Plot with its surface intact, and `replot/react` is the component
API. Both run the same `computePlot` and the same marks.

## One renderer, two entry points

Marks render through `renderJSX`, which returns React elements; no
d3-selection rendering path is left in the codebase. `plot()` runs
`computePlot`, serialises the same element tree to markup and reparses it into
the document it was given, while `<Replot>` renders that tree into the React
root. The two APIs cannot drift in what they compute or in what they draw,
because there is one renderer and two ways to reach it.

The thin seam between them is the mark component. `<Dot>` and its siblings call
`useMark` and return `null`; the SVG comes from the mark's own `renderJSX`,
colocated with its channel definitions. A mark is written once, against the
plot's computed channels and scales, and is then available to both APIs.

## What the port keeps

These parts of Plot are pure computation with no DOM involvement, so the port
reuses them unchanged:

- **D3 scales** (d3-scale), used as pure functions
- **D3 shapes** (d3-shape, for line and area generators), returning path `d` strings
- **D3 geo projections**, pure coordinate transforms
- **Transform functions** (bin, stack, group and the rest), pure data transforms
- **Channel and scale inference**, and **dimension computation**

What changes is how the results reach the page: marks produce React elements
rather than building the DOM, and the arrangement of marks in a plot is
expressed by composing components rather than by an options object.

## Marks register, the plot computes

Plot's pipeline is sequential and interdependent: scales depend on every mark's
channels, and marks depend on the computed scales. React children cannot pass
data upward before they render, so Replot splits a render in two:

- **Registration.** Each mark component calls `useMark`, which registers a
  factory and a stamp with the enclosing `<Replot>`. The component renders
  nothing.
- **Computation and render.** A layout effect runs `computePlot` over the
  registered factories, stores the result in state and re-renders. Each mark
  then builds its elements from the computed channels, scales and dimensions.

Registering a factory, rather than a description of the mark's channels, keeps
the React layer ignorant of what a mark is made of: it hands the plot a way to
build one, not a schema to interpret. It is also what lets an enclosing
transform wrapper apply its rewrite inside the factory, at the point where the
mark is constructed for that run.

Scales and legends register the same way, which is why `<ScaleY>` and
`<Legend>` can be composed anywhere beneath the plot and still reach it.
`<Replot>` merges those registrations with its own props, and an explicit prop
wins on conflict.

## Transforms compose as wrapper components

Plot's transforms are its one genuinely compositional construct: each is a pure
function `(config, markOptions) => markOptions`, and nesting calls composes
them, as in `binX(outputs, stackY(options))`. The JSX analogue is nesting
wrapper components, so element structure mirrors call structure:

```tsx
// binX({y: "count"}, stackY({x: "v", fill: "sex"}))
<BinX y="count">
  <StackY>
    <RectY data={data} x="v" fill="sex" />
  </StackY>
</BinX>
```

The rule for what belongs where: things Plot expresses by **wrapping**
(transforms) nest as components, and things Plot expresses as **options**
(channels, styles) stay as props on the mark.

Both forms are supported and must render the same plot; the React transform
tests assert that by comparing the two renderings as equal strings. The
functional form remains available as an escape hatch, and for conditional
application, which is awkward in JSX.

### Mechanism

A `TransformContext` carries `{wrap, stamp}`, identity and empty by default.
Each wrapper composes with its parent context, delegating outward so inner
transforms apply first:

```tsx
export function StackY({children, ...config}: StackYProps) {
  const parent = useTransformContext();
  const value: TransformContextValue = {
    wrap: (o) => parent.wrap(stackY(config, o)),
    stamp: parent.stamp + stampOptions("stackY", null, config)
  };
  return <TransformContext.Provider value={value}>{children}</TransformContext.Provider>;
}
```

Marks fold `ctx.stamp` into their registration stamp and apply
`ctx.wrap(options)` **inside the mark factory**, never at component render
time. Transforms allocate lazy `column()` cells that `computePlot` fills per
run; factories are re-evaluated on each rebuild precisely so those columns are
fresh, and the wrap has to happen inside that re-evaluation.

Multiple marks under one wrapper each get the transform applied independently,
which is exactly equivalent to calling e.g. `stackY(options)` per mark in the
functional API.

### Wrapper props per transform

Every transform fits the `(config, options)` mould, so wrapper props map
mechanically onto the first argument:

| Wrapper | Props (first argument) |
|---|---|
| `BinX`/`BinY`/`Bin` | output reducers (`y="count"`) plus `thresholds`/`interval`/`domain`/`cumulative`; bin's own `mergeOptions` routes config keys |
| `GroupX`/`GroupY`/`GroupZ`/`Group` | output reducers |
| `StackY`/`StackX` (and the `1`/`2` variants) | `offset`/`order`/`reverse` |
| `WindowX`/`WindowY` | `k`/`reduce`/`anchor`/`strict` |
| `NormalizeX`/`NormalizeY` | `basis` |
| `MapX`/`MapY` | `map` |
| `ShiftX`/`ShiftY` | `interval` |
| `SelectFirst`/`SelectLast`/`SelectMinX`/`SelectMaxX`/... | none (the selector is in the name) |
| `DodgeX`/`DodgeY` (initializer) | `anchor`/`padding`/`r` |
| `Hexbin` (initializer) | output reducers plus `binWidth` |
| `Centroid`/`GeoCentroid` (initializer) | `geometry` |

Not componentised: `treeNode`/`treeLink`, which are already inside
`TreeMark`/`ClusterMark`, and `pointer*`, which are already `<Tip>` and
`<Crosshair>`. `sort`/`filter`/`reverse` work as plain mark props already, so
wrappers for them would be optional sugar. Bare `map`, `select`, `window` and
`filter` collide with JS and HTML names, so those stay function-only or take a
distinct name (`mapTransform`, `windowMap`).

### Constraints and known hazards

- **Ordering**: Plot forbids transforms after initializers, and nesting order
  maps directly onto call order, so wrong nesting fails with the same runtime
  error as wrong functional composition. Wrappers may pre-validate to give a
  clearer message.
- **Output versus input channels**: on a wrapper, `y="count"` is an output
  reducer; on the mark inside, `x="weight"` is an input channel. Typed props
  (reducer types on wrappers, channel types on marks) are the guard against
  putting a prop on the wrong element.
- **Invalidation**: wrapper config changes must flow through the mark stamp, so
  stamps have to include primitive *values* rather than just a key and a type,
  or a `thresholds` change will not trigger a rebuild. The `<Replot>` compute
  effect must also re-run when the registration version changes, not only when
  plot-level options change.
- **Equivalence**: the nested-wrapper and functional-spread forms must render
  the same plot, which the React transform tests check by comparing the two
  renderings as equal strings.

Transforms should never become hooks: `useBin(data, ...)` is the wrong
abstraction level, because the transform contract is an options rewrite, not a
data computation the component observes.

## Clip paths and defs

The `<clipPath>` defs have to exist before the elements that reference them, so
clipping is arranged before the SVG renders. `<Replot>` owns a clip registry
for each render and collects the defs into one `<defs>`; marks are wrapped or
annotated as they render. For `clip: "frame"` the mark is wrapped in an outer,
untransformed `<g>` that carries the aria attributes and the clip, leaving the
inner `<g>` free to be transformed; for a GeoJSON geometry the clip is applied
to the mark's own `<g>`, with spheres coalesced to a single clip. A GeoJSON clip
is rendered from the same path data a geo mark would produce, respecting the
plot's projection, and `clipPath` elements are shared between marks clipped
with the same object.

## When the plot recomputes

`<Replot>` recomputes only when something that feeds the computation changed,
and otherwise reuses the previous result. What decides that is the stamp: every
registration carries a string summarising the values that affect the output,
and the compute effect joins the mark stamps, the scale stamps, the plot's
options, the class name and the style into one inputs key, comparing it against
the previous key held in a ref. A mark re-rendering with the same stamp
refreshes the stored factory and its closures without rebuilding anything.

Numbers, strings and booleans are stamped by value, and arrays and plain
objects are walked into, up to a depth and entry cap beyond which only their
shape is compared, so a changed `thresholds` or domain array still forces a
rebuild. Functions are excluded from the stamp: event handlers and `onValue`
are read through refs at dispatch time, so a fresh closure identity has to be
able to update the handler without forcing a recompute. Data identity is the
deliberate exception, since array and object contents cannot be hashed cheaply:
a new data reference bumps a sequence number in the stamp, so its contents are
assumed to have changed.

The computation itself is deliberately not memoised. There is no `useMemo` in
the React layer and no `React.memo` on the components, because the inputs key
already answers the only question a cache would ask, and a cache in front of it
would be a second, weaker answer to the same question, making the invalidation
path harder to follow.
