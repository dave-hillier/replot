# Replot - Changelog

## Unreleased

The pointer transform now reports the focused datum the way Observable Plot does: the plot element (the `<figure>` when there is one, else the `<svg>`) carries the focused datum as its `value`, and a bubbling *input* event fires whenever that value changes. The **onValue** prop follows the same contract and is called once per value change, rather than once per pointer-driven mark.

A pointer selection now survives a re-render that rebuilds the mark's data array around the same rows, so a controlled plot whose state is driven by **onValue** keeps its tip. What survives a recompute is the pointer position rather than the index, so the tip follows the datum drawn under it — a reorder, a filter or a transform moves it with the data — and it is dropped, clearing the reported value with it, only when nothing is drawn under the pointer any more.

**Breaking:** `<Replot>` no longer attaches a React `onInput` handler to its `<svg>`, so a React `onInput` on a wrapper around the plot no longer fires; `element.addEventListener("input", …)` still receives the event, which is what Observable Plot dispatches.

**Breaking:** the pointer hook and the helpers that went with it are gone — **usePointer**, **findNearest**, the **PointerState** and **UsePointerOptions** types, and **formatTip** are no longer exported from `replot/react`. A pointer consumer is declared the way Observable Plot declares one: the **tip** option on a mark, or a **`<Tip>`** or **`<Crosshair>`** component, with the tooltip’s contents coming from the tip mark’s own **channels** and **format** options.
